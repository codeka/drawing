import { getToolDefinition, Point } from '../models/tool.model';
import { DrawingTool, ToolContext } from './drawing-tool';
import { eraseSquareStampLine } from './pixel-draw';

const ERASER_SIZE = 16;

export class EraserTool implements DrawingTool {
  readonly definition = getToolDefinition('eraser');
  private isErasing = false;
  private lastPoint: Point | null = null;

  onPointerDown(point: Point, toolCtx: ToolContext): void {
    this.isErasing = true;
    this.lastPoint = point;
    eraseSquareStampLine(toolCtx.ctx, point, point, ERASER_SIZE);
  }

  onPointerMove(point: Point, toolCtx: ToolContext): void {
    if (!this.isErasing || !this.lastPoint) {
      return;
    }
    eraseSquareStampLine(toolCtx.ctx, this.lastPoint, point, ERASER_SIZE);
    this.lastPoint = point;
  }

  onPointerUp(point: Point, toolCtx: ToolContext): void {
    if (this.isErasing && this.lastPoint) {
      eraseSquareStampLine(toolCtx.ctx, this.lastPoint, point, ERASER_SIZE);
    }
    this.isErasing = false;
    this.lastPoint = null;
  }

  onDeactivate(): void {
    this.isErasing = false;
    this.lastPoint = null;
  }
}
