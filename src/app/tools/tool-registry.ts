import { ToolId } from '../models/tool.model';
import { DrawingTool } from './drawing-tool';
import { EraserTool } from './eraser.tool';
import { FillTool } from './fill.tool';
import { LineTool } from './line.tool';
import { PencilTool } from './pencil.tool';
import { ShapesTool } from './shapes.tool';
import { TextTool } from './text.tool';

export function createToolMap(): Record<ToolId, DrawingTool> {
  return {
    pencil: new PencilTool(),
    fill: new FillTool(),
    eraser: new EraserTool(),
    text: new TextTool(),
    line: new LineTool(),
    shapes: new ShapesTool(),
  };
}
