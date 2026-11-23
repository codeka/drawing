import { vi } from 'vitest';
import { SHAPE_DEFINITIONS, ShapeDraft, TRANSPARENT_COLOR } from '../models/tool.model';
import { isVisibleColor, renderShapeToCanvas, traceShapePath } from './shape-renderer';

function createMockCtx() {
  const pathOps: Array<{ op: string; args: number[] }> = [];
  return {
    pathOps,
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(() => pathOps.push({ op: 'beginPath', args: [] })),
    closePath: vi.fn(() => pathOps.push({ op: 'closePath', args: [] })),
    rect: vi.fn((x: number, y: number, w: number, h: number) =>
      pathOps.push({ op: 'rect', args: [x, y, w, h] }),
    ),
    moveTo: vi.fn((x: number, y: number) => pathOps.push({ op: 'moveTo', args: [x, y] })),
    lineTo: vi.fn((x: number, y: number) => pathOps.push({ op: 'lineTo', args: [x, y] })),
    arcTo: vi.fn((x1: number, y1: number, x2: number, y2: number, r: number) =>
      pathOps.push({ op: 'arcTo', args: [x1, y1, x2, y2, r] }),
    ),
    ellipse: vi.fn((cx: number, cy: number, rx: number, ry: number) =>
      pathOps.push({ op: 'ellipse', args: [cx, cy, rx, ry] }),
    ),
    bezierCurveTo: vi.fn(
      (cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number) =>
        pathOps.push({ op: 'bezierCurveTo', args: [cp1x, cp1y, cp2x, cp2y, x, y] }),
    ),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineJoin: 'miter' as CanvasLineJoin,
    miterLimit: 10,
  };
}

function makeDraft(overrides: Partial<ShapeDraft> = {}): ShapeDraft {
  return {
    rect: { x: 10, y: 20, width: 100, height: 80 },
    shapeType: 'rectangle',
    outlineWidth: 8,
    outlineColor: '#000000',
    fillColor: TRANSPARENT_COLOR,
    ...overrides,
  };
}

describe('isVisibleColor', () => {
  it('distinguishes transparent and blank strings from painted colors', () => {
    expect(isVisibleColor('#000000')).toBe(true);
    expect(isVisibleColor(' #ed1c24 ')).toBe(true);
    expect(isVisibleColor('transparent')).toBe(false);
    expect(isVisibleColor('TRANSPARENT')).toBe(false);
    expect(isVisibleColor('')).toBe(false);
    expect(isVisibleColor('   ')).toBe(false);
  });
});

describe('traceShapePath', () => {
  it('traces closed paths strictly within rect for all 10 shape types', () => {
    const rect = { x: 10, y: 20, width: 100, height: 80 };

    for (const shape of SHAPE_DEFINITIONS) {
      const ctx = createMockCtx();
      traceShapePath(ctx as unknown as CanvasRenderingContext2D, shape.id, rect);

      expect(ctx.beginPath).toHaveBeenCalledTimes(1);
      if (shape.id !== 'rectangle') {
        expect(ctx.closePath).toHaveBeenCalledTimes(1);
      }

      for (const entry of ctx.pathOps) {
        if (entry.op === 'moveTo' || entry.op === 'lineTo') {
          const [px, py] = entry.args;
          expect(px).toBeGreaterThanOrEqual(rect.x - 1e-6);
          expect(px).toBeLessThanOrEqual(rect.x + rect.width + 1e-6);
          expect(py).toBeGreaterThanOrEqual(rect.y - 1e-6);
          expect(py).toBeLessThanOrEqual(rect.y + rect.height + 1e-6);
        } else if (entry.op === 'bezierCurveTo') {
          for (let i = 0; i < 6; i += 2) {
            expect(entry.args[i]).toBeGreaterThanOrEqual(rect.x - 1e-6);
            expect(entry.args[i]).toBeLessThanOrEqual(rect.x + rect.width + 1e-6);
            expect(entry.args[i + 1]).toBeGreaterThanOrEqual(rect.y - 1e-6);
            expect(entry.args[i + 1]).toBeLessThanOrEqual(rect.y + rect.height + 1e-6);
          }
        }
      }
    }
  });
});

describe('renderShapeToCanvas', () => {
  it('does nothing for empty dimensions or fully transparent outline and fill', () => {
    const ctx = createMockCtx();
    renderShapeToCanvas(
      ctx as unknown as CanvasRenderingContext2D,
      makeDraft({ rect: { x: 0, y: 0, width: 0, height: 50 } }),
    );
    renderShapeToCanvas(
      ctx as unknown as CanvasRenderingContext2D,
      makeDraft({ outlineColor: TRANSPARENT_COLOR, fillColor: TRANSPARENT_COLOR }),
    );
    expect(ctx.save).not.toHaveBeenCalled();
  });

  it('fills before stroking and insets stroke by half outlineWidth', () => {
    const ctx = createMockCtx();
    const callOrder: string[] = [];
    ctx.fill.mockImplementation(() => callOrder.push('fill'));
    ctx.stroke.mockImplementation(() => callOrder.push('stroke'));

    renderShapeToCanvas(
      ctx as unknown as CanvasRenderingContext2D,
      makeDraft({
        rect: { x: 10, y: 20, width: 100, height: 80 },
        shapeType: 'rectangle',
        outlineWidth: 8,
        outlineColor: '#ed1c24',
        fillColor: '#3f48d1',
      }),
    );

    expect(callOrder).toEqual(['fill', 'stroke']);
    expect(ctx.fillStyle).toBe('#3f48d1');
    expect(ctx.strokeStyle).toBe('#ed1c24');
    expect(ctx.lineWidth).toBe(8);
    expect(ctx.lineJoin).toBe('miter');
    expect(ctx.rect).toHaveBeenCalledWith(14, 24, 92, 72);
    expect(ctx.restore).toHaveBeenCalledTimes(1);
  });

  it('supports fill-only when outline is transparent and outline-only when fill is transparent', () => {
    const fillOnlyCtx = createMockCtx();
    renderShapeToCanvas(
      fillOnlyCtx as unknown as CanvasRenderingContext2D,
      makeDraft({ outlineColor: TRANSPARENT_COLOR, fillColor: '#23cc56' }),
    );
    expect(fillOnlyCtx.fill).toHaveBeenCalledTimes(1);
    expect(fillOnlyCtx.stroke).not.toHaveBeenCalled();
    expect(fillOnlyCtx.rect).toHaveBeenCalledWith(10, 20, 100, 80);

    const outlineOnlyCtx = createMockCtx();
    renderShapeToCanvas(
      outlineOnlyCtx as unknown as CanvasRenderingContext2D,
      makeDraft({ shapeType: 'heart', outlineColor: '#000000', fillColor: TRANSPARENT_COLOR }),
    );
    expect(outlineOnlyCtx.fill).not.toHaveBeenCalled();
    expect(outlineOnlyCtx.stroke).toHaveBeenCalledTimes(1);
    expect(outlineOnlyCtx.lineJoin).toBe('round');
  });

  it('clamps effective outline width on tiny rects so inner dimensions stay positive', () => {
    const ctx = createMockCtx();
    renderShapeToCanvas(
      ctx as unknown as CanvasRenderingContext2D,
      makeDraft({
        rect: { x: 0, y: 0, width: 16, height: 16 },
        outlineWidth: 50,
        outlineColor: '#000000',
      }),
    );

    expect(ctx.lineWidth).toBe(15);
    expect(ctx.rect).toHaveBeenCalledWith(7.5, 7.5, 1, 1);
  });
});
