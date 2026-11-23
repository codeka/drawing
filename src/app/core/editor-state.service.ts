import { computed, Injectable, signal } from '@angular/core';
import {
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CANVAS_WIDTH,
  getToolDefinition,
  Point,
  Rect,
  TextDraft,
  ToolId,
} from '../models/tool.model';

@Injectable({
  providedIn: 'root',
})
export class EditorStateService {
  readonly activeTool = signal<ToolId>('pencil');
  readonly foregroundColor = signal<string>('#000000');
  readonly canvasWidth = signal<number>(DEFAULT_CANVAS_WIDTH);
  readonly canvasHeight = signal<number>(DEFAULT_CANVAS_HEIGHT);
  readonly fileName = signal<string>('untitled.png');
  readonly cursorPos = signal<Point | null>(null);
  readonly activeTextDraft = signal<TextDraft | null>(null);
  readonly textSelectionPreview = signal<Rect | null>(null);

  readonly activeToolDef = computed(() => getToolDefinition(this.activeTool()));

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
