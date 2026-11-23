import { computed, Injectable, signal } from '@angular/core';
import {
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_ERASER_SIZE,
  DEFAULT_PENCIL_SIZE,
  getToolDefinition,
  MAX_BRUSH_SIZE,
  MIN_BRUSH_SIZE,
  Point,
  Rect,
  TextDraft,
  ToolId,
} from '../models/tool.model';

function clampBrushSize(value: number): number | null {
  if (!Number.isFinite(value)) {
    return null;
  }
  return Math.max(MIN_BRUSH_SIZE, Math.min(MAX_BRUSH_SIZE, Math.round(value)));
}

@Injectable({
  providedIn: 'root',
})
export class EditorStateService {
  readonly activeTool = signal<ToolId>('pencil');
  readonly foregroundColor = signal<string>('#000000');
  readonly pencilSize = signal<number>(DEFAULT_PENCIL_SIZE);
  readonly eraserSize = signal<number>(DEFAULT_ERASER_SIZE);
  readonly canvasWidth = signal<number>(DEFAULT_CANVAS_WIDTH);
  readonly canvasHeight = signal<number>(DEFAULT_CANVAS_HEIGHT);
  readonly fileName = signal<string>('untitled.png');
  readonly cursorPos = signal<Point | null>(null);
  readonly activeTextDraft = signal<TextDraft | null>(null);
  readonly textSelectionPreview = signal<Rect | null>(null);

  readonly activeToolDef = computed(() => getToolDefinition(this.activeTool()));

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
}
