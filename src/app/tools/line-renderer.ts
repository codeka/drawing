import { LineCap, LineDraft, Point } from '../models/tool.model';
import { isVisibleColor } from './shape-renderer';

const SQUARE_DOT_CAPS = new Set<LineCap>(['flat', 'square', 'bar']);

function getHollowArrowMetrics(t: number, headLength: number, headHalfWidth: number) {
  const length = headLength * 1.15;
  const halfWidth = headHalfWidth * 1.15;
  const strokeWidth = Math.max(1, Math.min(t, length * 0.16));
  return { length, halfWidth, strokeWidth };
}

function getCapPullback(cap: LineCap, t: number, headLength: number): number {
  switch (cap) {
    case 'arrow':
      return headLength * 0.85;
    case 'stealth-arrow':
      return headLength * 0.65;
    case 'open-arrow':
    case 'bar':
      return t * 0.5;
    case 'hollow-arrow': {
      const { length, strokeWidth } = getHollowArrowMetrics(t, headLength, 0);
      return length - strokeWidth * 0.25;
    }
    default:
      return 0;
  }
}

function drawShaft(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  ux: number,
  uy: number,
): void {
  const remaining = (ex - sx) * ux + (ey - sy) * uy;
  if (remaining <= 0.001) {
    return;
  }
  ctx.beginPath();
  ctx.lineCap = 'butt';
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.stroke();
}

function drawEndpointCap(
  ctx: CanvasRenderingContext2D,
  cap: LineCap,
  x: number,
  y: number,
  dirAngle: number,
  t: number,
  headLength: number,
  headHalfWidth: number,
): void {
  switch (cap) {
    case 'flat':
      return;

    case 'round':
      ctx.beginPath();
      ctx.arc(x, y, t / 2, 0, Math.PI * 2);
      ctx.fill();
      return;

    case 'circle': {
      const radius = Math.max(5, t * 1.05 + 2);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    case 'arrow':
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(dirAngle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-headLength, -headHalfWidth);
      ctx.lineTo(-headLength, headHalfWidth);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;

    case 'stealth-arrow':
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(dirAngle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-1.15 * headLength, -1.05 * headHalfWidth);
      ctx.lineTo(-0.75 * headLength, 0);
      ctx.lineTo(-1.15 * headLength, 1.05 * headHalfWidth);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;

    case 'open-arrow':
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(dirAngle);
      ctx.translate(-t / 2, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = t;
      ctx.beginPath();
      ctx.moveTo(-0.85 * headLength, -1.05 * headHalfWidth);
      ctx.lineTo(0, 0);
      ctx.lineTo(-0.85 * headLength, 1.05 * headHalfWidth);
      ctx.stroke();
      ctx.restore();
      return;

    case 'hollow-arrow': {
      const { length, halfWidth, strokeWidth } = getHollowArrowMetrics(
        t,
        headLength,
        headHalfWidth,
      );
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(dirAngle);
      ctx.translate(-strokeWidth / 2, 0);
      ctx.lineWidth = strokeWidth;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-length + strokeWidth, -halfWidth);
      ctx.lineTo(-length + strokeWidth, halfWidth);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
      return;
    }

    case 'square': {
      const half = Math.max(5, t * 1.0 + 2);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(dirAngle);
      ctx.fillRect(-half, -half, half * 2, half * 2);
      ctx.restore();
      return;
    }

    case 'diamond': {
      const halfL = Math.max(6, t * 1.35 + 2.5);
      const halfW = Math.max(5, t * 1.0 + 2);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(dirAngle);
      ctx.beginPath();
      ctx.moveTo(halfL, 0);
      ctx.lineTo(0, halfW);
      ctx.lineTo(-halfL, 0);
      ctx.lineTo(0, -halfW);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }

    case 'bar': {
      const halfH = Math.max(6, t * 1.35 + 3);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(dirAngle);
      ctx.fillRect(-t, -halfH, t, halfH * 2);
      ctx.restore();
      return;
    }
  }
}

/**
 * Snaps `end` relative to `start` to the nearest 45-degree angle while preserving distance.
 */
export function snapLineEndPoint(start: Point, end: Point): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) {
    return end;
  }
  const snappedAngle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
  return {
    x: start.x + Math.cos(snappedAngle) * distance,
    y: start.y + Math.sin(snappedAngle) * distance,
  };
}

/**
 * Renders a straight line with independent start and end caps onto a Canvas 2D context.
 */
export function renderLineToCanvas(ctx: CanvasRenderingContext2D, line: LineDraft): void {
  if (!isVisibleColor(line.color) || line.thickness <= 0) {
    return;
  }

  const t = Math.max(1, line.thickness);
  const { start, end, color, startCap, endCap } = line;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);

  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = t;

  if (length < 0.001) {
    if (SQUARE_DOT_CAPS.has(startCap) && SQUARE_DOT_CAPS.has(endCap)) {
      ctx.fillRect(start.x - t / 2, start.y - t / 2, t, t);
    } else {
      ctx.beginPath();
      ctx.arc(start.x, start.y, t / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  const angle = Math.atan2(dy, dx);
  const ux = dx / length;
  const uy = dy / length;
  const headLength = Math.max(10, t * 2.5 + 4);
  const headHalfWidth = headLength * 0.48;

  const startPullback = getCapPullback(startCap, t, headLength);
  const endPullback = getCapPullback(endCap, t, headLength);

  drawShaft(
    ctx,
    start.x + startPullback * ux,
    start.y + startPullback * uy,
    end.x - endPullback * ux,
    end.y - endPullback * uy,
    ux,
    uy,
  );
  drawEndpointCap(ctx, startCap, start.x, start.y, angle + Math.PI, t, headLength, headHalfWidth);
  drawEndpointCap(ctx, endCap, end.x, end.y, angle, t, headLength, headHalfWidth);

  ctx.restore();
}
