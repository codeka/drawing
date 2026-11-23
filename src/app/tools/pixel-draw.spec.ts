import { vi } from 'vitest';
import {
  drawCircleStampLine,
  eraseCircleStampLine,
  getDiskSpans,
  rasterizeLinePoints,
} from './pixel-draw';

describe('rasterizeLinePoints', () => {
  it('returns a single point when start and end match', () => {
    expect(rasterizeLinePoints(10, 20, 10, 20)).toEqual([{ x: 10, y: 20 }]);
  });

  it('floors fractional coordinates consistently with cursor pixel indexing', () => {
    expect(rasterizeLinePoints(1.9, 2.9, 1.1, 2.1)).toEqual([{ x: 1, y: 2 }]);
  });

  it('rasterizes horizontal lines continuously', () => {
    expect(rasterizeLinePoints(2, 5, 6, 5)).toEqual([
      { x: 2, y: 5 },
      { x: 3, y: 5 },
      { x: 4, y: 5 },
      { x: 5, y: 5 },
      { x: 6, y: 5 },
    ]);
  });

  it('rasterizes vertical lines continuously in reverse direction', () => {
    expect(rasterizeLinePoints(4, 5, 4, 2)).toEqual([
      { x: 4, y: 5 },
      { x: 4, y: 4 },
      { x: 4, y: 3 },
      { x: 4, y: 2 },
    ]);
  });

  it('rasterizes diagonal lines without gaps', () => {
    const points = rasterizeLinePoints(0, 0, 4, 4);
    expect(points).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
      { x: 4, y: 4 },
    ]);
  });

  it('produces 8-connected steps for steep arbitrary slopes', () => {
    const points = rasterizeLinePoints(1, 1, 4, 9);
    expect(points[0]).toEqual({ x: 1, y: 1 });
    expect(points[points.length - 1]).toEqual({ x: 4, y: 9 });

    for (let i = 1; i < points.length; i++) {
      const dx = Math.abs(points[i].x - points[i - 1].x);
      const dy = Math.abs(points[i].y - points[i - 1].y);
      expect(dx).toBeLessThanOrEqual(1);
      expect(dy).toBeLessThanOrEqual(1);
    }
  });
});

describe('getDiskSpans', () => {
  it('returns a single pixel span for size 1', () => {
    expect(getDiskSpans(1)).toEqual([{ dy: 0, xStart: 0, width: 1 }]);
  });

  it('returns a 2x2 block for size 2', () => {
    expect(getDiskSpans(2)).toEqual([
      { dy: -1, xStart: -1, width: 2 },
      { dy: 0, xStart: -1, width: 2 },
    ]);
  });

  it('excludes corners for size 4 with 12 total pixels', () => {
    const spans = getDiskSpans(4);
    expect(spans).toEqual([
      { dy: -2, xStart: -1, width: 2 },
      { dy: -1, xStart: -2, width: 4 },
      { dy: 0, xStart: -2, width: 4 },
      { dy: 1, xStart: -1, width: 2 },
    ]);
    const totalPixels = spans.reduce((sum, span) => sum + span.width, 0);
    expect(totalPixels).toBe(12);
  });

  it('produces a symmetric 10px disk spanning [-5, 4] in both axes', () => {
    const spans = getDiskSpans(10);
    expect(spans.map((s) => s.width)).toEqual([4, 8, 8, 10, 10, 10, 10, 8, 8, 4]);
    expect(spans[0].dy).toBe(-5);
    expect(spans[spans.length - 1].dy).toBe(4);
    const minX = Math.min(...spans.map((s) => s.xStart));
    const maxXExclusive = Math.max(...spans.map((s) => s.xStart + s.width));
    expect(minX).toBe(-5);
    expect(maxXExclusive).toBe(5);
  });
});

describe('drawCircleStampLine and eraseCircleStampLine', () => {
  it('draws disk spans with fillRect and sets fillStyle', () => {
    const fillRect = vi.fn();
    const ctx = { fillStyle: '', fillRect } as unknown as CanvasRenderingContext2D;

    drawCircleStampLine(ctx, { x: 10, y: 20 }, { x: 10, y: 20 }, 4, '#ed1c24');

    expect(ctx.fillStyle).toBe('#ed1c24');
    expect(fillRect.mock.calls).toEqual([
      [9, 18, 2, 1],
      [8, 19, 4, 1],
      [8, 20, 4, 1],
      [9, 21, 2, 1],
    ]);
  });

  it('erases disk spans with clearRect along a line', () => {
    const clearRect = vi.fn();
    const ctx = { clearRect } as unknown as CanvasRenderingContext2D;

    eraseCircleStampLine(ctx, { x: 5, y: 5 }, { x: 6, y: 5 }, 1);

    expect(clearRect.mock.calls).toEqual([
      [5, 5, 1, 1],
      [6, 5, 1, 1],
    ]);
  });
});
