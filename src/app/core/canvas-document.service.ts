import { inject, Injectable } from '@angular/core';
import {
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CANVAS_WIDTH,
  MAX_CANVAS_SIZE,
  MIN_CANVAS_SIZE,
  ToolId,
  TRANSPARENT_COLOR,
} from '../models/tool.model';
import { renderShapeToCanvas } from '../tools/shape-renderer';
import { bakeTextToCanvas } from '../tools/text-renderer';
import { EditorStateService } from './editor-state.service';
import { DEFAULT_FILE_NAME, extractFileBaseName, normalizePngFileName } from './file-name';

function clampCanvasSize(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(MIN_CANVAS_SIZE, Math.min(MAX_CANVAS_SIZE, Math.round(value)));
}

@Injectable({
  providedIn: 'root',
})
export class CanvasDocumentService {
  private readonly editorState = inject(EditorStateService);
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  attachCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    this.newDocument(DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT);
  }

  getContext(): CanvasRenderingContext2D | null {
    return this.ctx;
  }

  selectTool(toolId: ToolId): void {
    if (this.editorState.activeTool() === toolId) {
      return;
    }
    if (
      this.editorState.activeTextDraft() !== null ||
      this.editorState.activeShapeDraft() !== null
    ) {
      this.commitActiveEdit();
    }
    this.editorState.textSelectionPreview.set(null);
    this.editorState.shapeSelectionPreview.set(null);
    this.editorState.linePreview.set(null);
    this.editorState.activeTool.set(toolId);
  }

  commitActiveEdit(): void {
    const textDraft = this.editorState.activeTextDraft();
    if (textDraft) {
      if (this.ctx) {
        bakeTextToCanvas(this.ctx, textDraft);
      }
      if (textDraft.text.length > 0) {
        this.editorState.markDirty();
      }
      this.editorState.clearTextDraft();
    }

    const shapeDraft = this.editorState.activeShapeDraft();
    if (shapeDraft) {
      if (this.ctx) {
        renderShapeToCanvas(this.ctx, shapeDraft);
      }
      this.editorState.markDirty();
      this.editorState.clearShapeDraft();
    }
  }

  hasUnsavedWork(): boolean {
    return (
      this.editorState.hasUnsavedChanges() ||
      (this.editorState.activeTextDraft()?.text.length ?? 0) > 0 ||
      this.editorState.activeShapeDraft() !== null
    );
  }

  cancelActiveEdit(): void {
    this.editorState.textSelectionPreview.set(null);
    this.editorState.shapeSelectionPreview.set(null);
    this.editorState.linePreview.set(null);
    this.editorState.clearTextDraft();
    this.editorState.clearShapeDraft();
  }

  newDocument(
    width: number = DEFAULT_CANVAS_WIDTH,
    height: number = DEFAULT_CANVAS_HEIGHT,
    fillColor: string = TRANSPARENT_COLOR,
  ): void {
    const safeWidth = clampCanvasSize(width, DEFAULT_CANVAS_WIDTH);
    const safeHeight = clampCanvasSize(height, DEFAULT_CANVAS_HEIGHT);

    this.cancelActiveEdit();
    this.editorState.cursorPos.set(null);

    if (this.canvas) {
      this.canvas.width = safeWidth;
      this.canvas.height = safeHeight;
    }
    if (this.ctx) {
      this.ctx.clearRect(0, 0, safeWidth, safeHeight);
      if (fillColor && fillColor.toLowerCase() !== TRANSPARENT_COLOR) {
        this.ctx.save();
        this.ctx.fillStyle = fillColor;
        this.ctx.fillRect(0, 0, safeWidth, safeHeight);
        this.ctx.restore();
      }
    }
    this.editorState.canvasWidth.set(safeWidth);
    this.editorState.canvasHeight.set(safeHeight);
    this.editorState.fileName.set('untitled.png');
    this.editorState.clearDirty();
  }

  async openImageFile(file: File): Promise<void> {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Unable to load image "${file.name}"`));
        image.src = url;
      });

      const width = img.naturalWidth;
      const height = img.naturalHeight;
      if (width <= 0 || height <= 0) {
        throw new Error(`Image "${file.name}" has invalid dimensions`);
      }

      this.cancelActiveEdit();
      if (this.canvas) {
        this.canvas.width = width;
        this.canvas.height = height;
      }
      if (this.ctx) {
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.drawImage(img, 0, 0);
      }

      this.editorState.canvasWidth.set(width);
      this.editorState.canvasHeight.set(height);
      this.editorState.fileName.set(file.name || 'image.png');
      this.editorState.clearDirty();
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  saveImage(fileName?: string): void {
    this.commitActiveEdit();
    if (!this.canvas) {
      return;
    }

    const downloadName =
      fileName !== undefined
        ? (normalizePngFileName(fileName) ?? DEFAULT_FILE_NAME)
        : (normalizePngFileName(extractFileBaseName(this.editorState.fileName())) ??
          DEFAULT_FILE_NAME);

    this.editorState.fileName.set(downloadName);
    this.editorState.clearDirty();

    this.canvas.toBlob((blob) => {
      if (!blob) {
        return;
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = downloadName;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  }
}
