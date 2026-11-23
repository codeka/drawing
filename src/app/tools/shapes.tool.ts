import { getToolDefinition, Point, Rect, ShapeDraft } from '../models/tool.model';
import { DrawingTool, ToolContext } from './drawing-tool';
import { renderShapeToCanvas } from './shape-renderer';

const DEFAULT_SHAPE_BOX_SIZE = 140;
const MIN_SHAPE_SIZE = 16;
const MIN_DRAG_CREATE_SIZE = 10;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampPoint(point: Point, width: number, height: number): Point {
  return {
    x: clamp(point.x, 0, width),
    y: clamp(point.y, 0, height),
  };
}

function normalizeRect(a: Point, b: Point): Rect {
  const x = Math.round(Math.min(a.x, b.x));
  const y = Math.round(Math.min(a.y, b.y));
  const width = Math.round(Math.abs(b.x - a.x));
  const height = Math.round(Math.abs(b.y - a.y));
  return { x, y, width, height };
}

export class ShapesTool implements DrawingTool {
  readonly definition = getToolDefinition('shapes');
  private dragStart: Point | null = null;
  private isCreatingBox = false;
  private committedOnPointerDown = false;

  onPointerDown(point: Point, toolCtx: ToolContext): void {
    if (toolCtx.getShapeDraft() !== null) {
      toolCtx.commitShapeDraft();
      this.committedOnPointerDown = true;
      this.isCreatingBox = false;
      this.dragStart = null;
      return;
    }

    const clamped = clampPoint(point, toolCtx.width, toolCtx.height);
    this.committedOnPointerDown = false;
    this.isCreatingBox = true;
    this.dragStart = clamped;
    toolCtx.setShapeSelectionPreview({
      x: Math.round(clamped.x),
      y: Math.round(clamped.y),
      width: 0,
      height: 0,
    });
  }

  onPointerMove(point: Point, toolCtx: ToolContext): void {
    if (!this.isCreatingBox || !this.dragStart) {
      return;
    }
    const clamped = clampPoint(point, toolCtx.width, toolCtx.height);
    toolCtx.setShapeSelectionPreview(
      this.computeDragRect(this.dragStart, clamped, !!toolCtx.shiftKey, toolCtx.width, toolCtx.height),
    );
  }

  onPointerUp(point: Point, toolCtx: ToolContext): void {
    if (this.committedOnPointerDown) {
      this.committedOnPointerDown = false;
      return;
    }

    if (!this.isCreatingBox || !this.dragStart) {
      return;
    }

    const clamped = clampPoint(point, toolCtx.width, toolCtx.height);
    const dragged = this.computeDragRect(
      this.dragStart,
      clamped,
      !!toolCtx.shiftKey,
      toolCtx.width,
      toolCtx.height,
    );

    this.isCreatingBox = false;
    this.dragStart = null;
    toolCtx.setShapeSelectionPreview(null);

    let rect: Rect;
    if (dragged.width >= MIN_DRAG_CREATE_SIZE || dragged.height >= MIN_DRAG_CREATE_SIZE) {
      const minW = Math.min(MIN_SHAPE_SIZE, Math.max(1, toolCtx.width));
      const minH = Math.min(MIN_SHAPE_SIZE, Math.max(1, toolCtx.height));
      const width = clamp(dragged.width, minW, Math.max(minW, toolCtx.width));
      const height = clamp(dragged.height, minH, Math.max(minH, toolCtx.height));
      const x = clamp(dragged.x, 0, Math.max(0, toolCtx.width - width));
      const y = clamp(dragged.y, 0, Math.max(0, toolCtx.height - height));
      rect = { x, y, width, height };
    } else {
      const boxWidth = Math.min(DEFAULT_SHAPE_BOX_SIZE, Math.max(1, toolCtx.width));
      const boxHeight = Math.min(DEFAULT_SHAPE_BOX_SIZE, Math.max(1, toolCtx.height));
      const x = clamp(
        Math.round(clamped.x - boxWidth / 2),
        0,
        Math.max(0, toolCtx.width - boxWidth),
      );
      const y = clamp(
        Math.round(clamped.y - boxHeight / 2),
        0,
        Math.max(0, toolCtx.height - boxHeight),
      );
      rect = { x, y, width: boxWidth, height: boxHeight };
    }

    const draft: ShapeDraft = {
      rect,
      shapeType: toolCtx.shapeType,
      outlineWidth: toolCtx.shapeOutlineWidth,
      outlineColor: toolCtx.shapeOutlineColor,
      fillColor: toolCtx.shapeFillColor,
    };

    if (toolCtx.shapeInstant) {
      renderShapeToCanvas(toolCtx.ctx, draft);
    } else {
      toolCtx.setShapeDraft(draft);
    }
  }

  onDeactivate(toolCtx: ToolContext): void {
    this.isCreatingBox = false;
    this.dragStart = null;
    this.committedOnPointerDown = false;
    toolCtx.setShapeSelectionPreview(null);
    toolCtx.commitShapeDraft();
  }

  private computeDragRect(
    start: Point,
    end: Point,
    constrainSquare: boolean,
    canvasWidth: number,
    canvasHeight: number,
  ): Rect {
    if (!constrainSquare) {
      return normalizeRect(start, end);
    }

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const sx = dx < 0 ? -1 : 1;
    const sy = dy < 0 ? -1 : 1;
    const maxSideX = sx > 0 ? canvasWidth - start.x : start.x;
    const maxSideY = sy > 0 ? canvasHeight - start.y : start.y;
    const side = Math.min(Math.max(Math.abs(dx), Math.abs(dy)), maxSideX, maxSideY);
    return normalizeRect(start, {
      x: start.x + sx * side,
      y: start.y + sy * side,
    });
  }
}
