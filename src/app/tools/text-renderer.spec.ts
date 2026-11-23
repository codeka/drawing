import { wrapTextLines } from './text-renderer';

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
