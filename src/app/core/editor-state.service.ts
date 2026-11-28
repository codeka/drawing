import { computed, Injectable, signal } from '@angular/core';
import {
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_ERASER_SIZE,
  DEFAULT_LINE_END_CAP,
  DEFAULT_LINE_START_CAP,
  DEFAULT_LINE_WIDTH,
  DEFAULT_PENCIL_SIZE,
  DEFAULT_SHAPE_FILL_COLOR,
  DEFAULT_SHAPE_OUTLINE_COLOR,
  DEFAULT_SHAPE_OUTLINE_WIDTH,
  DEFAULT_SHAPE_TYPE,
  DEFAULT_TEXT_FONT_FAMILY,
  DEFAULT_TEXT_FONT_SIZE,
  getToolDefinition,
  LineCap,
  LineCapSlot,
  LineDraft,
  MAX_BRUSH_SIZE,
  MAX_TEXT_FONT_SIZE,
  MIN_BRUSH_SIZE,
  MIN_TEXT_FONT_SIZE,
  Point,
  Rect,
  ShapeColorSlot,
  ShapeDraft,
  ShapeType,
  TextDraft,
  ToolId,
} from '../models/tool.model';

function clampBrushSize(value: number): number | null {
  if (!Number.isFinite(value)) {
    return null;
  }
  return Math.max(MIN_BRUSH_SIZE, Math.min(MAX_BRUSH_SIZE, Math.round(value)));
}

function clampTextFontSize(value: number): number | null {
  if (!Number.isFinite(value)) {
    return null;
  }
  return Math.max(MIN_TEXT_FONT_SIZE, Math.min(MAX_TEXT_FONT_SIZE, Math.round(value)));
}

@Injectable({
  providedIn: 'root',
})
export class EditorStateService {
  readonly activeTool = signal<ToolId>('pencil');
  readonly foregroundColor = signal<string>('#000000');
  readonly pencilSize = signal<number>(DEFAULT_PENCIL_SIZE);
  readonly eraserSize = signal<number>(DEFAULT_ERASER_SIZE);
  readonly lineWidth = signal<number>(DEFAULT_LINE_WIDTH);
  readonly lineStartCap = signal<LineCap>(DEFAULT_LINE_START_CAP);
  readonly lineEndCap = signal<LineCap>(DEFAULT_LINE_END_CAP);
  readonly activeLineCapSlot = signal<LineCapSlot>('end');
  readonly linePreview = signal<LineDraft | null>(null);
  readonly shapeType = signal<ShapeType>(DEFAULT_SHAPE_TYPE);
  readonly shapeOutlineWidth = signal<number>(DEFAULT_SHAPE_OUTLINE_WIDTH);
  readonly shapeOutlineColor = signal<string>(DEFAULT_SHAPE_OUTLINE_COLOR);
  readonly shapeFillColor = signal<string>(DEFAULT_SHAPE_FILL_COLOR);
  readonly shapeInstant = signal<boolean>(false);
  readonly activeShapeColorSlot = signal<ShapeColorSlot>('outline');
  readonly activeShapeDraft = signal<ShapeDraft | null>(null);
  readonly shapeSelectionPreview = signal<Rect | null>(null);
  readonly textFontFamily = signal<string>(DEFAULT_TEXT_FONT_FAMILY);
  readonly textFontSize = signal<number>(DEFAULT_TEXT_FONT_SIZE);
  readonly textBold = signal<boolean>(false);
  readonly textItalic = signal<boolean>(false);
  readonly textUnderline = signal<boolean>(false);
  readonly canvasWidth = signal<number>(DEFAULT_CANVAS_WIDTH);
  readonly canvasHeight = signal<number>(DEFAULT_CANVAS_HEIGHT);
  readonly fileName = signal<string>('untitled.png');
  readonly hasUnsavedChanges = signal<boolean>(false);
  readonly cursorPos = signal<Point | null>(null);
  readonly activeTextDraft = signal<TextDraft | null>(null);
  readonly textSelectionPreview = signal<Rect | null>(null);

  readonly activeToolDef = computed(() => getToolDefinition(this.activeTool()));
  readonly activeLineCap = computed(() =>
    this.activeLineCapSlot() === 'start' ? this.lineStartCap() : this.lineEndCap(),
  );
  readonly activeShapeColor = computed(() =>
    this.activeShapeColorSlot() === 'outline' ? this.shapeOutlineColor() : this.shapeFillColor(),
  );

