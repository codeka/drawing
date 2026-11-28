import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  untracked,
  viewChild,
} from '@angular/core';
import { CanvasDocumentService } from '../../core/canvas-document.service';
import { EditorStateService } from '../../core/editor-state.service';
import { Point, TextStyleOption, ToolId } from '../../models/tool.model';
import { ToolContext } from '../../tools/drawing-tool';
import { renderLineToCanvas } from '../../tools/line-renderer';
import { renderShapeToCanvas } from '../../tools/shape-renderer';
import { createToolMap } from '../../tools/tool-registry';
import { ShapeOverlay } from '../shape-overlay/shape-overlay';
import { TextOverlay } from '../text-overlay/text-overlay';

@Component({
  selector: 'app-drawing-canvas',
  imports: [TextOverlay, ShapeOverlay],
  templateUrl: './drawing-canvas.html',
  styleUrl: './drawing-canvas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawingCanvas {
  readonly editorState = inject(EditorStateService);
  readonly canvasDoc = inject(CanvasDocumentService);

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('drawCanvas');
  private readonly previewCanvasRef =
    viewChild.required<ElementRef<HTMLCanvasElement>>('previewCanvas');
  private readonly tools = createToolMap();
  private activePointerId: number | null = null;
  private previousTool: ToolId | null = null;

  readonly brushPreview = computed(() => {
    const tool = this.editorState.activeTool();
    const pos = this.editorState.cursorPos();
    if (!pos || (tool !== 'pencil' && tool !== 'eraser')) {
      return null;
    }
    const size =
      tool === 'pencil' ? this.editorState.pencilSize() : this.editorState.eraserSize();
    const half = Math.floor(size / 2);
    return {
      left: pos.x - half,
      top: pos.y - half,
      size,
    };
  });

  constructor() {
    afterNextRender(() => {
      this.canvasDoc.attachCanvas(this.canvasRef().nativeElement);
    });

    effect(() => {
      const nextTool = this.editorState.activeTool();
      if (this.previousTool !== null && this.previousTool !== nextTool) {
        const prevTool = this.previousTool;
        untracked(() => {
          this.activePointerId = null;
          const ctx = this.canvasDoc.getContext();
          if (ctx) {
            this.tools[prevTool].onDeactivate?.(this.buildToolContext(ctx));
          }
        });
      }
      this.previousTool = nextTool;
    });

    effect(() => {
      const width = this.editorState.canvasWidth();
      const height = this.editorState.canvasHeight();
      const line = this.editorState.linePreview();
      const shapeDraft = this.editorState.activeShapeDraft();
      const shapePreview = this.editorState.shapeSelectionPreview();

      const previewCanvas = this.previewCanvasRef().nativeElement;
      if (previewCanvas.width !== width) {
        previewCanvas.width = width;
      }
      if (previewCanvas.height !== height) {
        previewCanvas.height = height;
      }

      const pCtx = previewCanvas.getContext('2d');
      if (!pCtx) {
        return;
      }
      pCtx.clearRect(0, 0, width, height);

      if (line) {
        renderLineToCanvas(pCtx, line);
      } else if (shapeDraft) {
        renderShapeToCanvas(pCtx, shapeDraft);
      } else if (shapePreview && shapePreview.width > 0 && shapePreview.height > 0) {
        renderShapeToCanvas(pCtx, {
          rect: shapePreview,
          shapeType: this.editorState.shapeType(),
          outlineWidth: this.editorState.shapeOutlineWidth(),
          outlineColor: this.editorState.shapeOutlineColor(),
          fillColor: this.editorState.shapeFillColor(),
        });
      }
    });
  }

  onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }

    const canvas = this.canvasRef().nativeElement;
    const ctx = this.canvasDoc.getContext();
    if (!ctx) {
      return;
    }

    this.activePointerId = event.pointerId;
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // Ignore environments without pointer capture support.
    }

    const point = this.toCanvasPoint(event, canvas);
    this.updateCursor(point);
    this.tools[this.editorState.activeTool()].onPointerDown(
      point,
      this.buildToolContext(ctx, event.shiftKey),
    );
  }

  onPointerMove(event: PointerEvent): void {
    const canvas = this.canvasRef().nativeElement;
    const point = this.toCanvasPoint(event, canvas);
    this.updateCursor(point);

    if (this.activePointerId !== event.pointerId) {
      return;
    }

    const ctx = this.canvasDoc.getContext();
    if (!ctx) {
      return;
    }

    this.tools[this.editorState.activeTool()].onPointerMove(
      point,
      this.buildToolContext(ctx, event.shiftKey),
    );
  }

  onPointerUp(event: PointerEvent): void {
    if (this.activePointerId !== event.pointerId) {
      return;
    }

    const canvas = this.canvasRef().nativeElement;
    try {
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Ignore environments without pointer capture support.
    }

    this.activePointerId = null;
    const ctx = this.canvasDoc.getContext();
    if (!ctx) {
      return;
    }

    const point = this.toCanvasPoint(event, canvas);
    this.tools[this.editorState.activeTool()].onPointerUp(
      point,
      this.buildToolContext(ctx, event.shiftKey),
    );
  }

  onPointerLeave(): void {
    if (this.activePointerId === null) {
      this.editorState.cursorPos.set(null);
    }
  }

  onToggleTextStyle(style: TextStyleOption): void {
    switch (style) {
      case 'bold':
        this.editorState.toggleTextBold();
        break;
      case 'italic':
        this.editorState.toggleTextItalic();
        break;
      case 'underline':
        this.editorState.toggleTextUnderline();
        break;
    }
  }

  private toCanvasPoint(event: PointerEvent, canvas: HTMLCanvasElement): Point {
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  private updateCursor(point: Point): void {
    const x = Math.floor(point.x);
    const y = Math.floor(point.y);
    const width = this.editorState.canvasWidth();
    const height = this.editorState.canvasHeight();

    if (x >= 0 && x < width && y >= 0 && y < height) {
      this.editorState.cursorPos.set({ x, y });
    } else if (this.activePointerId === null) {
      this.editorState.cursorPos.set(null);
    }
  }

  private buildToolContext(ctx: CanvasRenderingContext2D, shiftKey = false): ToolContext {
    return {
      ctx,
      width: this.editorState.canvasWidth(),
      height: this.editorState.canvasHeight(),
      color: this.editorState.foregroundColor(),
      pencilSize: this.editorState.pencilSize(),
      eraserSize: this.editorState.eraserSize(),
      lineWidth: this.editorState.lineWidth(),
      lineStartCap: this.editorState.lineStartCap(),
      lineEndCap: this.editorState.lineEndCap(),
      shapeType: this.editorState.shapeType(),
      shapeOutlineWidth: this.editorState.shapeOutlineWidth(),
      shapeOutlineColor: this.editorState.shapeOutlineColor(),
      shapeFillColor: this.editorState.shapeFillColor(),
      shapeInstant: this.editorState.shapeInstant(),
      shiftKey,
      textFontFamily: this.editorState.textFontFamily(),
      textFontSize: this.editorState.textFontSize(),
      textBold: this.editorState.textBold(),
      textItalic: this.editorState.textItalic(),
      textUnderline: this.editorState.textUnderline(),
      getTextDraft: () => this.editorState.activeTextDraft(),
      setTextDraft: (draft) => this.editorState.activeTextDraft.set(draft),
      commitTextDraft: () => this.canvasDoc.commitActiveEdit(),
      setTextSelectionPreview: (rect) => this.editorState.textSelectionPreview.set(rect),
      getShapeDraft: () => this.editorState.activeShapeDraft(),
      setShapeDraft: (draft) => this.editorState.activeShapeDraft.set(draft),
      commitShapeDraft: () => this.canvasDoc.commitActiveEdit(),
      setShapeSelectionPreview: (rect) => this.editorState.shapeSelectionPreview.set(rect),
      setLinePreview: (line) => this.editorState.linePreview.set(line),
      markDirty: () => this.editorState.markDirty(),
    };
  }
}
