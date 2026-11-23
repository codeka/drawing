import { TextDraft } from '../models/tool.model';

export const TEXT_BOX_PADDING = 4;

export function getTextLineHeight(fontSize: number): number {
  return Math.round(fontSize * 1.25);
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

  const { rect, fontSize, fontFamily, color, text } = draft;

  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.width, rect.height);
  ctx.clip();

  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';

  const maxWidth = Math.max(1, rect.width - TEXT_BOX_PADDING * 2);
  const lineHeight = getTextLineHeight(fontSize);
  const lines = wrapTextLines(text, maxWidth, (segment) => ctx.measureText(segment).width);

  lines.forEach((line, index) => {
    ctx.fillText(
      line,
      rect.x + TEXT_BOX_PADDING,
      rect.y + TEXT_BOX_PADDING + index * lineHeight,
    );
  });

  ctx.restore();
}
