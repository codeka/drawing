import { Point, Rect, ShapeDraft, ShapeType, TRANSPARENT_COLOR } from '../models/tool.model';

function createNormalizedStarPoints(): readonly Point[] {
  const raw: Point[] = [];
  const outerRadius = 1;
  const innerRadius = 0.381966;

  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    raw.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const pt of raw) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }

  const spanX = maxX - minX;
  const spanY = maxY - minY;
  return raw.map((pt) => ({
    x: (pt.x - minX) / spanX,
    y: (pt.y - minY) / spanY,
  }));
}

const STAR_POINTS = createNormalizedStarPoints();

const PLUS_POINTS: readonly Point[] = [
  { x: 1 / 3, y: 0 },
  { x: 2 / 3, y: 0 },
  { x: 2 / 3, y: 1 / 3 },
  { x: 1, y: 1 / 3 },
  { x: 1, y: 2 / 3 },
  { x: 2 / 3, y: 2 / 3 },
  { x: 2 / 3, y: 1 },
  { x: 1 / 3, y: 1 },
  { x: 1 / 3, y: 2 / 3 },
  { x: 0, y: 2 / 3 },
  { x: 0, y: 1 / 3 },
  { x: 1 / 3, y: 1 / 3 },
];

const ARROW_POINTS: readonly Point[] = [
  { x: 0, y: 0.28 },
  { x: 0.56, y: 0.28 },
  { x: 0.56, y: 0 },
  { x: 1, y: 0.5 },
  { x: 0.56, y: 1 },
  { x: 0.56, y: 0.72 },
  { x: 0, y: 0.72 },
];

function traceNormalizedPolygon(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
  rect: Rect,
): void {
  if (points.length === 0) {
    return;
  }
  const { x, y, width, height } = rect;
  ctx.moveTo(x + points[0].x * width, y + points[0].y * height);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(x + points[i].x * width, y + points[i].y * height);
  }
  ctx.closePath();
}

/**
 * Returns true if the given color represents a visible painted color rather than transparent.
 */
export function isVisibleColor(color: string): boolean {
  const normalized = color.trim().toLowerCase();
  return normalized.length > 0 && normalized !== TRANSPARENT_COLOR;
}

/**
 * Traces a closed vector path for `shapeType` strictly bounded within `rect`.
 */
export function traceShapePath(
  ctx: CanvasRenderingContext2D,
  shapeType: ShapeType,
  rect: Rect,
): void {
  const { x, y, width: w, height: h } = rect;
  ctx.beginPath();

  switch (shapeType) {
    case 'rectangle':
      ctx.rect(x, y, w, h);
      break;

    case 'rounded-rectangle': {
      const r = Math.min(w, h) * 0.2;
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      break;
    }

    case 'ellipse':
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.closePath();
      break;

    case 'triangle':
      traceNormalizedPolygon(
        ctx,
        [
          { x: 0.5, y: 0 },
          { x: 1, y: 1 },
          { x: 0, y: 1 },
        ],
        rect,
      );
      break;

    case 'diamond':
      traceNormalizedPolygon(
        ctx,
        [
          { x: 0.5, y: 0 },
          { x: 1, y: 0.5 },
          { x: 0.5, y: 1 },
          { x: 0, y: 0.5 },
        ],
        rect,
      );
      break;

    case 'hexagon':
      traceNormalizedPolygon(
        ctx,
        [
          { x: 0.25, y: 0 },
          { x: 0.75, y: 0 },
          { x: 1, y: 0.5 },
          { x: 0.75, y: 1 },
          { x: 0.25, y: 1 },
          { x: 0, y: 0.5 },
        ],
        rect,
      );
      break;

    case 'star':
      traceNormalizedPolygon(ctx, STAR_POINTS, rect);
      break;

    case 'plus':
      traceNormalizedPolygon(ctx, PLUS_POINTS, rect);
      break;

    case 'heart':
      ctx.moveTo(x + 0.5 * w, y + h);
      ctx.bezierCurveTo(x + 0.15 * w, y + 0.78 * h, x, y + 0.56 * h, x, y + 0.35 * h);
      ctx.bezierCurveTo(x, y + 0.15 * h, x + 0.11 * w, y, x + 0.26 * w, y);
      ctx.bezierCurveTo(x + 0.4 * w, y, x + 0.48 * w, y + 0.11 * h, x + 0.5 * w, y + 0.26 * h);
      ctx.bezierCurveTo(x + 0.52 * w, y + 0.11 * h, x + 0.6 * w, y, x + 0.74 * w, y);
      ctx.bezierCurveTo(x + 0.89 * w, y, x + w, y + 0.15 * h, x + w, y + 0.35 * h);
      ctx.bezierCurveTo(x + w, y + 0.56 * h, x + 0.85 * w, y + 0.78 * h, x + 0.5 * w, y + h);
      ctx.closePath();
      break;

    case 'arrow':
      traceNormalizedPolygon(ctx, ARROW_POINTS, rect);
      break;
  }
}

/**
 * Renders a ShapeDraft onto the target Canvas 2D context, insetting strokes so the outer
 * boundary remains within `draft.rect`.
 */
export function renderShapeToCanvas(ctx: CanvasRenderingContext2D, draft: ShapeDraft): void {
  const { rect, shapeType, outlineWidth, outlineColor, fillColor } = draft;
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  const hasFill = isVisibleColor(fillColor);
  const hasOutline = isVisibleColor(outlineColor) && outlineWidth > 0;
  if (!hasFill && !hasOutline) {
    return;
  }

  const maxStroke = Math.max(1, Math.min(rect.width, rect.height) - 1);
  const effectiveOutlineWidth = hasOutline ? Math.min(outlineWidth, maxStroke) : 0;
  const inset = effectiveOutlineWidth / 2;
  const innerRect: Rect = {
    x: rect.x + inset,
    y: rect.y + inset,
    width: Math.max(0.5, rect.width - effectiveOutlineWidth),
    height: Math.max(0.5, rect.height - effectiveOutlineWidth),
  };

  ctx.save();
  traceShapePath(ctx, shapeType, innerRect);

  if (hasFill) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }

  if (hasOutline) {
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = effectiveOutlineWidth;
    ctx.lineJoin = shapeType === 'heart' ? 'round' : 'miter';
    ctx.miterLimit = 4;
    ctx.stroke();
  }

  ctx.restore();
}
