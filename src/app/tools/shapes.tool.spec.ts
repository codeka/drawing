import { vi } from 'vitest';
import { ShapeDraft } from '../models/tool.model';
import { ToolContext } from './drawing-tool';
import { ShapesTool } from './shapes.tool';

function createMockCanvasCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    rect: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arcTo: vi.fn(),
    ellipse: vi.fn(),
    bezierCurveTo: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineJoin: 'miter' as CanvasLineJoin,
    miterLimit: 10,
  };
}

function createToolContext(overrides: Partial<ToolContext> = {}): {
  ctx: ToolContext;
  canvasCtx: ReturnType<typeof createMockCanvasCtx>;
  getCapturedDraft: () => ShapeDraft | null;
} {
  const canvasCtx = createMockCanvasCtx();
  let activeDraft: ShapeDraft | null = null;
  const ctx: ToolContext = {
    ctx: canvasCtx as unknown as CanvasRenderingContext2D,
    width: 800,
    height: 600,
    color: '#000000',
    pencilSize: 8,
    eraserSize: 10,
    lineWidth: 8,
    lineStartCap: 'round',
    lineEndCap: 'round',
    shapeType: 'star',
    shapeOutlineWidth: 8,
    shapeOutlineColor: '#ed1c24',
    shapeFillColor: '#3f48d1',
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
    getShapeDraft: () => activeDraft,
    setShapeDraft: (draft) => {
      activeDraft = draft;
    },
    commitShapeDraft: vi.fn(() => {
      activeDraft = null;
    }),
    setShapeSelectionPreview: vi.fn(),
    setLinePreview: vi.fn(),
    markDirty: vi.fn(),
    ...overrides,
  };

  return {
    ctx,
    canvasCtx,
    getCapturedDraft: () => activeDraft,
  };
}

describe('ShapesTool', () => {
  it('initializes click-created draft centered at pointer and clamped within canvas', () => {
    const tool = new ShapesTool();
    const { ctx, getCapturedDraft } = createToolContext();

    tool.onPointerDown({ x: 30, y: 40 }, ctx);
    tool.onPointerUp({ x: 32, y: 42 }, ctx);

    expect(getCapturedDraft()).toEqual({
      rect: { x: 0, y: 0, width: 140, height: 140 },
      shapeType: 'star',
      outlineWidth: 8,
      outlineColor: '#ed1c24',
      fillColor: '#3f48d1',
    });
  });

  it('initializes drag-created draft and supports Shift square constraint', () => {
    const tool = new ShapesTool();
    const { ctx, getCapturedDraft } = createToolContext({ shiftKey: true });

    tool.onPointerDown({ x: 100, y: 100 }, ctx);
    tool.onPointerMove({ x: 260, y: 180 }, ctx);
    expect(ctx.setShapeSelectionPreview).toHaveBeenLastCalledWith({
      x: 100,
      y: 100,
      width: 160,
      height: 160,
    });

    tool.onPointerUp({ x: 260, y: 180 }, ctx);
    expect(ctx.setShapeSelectionPreview).toHaveBeenLastCalledWith(null);
    expect(getCapturedDraft()).toEqual({
      rect: { x: 100, y: 100, width: 160, height: 160 },
      shapeType: 'star',
      outlineWidth: 8,
      outlineColor: '#ed1c24',
      fillColor: '#3f48d1',
    });
  });

  it('enforces minimum size 16x16 on tiny drags and commits active draft on outside click or deactivate', () => {
    const tool = new ShapesTool();
    const { ctx, getCapturedDraft } = createToolContext();

    tool.onPointerDown({ x: 50, y: 50 }, ctx);
    tool.onPointerUp({ x: 62, y: 55 }, ctx);
    expect(getCapturedDraft()?.rect).toEqual({ x: 50, y: 50, width: 16, height: 16 });

    tool.onPointerDown({ x: 300, y: 300 }, ctx);
    expect(ctx.commitShapeDraft).toHaveBeenCalledTimes(1);
    tool.onPointerUp({ x: 300, y: 300 }, ctx);
    expect(getCapturedDraft()).toBeNull();

    tool.onDeactivate(ctx);
    expect(ctx.commitShapeDraft).toHaveBeenCalledTimes(2);
    expect(ctx.setShapeSelectionPreview).toHaveBeenLastCalledWith(null);
  });

  it('renders immediately onto canvas without creating a ShapeDraft when shapeInstant is true', () => {
    const tool = new ShapesTool();
    const { ctx, canvasCtx, getCapturedDraft } = createToolContext({
      shapeInstant: true,
      shiftKey: true,
    });

    tool.onPointerDown({ x: 40, y: 40 }, ctx);
    tool.onPointerMove({ x: 140, y: 90 }, ctx);
    expect(ctx.setShapeSelectionPreview).toHaveBeenLastCalledWith({
      x: 40,
      y: 40,
      width: 100,
      height: 100,
    });

    tool.onPointerUp({ x: 140, y: 90 }, ctx);
    expect(ctx.setShapeSelectionPreview).toHaveBeenLastCalledWith(null);
    expect(getCapturedDraft()).toBeNull();
    expect(canvasCtx.fill).toHaveBeenCalledTimes(1);
    expect(canvasCtx.stroke).toHaveBeenCalledTimes(1);
    expect(ctx.markDirty).toHaveBeenCalledTimes(1);
  });
});
