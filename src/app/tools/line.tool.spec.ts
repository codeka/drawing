import { vi } from 'vitest';
import { LineDraft } from '../models/tool.model';
import { ToolContext } from './drawing-tool';
import { LineTool } from './line.tool';

function createMockCanvasCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt' as CanvasLineCap,
    lineJoin: 'miter' as CanvasLineJoin,
  };
}

function createToolContext(overrides: Partial<ToolContext> = {}): {
  ctx: ToolContext;
  canvasCtx: ReturnType<typeof createMockCanvasCtx>;
  getPreview: () => LineDraft | null;
} {
  const canvasCtx = createMockCanvasCtx();
  let linePreview: LineDraft | null = null;
  const ctx: ToolContext = {
    ctx: canvasCtx as unknown as CanvasRenderingContext2D,
    width: 800,
    height: 600,
    color: '#ed1c24',
    pencilSize: 8,
    eraserSize: 10,
    lineWidth: 8,
    lineStartCap: 'circle',
    lineEndCap: 'arrow',
    shapeType: 'rectangle',
    shapeOutlineWidth: 8,
    shapeOutlineColor: '#000000',
    shapeFillColor: 'transparent',
    shapeInstant: false,
    shiftKey: false,
    textFontFamily: 'Segoe UI',
    textFontSize: 24,
    textBold: false,
    textItalic: false,
    textUnderline: false,
    getTextDraft: () => null,
    setTextDraft: vi.fn(),
    commitTextDraft: vi.fn(),
    setTextSelectionPreview: vi.fn(),
    getShapeDraft: () => null,
    setShapeDraft: vi.fn(),
    commitShapeDraft: vi.fn(),
    setShapeSelectionPreview: vi.fn(),
    setLinePreview: (line) => {
      linePreview = line;
    },
    ...overrides,
  };

  return {
    ctx,
    canvasCtx,
    getPreview: () => linePreview,
  };
}

describe('LineTool', () => {
  it('updates preview with startCap and endCap during drag and renders immediately on pointer up', () => {
    const tool = new LineTool();
    const { ctx, canvasCtx, getPreview } = createToolContext();

    tool.onPointerDown({ x: 10, y: 20 }, ctx);
    expect(getPreview()).toEqual({
      start: { x: 10, y: 20 },
      end: { x: 10, y: 20 },
      color: '#ed1c24',
      thickness: 8,
      startCap: 'circle',
      endCap: 'arrow',
    });

    tool.onPointerMove({ x: 110, y: 20 }, ctx);
    expect(getPreview()?.end).toEqual({ x: 110, y: 20 });
    expect(canvasCtx.stroke).not.toHaveBeenCalled();

    tool.onPointerUp({ x: 110, y: 20 }, ctx);
    expect(getPreview()).toBeNull();
    expect(canvasCtx.stroke).toHaveBeenCalledTimes(1);
    expect(canvasCtx.fill).toHaveBeenCalledTimes(2);
  });

  it('snaps angle to 45-degree increments when shiftKey is held and clears preview on deactivate', () => {
    const tool = new LineTool();
    const { ctx, getPreview } = createToolContext({ shiftKey: true });

    tool.onPointerDown({ x: 100, y: 100 }, ctx);
    tool.onPointerMove({ x: 200, y: 108 }, ctx);
    expect(getPreview()?.end.y).toBeCloseTo(100, 5);

    tool.onDeactivate(ctx);
    expect(getPreview()).toBeNull();
  });
});
