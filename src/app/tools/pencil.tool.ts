import { getToolDefinition, Point } from '../models/tool.model';
import { DrawingTool, ToolContext } from './drawing-tool';
import { drawSquareStampLine } from './pixel-draw';

const PENCIL_SIZE = 2;

export class PencilTool implements DrawingTool {
  readonly definition = getToolDefinition('pencil');
  private isDrawing = false;
  private lastPoint: Point | null = null;

  onPointerDown(point: Point, toolCtx: ToolContext): void {
    this.isDrawing = true;
    this.lastPoint = point;
    drawSquareStampLine(toolCtx.ctx, point, point, PENCIL_SIZE, toolCtx.color);
  }

  onPointerMove(point: Point, toolCtx: ToolContext): void {
    if (!this.isDrawing || !this.lastPoint) {
      return;
    }
    drawSquareStampLine(toolCtx.ctx, this.lastPoint, point, PENCIL_SIZE, toolCtx.color);
    this.lastPoint = point;
  }

  onPointerUp(point: Point, toolCtx: ToolContext): void {
    if (this.isDrawing && this.lastPoint) {
      drawSquareStampLine(toolCtx.ctx, this.lastPoint, point, PENCIL_SIZE, toolCtx.color);
    }
    this.isDrawing = false;
    this.lastPoint = null;
  }

  onDeactivate(): void {
    this.isDrawing = false;
    this.lastPoint = null;
  }
}
