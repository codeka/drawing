import { getToolDefinition, Point } from '../models/tool.model';
import { DrawingTool, ToolContext } from './drawing-tool';
import { eraseCircleStampLine } from './pixel-draw';

export class EraserTool implements DrawingTool {
  readonly definition = getToolDefinition('eraser');
  private isErasing = false;
  private lastPoint: Point | null = null;

  onPointerDown(point: Point, toolCtx: ToolContext): void {
    this.isErasing = true;
    this.lastPoint = point;
    eraseCircleStampLine(toolCtx.ctx, point, point, toolCtx.eraserSize);
  }

  onPointerMove(point: Point, toolCtx: ToolContext): void {
    if (!this.isErasing || !this.lastPoint) {
      return;
    }
    eraseCircleStampLine(toolCtx.ctx, this.lastPoint, point, toolCtx.eraserSize);
    this.lastPoint = point;
  }

  onPointerUp(point: Point, toolCtx: ToolContext): void {
    if (this.isErasing && this.lastPoint) {
      eraseCircleStampLine(toolCtx.ctx, this.lastPoint, point, toolCtx.eraserSize);
    }
    this.isErasing = false;
    this.lastPoint = null;
  }

  onDeactivate(): void {
    this.isErasing = false;
    this.lastPoint = null;
  }
}
