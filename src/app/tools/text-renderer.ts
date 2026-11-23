import { TextDraft } from '../models/tool.model';

export const TEXT_BOX_PADDING = 4;

export function getTextLineHeight(fontSize: number): number {
  return Math.round(fontSize * 1.25);
}

/**
 * Computes the alphabetic baseline Y offset from the top of a CSS line box,
 * matching CSS half-leading vertical alignment.
 */
export function getBaselineOffset(
  metrics: Partial<TextMetrics>,
  fontSize: number,
  lineHeight: number,
): number {
  const ascent = metrics.fontBoundingBoxAscent;
  const descent = metrics.fontBoundingBoxDescent;
  if (
    typeof ascent === 'number' &&
    typeof descent === 'number' &&
    Number.isFinite(ascent) &&
    Number.isFinite(descent) &&
    ascent + descent > 0
  ) {
    return (lineHeight + ascent - descent) / 2;
  }

  const fallbackAscent = fontSize * 0.88;
  const fallbackDescent = fontSize * 0.22;
  return (lineHeight + fallbackAscent - fallbackDescent) / 2;
}

/**
 * Formats a CSS/Canvas 2D font string in valid shorthand order.
 */
export function buildCanvasFont(
  draft: Pick<TextDraft, 'fontFamily' | 'fontSize' | 'bold' | 'italic'>,
): string {
  const parts: string[] = [];
  if (draft.italic) {
    parts.push('italic');
  }
  if (draft.bold) {
    parts.push('bold');
  }
  parts.push(`${draft.fontSize}px`, draft.fontFamily);
  return parts.join(' ');
}

/**
 * Wraps multiline text to fit within maxWidth, preserving explicit newlines and
 * breaking long unbroken words by character to match CSS pre-wrap + break-word.
 */
export function wrapTextLines(
  text: string,
  maxWidth: number,
  measureWidth: (segment: string) => number,
): string[] {
  if (text.length === 0) {
    return [];
  }

  const lines: string[] = [];
  const paragraphs = text.split('\n');

  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      lines.push('');
      continue;
    }

    const tokens = paragraph.match(/\S+|\s+/g) ?? [];
    let currentLine = '';

    for (const token of tokens) {
      const candidate = currentLine + token;
      if (measureWidth(candidate) <= maxWidth) {
        currentLine = candidate;
        continue;
      }

      if (/^\s+$/.test(token)) {
        if (currentLine.length > 0) {
          lines.push(currentLine);
          currentLine = '';
          continue;
        }
      }

      if (currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = '';
        if (measureWidth(token) <= maxWidth) {
          currentLine = token;
          continue;
        }
      }

      for (const ch of token) {
        const next = currentLine + ch;
        if (currentLine.length > 0 && measureWidth(next) > maxWidth) {
          lines.push(currentLine);
          currentLine = ch;
        } else {
          currentLine = next;
        }
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }
  }

  return lines;
}

/**
 * Renders a staged TextDraft directly onto the target 2D canvas, clipped to its box.
 */
export function bakeTextToCanvas(ctx: CanvasRenderingContext2D, draft: TextDraft): void {
  if (draft.text.length === 0) {
    return;
  }

  const { rect, fontSize, color, text, underline } = draft;

  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.width, rect.height);
  ctx.clip();

  ctx.font = buildCanvasFont(draft);
  ctx.fillStyle = color;
  ctx.textBaseline = 'alphabetic';

  const maxWidth = Math.max(1, rect.width - TEXT_BOX_PADDING * 2);
  const lineHeight = getTextLineHeight(fontSize);
  const lines = wrapTextLines(text, maxWidth, (segment) => ctx.measureText(segment).width);

  const sampleMetrics = ctx.measureText('M');
  const baselineOffset = getBaselineOffset(sampleMetrics, fontSize, lineHeight);

  let underlineOffset = 0;
  let underlineThickness = 1;
  if (underline) {
    underlineThickness = Math.max(1, Math.round(fontSize * (draft.bold ? 0.095 : 0.065)));
    const underlineGap = Math.max(1, Math.round(fontSize * 0.08));
    underlineOffset = Math.min(
      lineHeight - underlineThickness,
      Math.round(baselineOffset + underlineGap),
    );
  }

  lines.forEach((line, index) => {
    const lineX = rect.x + TEXT_BOX_PADDING;
    const lineTopY = rect.y + TEXT_BOX_PADDING + index * lineHeight;
    ctx.fillText(line, lineX, lineTopY + baselineOffset);

    if (underline) {
      const underlineText = line.trimEnd();
      if (underlineText.length > 0) {
        const underlineWidth = ctx.measureText(underlineText).width;
        if (underlineWidth > 0) {
          ctx.fillRect(lineX, lineTopY + underlineOffset, underlineWidth, underlineThickness);
        }
      }
    }
  });

  ctx.restore();
}
