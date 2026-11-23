import { Point } from '../models/tool.model';

/**
 * Generates integer pixel coordinates along a line from (x0, y0) to (x1, y1)
 * using Bresenham's algorithm so fast strokes never leave gaps.
 */
export function rasterizeLinePoints(x0: number, y0: number, x1: number, y1: number): Point[] {
  let cx = Math.round(x0);
  let cy = Math.round(y0);
  const tx = Math.round(x1);
  const ty = Math.round(y1);

  const points: Point[] = [];
  const dx = Math.abs(tx - cx);
  const dy = Math.abs(ty - cy);
  const sx = cx < tx ? 1 : -1;
  const sy = cy < ty ? 1 : -1;
  let err = dx - dy;

  while (true) {
    points.push({ x: cx, y: cy });
    if (cx === tx && cy === ty) {
      break;
    }
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      cx += sx;
    }
    if (e2 < dx) {
      err += dx;
      cy += sy;
    }
  }

  return points;
}

function stampAlongLine(
  from: Point,
  to: Point,
  size: number,
  applyStamp: (x: number, y: number, stampSize: number) => void,
): void {
  const half = Math.floor(size / 2);
  for (const pt of rasterizeLinePoints(from.x, from.y, to.x, to.y)) {
    applyStamp(pt.x - half, pt.y - half, size);
  }
}

/**
 * Draws crisp, un-antialiased square pixel stamps between two points so Flood Fill
 * does not encounter fuzzy edge artifacts.
 */
export function drawSquareStampLine(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  size: number,
  color: string,
): void {
  ctx.fillStyle = color;
  stampAlongLine(from, to, size, (x, y, s) => ctx.fillRect(x, y, s, s));
}

/**
 * Clears square pixel regions along a line back to full transparency (alpha = 0).
 */
export function eraseSquareStampLine(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  size: number,
): void {
  stampAlongLine(from, to, size, (x, y, s) => ctx.clearRect(x, y, s, s));
}
