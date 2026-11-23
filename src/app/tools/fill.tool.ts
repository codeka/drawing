import { getToolDefinition, Point } from '../models/tool.model';
import { DrawingTool, ToolContext } from './drawing-tool';
import { floodFill, parseHexColor } from './flood-fill';

export class FillTool implements DrawingTool {
  readonly definition = getToolDefinition('fill');

  onPointerDown(point: Point, toolCtx: ToolContext): void {
    const x = Math.floor(point.x);
    const y = Math.floor(point.y);
    if (x < 0 || x >= toolCtx.width || y < 0 || y >= toolCtx.height) {
      return;
    }

    const imageData = toolCtx.ctx.getImageData(0, 0, toolCtx.width, toolCtx.height);
    const fillRgba = parseHexColor(toolCtx.color);
    if (floodFill(imageData, x, y, fillRgba)) {
      toolCtx.ctx.putImageData(imageData, 0, 0);
    }
  }

  onPointerMove(): void {
    // Flood fill applies immediately on pointer down.
  }

  onPointerUp(): void {
    // No-op.
  }
}
