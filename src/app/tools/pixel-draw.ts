import { Point } from '../models/tool.model';

export interface DiskSpan {
  readonly dy: number;
  readonly xStart: number;
  readonly width: number;
}

const diskSpanCache = new Map<number, readonly DiskSpan[]>();

/**
 * Generates integer pixel coordinates along a line from (x0, y0) to (x1, y1)
 * using Bresenham's algorithm so fast strokes never leave gaps.
 */
export function rasterizeLinePoints(x0: number, y0: number, x1: number, y1: number): Point[] {
  let cx = Math.floor(x0);
  let cy = Math.floor(y0);
  const tx = Math.floor(x1);
  const ty = Math.floor(y1);

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

/**
 * Returns horizontal run spans for a crisp, un-antialiased circular disk of diameter `size`.
 * The disk spans [cx - floor(size / 2), cx - floor(size / 2) + size) in both axes.
 */
export function getDiskSpans(size: number): readonly DiskSpan[] {
  const s = Math.max(1, Math.round(size));
  const cached = diskSpanCache.get(s);
  if (cached) {
    return cached;
  }

  const half = Math.floor(s / 2);
  const r = s / 2;
  const r2 = r * r;
  const spans: DiskSpan[] = [];

  for (let oy = 0; oy < s; oy++) {
    const dyCenter = oy + 0.5 - r;
    let runStart = -1;
    let runEnd = -1;

    for (let ox = 0; ox < s; ox++) {
      const dxCenter = ox + 0.5 - r;
      if (dxCenter * dxCenter + dyCenter * dyCenter <= r2) {
        if (runStart === -1) {
          runStart = ox;
        }
        runEnd = ox;
      }
    }

    if (runStart !== -1) {
      spans.push({
        dy: oy - half,
        xStart: runStart - half,
        width: runEnd - runStart + 1,
      });
    }
  }

  diskSpanCache.set(s, spans);
  return spans;
}

function stampCircleAlongLine(
  from: Point,
  to: Point,
  size: number,
  applySpan: (x: number, y: number, width: number) => void,
): void {
  const spans = getDiskSpans(size);
  for (const pt of rasterizeLinePoints(from.x, from.y, to.x, to.y)) {
    for (const span of spans) {
      applySpan(pt.x + span.xStart, pt.y + span.dy, span.width);
    }
  }
}

/**
 * Draws crisp, un-antialiased circular pixel stamps between two points so Flood Fill
 * does not encounter fuzzy edge artifacts.
 */
export function drawCircleStampLine(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  size: number,
  color: string,
): void {
  ctx.fillStyle = color;
  stampCircleAlongLine(from, to, size, (x, y, width) => ctx.fillRect(x, y, width, 1));
}

/**
 * Clears circular pixel regions along a line back to full transparency (alpha = 0).
 */
export function eraseCircleStampLine(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  size: number,
): void {
  stampCircleAlongLine(from, to, size, (x, y, width) => ctx.clearRect(x, y, width, 1));
}
