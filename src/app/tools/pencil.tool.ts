import { getToolDefinition, Point } from '../models/tool.model';
import { DrawingTool, ToolContext } from './drawing-tool';
import { drawCircleStampLine } from './pixel-draw';

export class PencilTool implements DrawingTool {
  readonly definition = getToolDefinition('pencil');
  private isDrawing = false;
  private lastPoint: Point | null = null;

  onPointerDown(point: Point, toolCtx: ToolContext): void {
    this.isDrawing = true;
    this.lastPoint = point;
    drawCircleStampLine(toolCtx.ctx, point, point, toolCtx.pencilSize, toolCtx.color);
    toolCtx.markDirty?.();
  }

  onPointerMove(point: Point, toolCtx: ToolContext): void {
    if (!this.isDrawing || !this.lastPoint) {
      return;
    }
    drawCircleStampLine(toolCtx.ctx, this.lastPoint, point, toolCtx.pencilSize, toolCtx.color);
    this.lastPoint = point;
  }

  onPointerUp(point: Point, toolCtx: ToolContext): void {
    if (this.isDrawing && this.lastPoint) {
      drawCircleStampLine(toolCtx.ctx, this.lastPoint, point, toolCtx.pencilSize, toolCtx.color);
    }
    this.isDrawing = false;
    this.lastPoint = null;
  }

  onDeactivate(): void {
    this.isDrawing = false;
    this.lastPoint = null;
  }
}
