import { Point, Rect, TextDraft, ToolDefinition } from '../models/tool.model';

export interface ToolContext {
  readonly ctx: CanvasRenderingContext2D;
  readonly width: number;
  readonly height: number;
  readonly color: string;
  getTextDraft(): TextDraft | null;
  setTextDraft(draft: TextDraft | null): void;
  commitTextDraft(): void;
  setTextSelectionPreview(rect: Rect | null): void;
}

export interface DrawingTool {
  readonly definition: ToolDefinition;
  onPointerDown(point: Point, toolCtx: ToolContext): void;
  onPointerMove(point: Point, toolCtx: ToolContext): void;
  onPointerUp(point: Point, toolCtx: ToolContext): void;
  onDeactivate?(toolCtx: ToolContext): void;
}
