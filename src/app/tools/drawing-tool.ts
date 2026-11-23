import {
  LineCap,
  LineDraft,
  Point,
  Rect,
  ShapeDraft,
  ShapeType,
  TextDraft,
  ToolDefinition,
} from '../models/tool.model';

export interface ToolContext {
  readonly ctx: CanvasRenderingContext2D;
  readonly width: number;
  readonly height: number;
  readonly color: string;
  readonly pencilSize: number;
  readonly eraserSize: number;
  readonly lineWidth: number;
  readonly lineStartCap: LineCap;
  readonly lineEndCap: LineCap;
  readonly shapeType: ShapeType;
  readonly shapeOutlineWidth: number;
  readonly shapeOutlineColor: string;
  readonly shapeFillColor: string;
  readonly shapeInstant: boolean;
  readonly shiftKey?: boolean;
  readonly textFontFamily: string;
  readonly textFontSize: number;
  readonly textBold: boolean;
  readonly textItalic: boolean;
  readonly textUnderline: boolean;
  getTextDraft(): TextDraft | null;
  setTextDraft(draft: TextDraft | null): void;
  commitTextDraft(): void;
  setTextSelectionPreview(rect: Rect | null): void;
  getShapeDraft(): ShapeDraft | null;
  setShapeDraft(draft: ShapeDraft | null): void;
  commitShapeDraft(): void;
  setShapeSelectionPreview(rect: Rect | null): void;
  setLinePreview(line: LineDraft | null): void;
}

export interface DrawingTool {
  readonly definition: ToolDefinition;
  onPointerDown(point: Point, toolCtx: ToolContext): void;
  onPointerMove(point: Point, toolCtx: ToolContext): void;
  onPointerUp(point: Point, toolCtx: ToolContext): void;
  onDeactivate?(toolCtx: ToolContext): void;
}
