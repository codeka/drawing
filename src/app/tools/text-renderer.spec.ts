import { vi } from 'vitest';
import { TextDraft } from '../models/tool.model';
import {
  bakeTextToCanvas,
  buildCanvasFont,
  getBaselineOffset,
  getTextLineHeight,
  TEXT_BOX_PADDING,
  wrapTextLines,
} from './text-renderer';

describe('wrapTextLines', () => {
  const fixedCharMeasure = (segment: string): number => segment.length * 10;

  it('preserves explicit newlines including blank lines', () => {
    expect(wrapTextLines('first\n\nthird', 200, fixedCharMeasure)).toEqual([
      'first',
      '',
      'third',
    ]);
  });

  it('wraps words to stay within maxWidth', () => {
    expect(wrapTextLines('hello world from paint', 110, fixedCharMeasure)).toEqual([
      'hello world',
      'from paint',
    ]);
  });

  it('splits single unbroken words exceeding maxWidth by character', () => {
    expect(wrapTextLines('abcdefgh', 30, fixedCharMeasure)).toEqual([
      'abc',
      'def',
      'gh',
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(wrapTextLines('', 100, fixedCharMeasure)).toEqual([]);
  });
});

describe('buildCanvasFont', () => {
  it('formats plain, bold, italic, and bold-italic font strings', () => {
    expect(
      buildCanvasFont({ fontFamily: 'Arial, sans-serif', fontSize: 24, bold: false, italic: false }),
    ).toBe('24px Arial, sans-serif');
    expect(
      buildCanvasFont({ fontFamily: 'Arial, sans-serif', fontSize: 24, bold: true, italic: false }),
    ).toBe('bold 24px Arial, sans-serif');
    expect(
      buildCanvasFont({ fontFamily: 'Arial, sans-serif', fontSize: 24, bold: false, italic: true }),
    ).toBe('italic 24px Arial, sans-serif');
    expect(
      buildCanvasFont({ fontFamily: 'Arial, sans-serif', fontSize: 24, bold: true, italic: true }),
    ).toBe('italic bold 24px Arial, sans-serif');
  });
});

describe('getBaselineOffset', () => {
  it('computes CSS half-leading baseline offset for positive and negative leading', () => {
    // Positive leading (e.g. Arial 24px: 22 + 5 = 27 < lineHeight 30)
    expect(
      getBaselineOffset({ fontBoundingBoxAscent: 22, fontBoundingBoxDescent: 5 }, 24, 30),
    ).toBe(23.5);

    // Negative leading (e.g. Segoe UI 24px: 26 + 6 = 32 > lineHeight 30)
    expect(
      getBaselineOffset({ fontBoundingBoxAscent: 26, fontBoundingBoxDescent: 6 }, 24, 30),
    ).toBe(25);
  });

  it('falls back gracefully when fontBoundingBox metrics are omitted', () => {
    // fallbackAscent = 20 * 0.88 = 17.6, fallbackDescent = 20 * 0.22 = 4.4
    // (25 + 17.6 - 4.4) / 2 = 19.1
    expect(getBaselineOffset({}, 20, 25)).toBeCloseTo(19.1, 6);
  });
});

describe('bakeTextToCanvas', () => {
  function createMockCtx(fontMetrics?: {
    fontBoundingBoxAscent: number;
    fontBoundingBoxDescent: number;
  }) {
    return {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      fillText: vi.fn(),
      fillRect: vi.fn(),
      measureText: vi.fn((text: string) => ({
        width: text.length * 10,
        ...(fontMetrics ?? {}),
      })),
      font: '',
      fillStyle: '',
      textBaseline: 'alphabetic' as CanvasTextBaseline,
    };
  }

  function makeDraft(overrides: Partial<TextDraft> = {}): TextDraft {
    return {
      rect: { x: 10, y: 20, width: 300, height: 120 },
      text: 'Hello',
      fontFamily: 'Georgia, serif',
      fontSize: 24,
      bold: false,
      italic: false,
      underline: false,
      color: '#ed1c24',
      ...overrides,
    };
  }

  it('does nothing for empty text', () => {
    const ctx = createMockCtx({ fontBoundingBoxAscent: 22, fontBoundingBoxDescent: 5 });
    bakeTextToCanvas(ctx as unknown as CanvasRenderingContext2D, makeDraft({ text: '' }));
    expect(ctx.save).not.toHaveBeenCalled();
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it('uses alphabetic baseline with CSS half-leading for single and multiline text', () => {
    const ctx = createMockCtx({ fontBoundingBoxAscent: 22, fontBoundingBoxDescent: 5 });
    const lineHeight = getTextLineHeight(24);
    bakeTextToCanvas(
      ctx as unknown as CanvasRenderingContext2D,
      makeDraft({ text: 'Bold Italic\nSecond', bold: true, italic: true, underline: false }),
    );

    expect(ctx.font).toBe('italic bold 24px Georgia, serif');
    expect(ctx.fillStyle).toBe('#ed1c24');
    expect(ctx.textBaseline).toBe('alphabetic');
    // baselineOffset = (30 + 22 - 5) / 2 = 23.5
    expect(ctx.fillText).toHaveBeenNthCalledWith(
      1,
      'Bold Italic',
      10 + TEXT_BOX_PADDING,
      20 + TEXT_BOX_PADDING + 23.5,
    );
    expect(ctx.fillText).toHaveBeenNthCalledWith(
      2,
      'Second',
      10 + TEXT_BOX_PADDING,
      20 + TEXT_BOX_PADDING + lineHeight + 23.5,
    );
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('draws underlines for non-empty lines, skips blank lines, and trims trailing spaces', () => {
    const ctx = createMockCtx({ fontBoundingBoxAscent: 26, fontBoundingBoxDescent: 6 });
    const fontSize = 24;
    const lineHeight = getTextLineHeight(fontSize);

    bakeTextToCanvas(
      ctx as unknown as CanvasRenderingContext2D,
      makeDraft({
        text: 'Hi  \n\n   \nWorld',
        fontSize,
        bold: true,
        underline: true,
      }),
    );

    // Line 0: 'Hi  ' -> trimmed 'Hi' (width 20)
    // Line 1: '' -> skipped
    // Line 2: '   ' -> trimmed '' -> skipped
    // Line 3: 'World' -> width 50
    expect(ctx.fillText).toHaveBeenCalledTimes(4);
    expect(ctx.fillRect).toHaveBeenCalledTimes(2);

    // baselineOffset = (30 + 26 - 6) / 2 = 25
    // thickness = max(1, round(24 * 0.095)) = 2
    // gap = max(1, round(24 * 0.08)) = 2
    // offset = min(30 - 2, round(25 + 2)) = 27
    expect(ctx.fillRect).toHaveBeenNthCalledWith(
      1,
      10 + TEXT_BOX_PADDING,
      20 + TEXT_BOX_PADDING + 27,
      20,
      2,
    );
    expect(ctx.fillRect).toHaveBeenNthCalledWith(
      2,
      10 + TEXT_BOX_PADDING,
      20 + TEXT_BOX_PADDING + 3 * lineHeight + 27,
      50,
      2,
    );
  });

  it('falls back gracefully when measureText omits fontBoundingBox metrics', () => {
    const ctx = createMockCtx(undefined);
    bakeTextToCanvas(
      ctx as unknown as CanvasRenderingContext2D,
      makeDraft({ text: 'Fallback', fontSize: 20, underline: true }),
    );

    // baselineOffset = (25 + 17.6 - 4.4) / 2 = 19.1
    // thickness = max(1, round(20 * 0.065)) = 1, gap = round(1.6) = 2
    // offset = min(25 - 1, round(19.1 + 2)) = 21
    expect(ctx.fillText).toHaveBeenCalledWith(
      'Fallback',
      10 + TEXT_BOX_PADDING,
      20 + TEXT_BOX_PADDING + 19.1,
    );
    expect(ctx.fillRect).toHaveBeenCalledWith(
      10 + TEXT_BOX_PADDING,
      20 + TEXT_BOX_PADDING + 21,
      80,
      1,
    );
  });
});