  setPencilSize(size: number): void {
    const clamped = clampBrushSize(size);
    if (clamped !== null) {
      this.pencilSize.set(clamped);
    }
  }

  setEraserSize(size: number): void {
    const clamped = clampBrushSize(size);
    if (clamped !== null) {
      this.eraserSize.set(clamped);
    }
  }

  setLineWidth(width: number): void {
    const clamped = clampBrushSize(width);
    if (clamped !== null) {
      this.lineWidth.set(clamped);
    }
  }

  setLineStartCap(startCap: LineCap): void {
    this.lineStartCap.set(startCap);
  }

  setLineEndCap(endCap: LineCap): void {
    this.lineEndCap.set(endCap);
  }

  setActiveLineCapSlot(slot: LineCapSlot): void {
    this.activeLineCapSlot.set(slot);
  }

  setActiveLineCap(cap: LineCap): void {
    if (this.activeLineCapSlot() === 'start') {
      this.setLineStartCap(cap);
    } else {
      this.setLineEndCap(cap);
    }
  }

  setShapeType(shapeType: ShapeType): void {
    this.shapeType.set(shapeType);
    this.updateShapeDraft({ shapeType });
  }

  setShapeOutlineWidth(width: number): void {
    const clamped = clampBrushSize(width);
    if (clamped === null) {
      return;
    }
    this.shapeOutlineWidth.set(clamped);
    this.updateShapeDraft({ outlineWidth: clamped });
  }

  setShapeOutlineColor(color: string): void {
    this.shapeOutlineColor.set(color);
    this.updateShapeDraft({ outlineColor: color });
  }

  setShapeFillColor(color: string): void {
    this.shapeFillColor.set(color);
    this.updateShapeDraft({ fillColor: color });
  }

  setShapeInstant(instant: boolean): void {
    this.shapeInstant.set(instant);
  }

  setActiveShapeColorSlot(slot: ShapeColorSlot): void {
    this.activeShapeColorSlot.set(slot);
  }

  setActiveShapeColor(color: string): void {
    if (this.activeShapeColorSlot() === 'outline') {
      this.setShapeOutlineColor(color);
    } else {
      this.setShapeFillColor(color);
    }
  }

  updateShapeDraft(patch: Partial<ShapeDraft>): void {
    const draft = this.activeShapeDraft();
    if (draft) {
      this.activeShapeDraft.set({ ...draft, ...patch });
    }
  }

  clearShapeDraft(): void {
    this.activeShapeDraft.set(null);
  }

  setTextFontFamily(fontFamily: string): void {
    const trimmed = fontFamily.trim();
    if (!trimmed) {
      return;
    }
    this.textFontFamily.set(trimmed);
    this.updateTextDraft({ fontFamily: trimmed });
  }

  setTextFontSize(size: number): void {
    const clamped = clampTextFontSize(size);
    if (clamped === null) {
      return;
    }
    this.textFontSize.set(clamped);
    this.updateTextDraft({ fontSize: clamped });
  }

  setTextBold(bold: boolean): void {
    this.textBold.set(bold);
    this.updateTextDraft({ bold });
  }

  toggleTextBold(): void {
    this.setTextBold(!this.textBold());
  }

  setTextItalic(italic: boolean): void {
    this.textItalic.set(italic);
    this.updateTextDraft({ italic });
  }

  toggleTextItalic(): void {
    this.setTextItalic(!this.textItalic());
  }

  setTextUnderline(underline: boolean): void {
    this.textUnderline.set(underline);
    this.updateTextDraft({ underline });
  }

  toggleTextUnderline(): void {
    this.setTextUnderline(!this.textUnderline());
  }

  setForegroundColor(color: string): void {
    this.foregroundColor.set(color);
    const draft = this.activeTextDraft();
    if (draft) {
      this.activeTextDraft.set({ ...draft, color });
    }
  }

  updateTextDraft(patch: Partial<TextDraft>): void {
    const draft = this.activeTextDraft();
    if (draft) {
      this.activeTextDraft.set({ ...draft, ...patch });
    }
  }

  clearTextDraft(): void {
    this.activeTextDraft.set(null);
  }

  markDirty(): void {
    this.hasUnsavedChanges.set(true);
  }

  clearDirty(): void {
    this.hasUnsavedChanges.set(false);
  }
}
