import { getToolDefinition, LineDraft, Point } from '../models/tool.model';
import { DrawingTool, ToolContext } from './drawing-tool';
import { renderLineToCanvas, snapLineEndPoint } from './line-renderer';

export class LineTool implements DrawingTool {
  readonly definition = getToolDefinition('line');
  private isDrawing = false;
  private startPoint: Point | null = null;

  onPointerDown(point: Point, toolCtx: ToolContext): void {
    this.isDrawing = true;
    this.startPoint = point;
    toolCtx.setLinePreview(this.buildLineDraft(point, point, toolCtx));
  }

  onPointerMove(point: Point, toolCtx: ToolContext): void {
    if (!this.isDrawing || !this.startPoint) {
      return;
    }
    const end = this.resolveEndPoint(this.startPoint, point, toolCtx);
    toolCtx.setLinePreview(this.buildLineDraft(this.startPoint, end, toolCtx));
  }

  onPointerUp(point: Point, toolCtx: ToolContext): void {
    if (!this.isDrawing || !this.startPoint) {
      return;
    }
    const end = this.resolveEndPoint(this.startPoint, point, toolCtx);
    const line = this.buildLineDraft(this.startPoint, end, toolCtx);
    this.isDrawing = false;
    this.startPoint = null;
    toolCtx.setLinePreview(null);
    renderLineToCanvas(toolCtx.ctx, line);
    toolCtx.markDirty?.();
  }

  onDeactivate(toolCtx: ToolContext): void {
    this.isDrawing = false;
    this.startPoint = null;
    toolCtx.setLinePreview(null);
  }

  private resolveEndPoint(start: Point, point: Point, toolCtx: ToolContext): Point {
    return toolCtx.shiftKey ? snapLineEndPoint(start, point) : point;
  }

  private buildLineDraft(start: Point, end: Point, toolCtx: ToolContext): LineDraft {
    return {
      start,
      end,
      color: toolCtx.color,
      thickness: toolCtx.lineWidth,
      startCap: toolCtx.lineStartCap,
      endCap: toolCtx.lineEndCap,
    };
  }
}
