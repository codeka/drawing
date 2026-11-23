import { rasterizeLinePoints } from './pixel-draw';

describe('rasterizeLinePoints', () => {
  it('returns a single point when start and end match', () => {
    expect(rasterizeLinePoints(10, 20, 10, 20)).toEqual([{ x: 10, y: 20 }]);
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
