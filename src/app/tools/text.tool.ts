import { getToolDefinition, Point, Rect } from '../models/tool.model';
import { DrawingTool, ToolContext } from './drawing-tool';
import { getTextLineHeight, TEXT_BOX_PADDING } from './text-renderer';

const DEFAULT_BOX_WIDTH = 240;
const DEFAULT_BOX_HEIGHT = 80;
const MIN_DRAG_CREATE_SIZE = 20;

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

export class TextTool implements DrawingTool {
  readonly definition = getToolDefinition('text');
  private dragStart: Point | null = null;
  private isCreatingBox = false;
  private committedOnPointerDown = false;

  onPointerDown(point: Point, toolCtx: ToolContext): void {
    if (toolCtx.getTextDraft() !== null) {
      toolCtx.commitTextDraft();
      this.committedOnPointerDown = true;
      this.isCreatingBox = false;
      this.dragStart = null;
      return;
    }

    const clamped = clampPoint(point, toolCtx.width, toolCtx.height);
    this.committedOnPointerDown = false;
    this.isCreatingBox = true;
    this.dragStart = clamped;
    toolCtx.setTextSelectionPreview({
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
    toolCtx.setTextSelectionPreview(normalizeRect(this.dragStart, clamped));
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
    const dragged = normalizeRect(this.dragStart, clamped);

    this.isCreatingBox = false;
    this.dragStart = null;
    toolCtx.setTextSelectionPreview(null);

    let rect: Rect;
    if (dragged.width >= MIN_DRAG_CREATE_SIZE && dragged.height >= MIN_DRAG_CREATE_SIZE) {
      rect = dragged;
    } else {
      const boxWidth = Math.min(DEFAULT_BOX_WIDTH, Math.max(40, toolCtx.width));
      const minHeightForFont = getTextLineHeight(toolCtx.textFontSize) + TEXT_BOX_PADDING * 2;
      const boxHeight = Math.min(
        Math.max(DEFAULT_BOX_HEIGHT, minHeightForFont),
        Math.max(28, toolCtx.height),
      );
      const x = clamp(Math.round(clamped.x), 0, Math.max(0, toolCtx.width - boxWidth));
      const y = clamp(Math.round(clamped.y), 0, Math.max(0, toolCtx.height - boxHeight));
      rect = { x, y, width: boxWidth, height: boxHeight };
    }

    toolCtx.setTextDraft({
      rect,
      text: '',
      fontFamily: toolCtx.textFontFamily,
      fontSize: toolCtx.textFontSize,
      bold: toolCtx.textBold,
      italic: toolCtx.textItalic,
      underline: toolCtx.textUnderline,
      color: toolCtx.color,
    });
  }

  onDeactivate(toolCtx: ToolContext): void {
    this.isCreatingBox = false;
    this.dragStart = null;
    this.committedOnPointerDown = false;
    toolCtx.setTextSelectionPreview(null);
    toolCtx.commitTextDraft();
  }
}
