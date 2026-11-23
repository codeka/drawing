import { floodFill, parseHexColor, PixelBuffer } from './flood-fill';

function createBuffer(width: number, height: number): PixelBuffer {
  return {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
  };
}

function setPixel(
  buffer: PixelBuffer,
  x: number,
  y: number,
  rgba: readonly [number, number, number, number],
): void {
  const idx = (y * buffer.width + x) * 4;
  buffer.data[idx] = rgba[0];
  buffer.data[idx + 1] = rgba[1];
  buffer.data[idx + 2] = rgba[2];
  buffer.data[idx + 3] = rgba[3];
}

function getPixel(buffer: PixelBuffer, x: number, y: number): [number, number, number, number] {
  const idx = (y * buffer.width + x) * 4;
  return [
    buffer.data[idx],
    buffer.data[idx + 1],
    buffer.data[idx + 2],
    buffer.data[idx + 3],
  ];
}

describe('parseHexColor', () => {
  it('parses 6-digit and 3-digit hex strings', () => {
    expect(parseHexColor('#ed1c24')).toEqual([237, 28, 36, 255]);
    expect(parseHexColor('#0f8')).toEqual([0, 255, 136, 255]);
  });
});

describe('floodFill', () => {
  it('fills an entire transparent buffer', () => {
    const buffer = createBuffer(4, 3);
    const changed = floodFill(buffer, 1, 1, [255, 0, 0, 255]);

    expect(changed).toBe(true);
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 4; x++) {
        expect(getPixel(buffer, x, y)).toEqual([255, 0, 0, 255]);
      }
    }
  });

  it('respects closed boundaries and leaves outside pixels untouched', () => {
    const buffer = createBuffer(5, 5);
    const black = [0, 0, 0, 255] as const;

    for (let i = 0; i < 5; i++) {
      setPixel(buffer, i, 0, black);
      setPixel(buffer, i, 4, black);
      setPixel(buffer, 0, i, black);
      setPixel(buffer, 4, i, black);
    }

    // Add an extra barrier splitting the interior at x = 2
    for (let y = 1; y <= 3; y++) {
      setPixel(buffer, 2, y, black);
    }

    const changed = floodFill(buffer, 1, 2, [0, 162, 232, 255]);
    expect(changed).toBe(true);

    expect(getPixel(buffer, 1, 1)).toEqual([0, 162, 232, 255]);
    expect(getPixel(buffer, 1, 3)).toEqual([0, 162, 232, 255]);
    expect(getPixel(buffer, 2, 2)).toEqual([0, 0, 0, 255]);
    expect(getPixel(buffer, 3, 2)).toEqual([0, 0, 0, 0]);
  });

  it('treats transparent pixels with differing RGB channels identically', () => {
    const buffer = createBuffer(3, 1);
    setPixel(buffer, 0, 0, [0, 0, 0, 0]);
    setPixel(buffer, 1, 0, [120, 45, 200, 0]);
    setPixel(buffer, 2, 0, [255, 255, 255, 0]);

    const changed = floodFill(buffer, 0, 0, [34, 177, 76, 255]);
    expect(changed).toBe(true);
    expect(getPixel(buffer, 0, 0)).toEqual([34, 177, 76, 255]);
    expect(getPixel(buffer, 1, 0)).toEqual([34, 177, 76, 255]);
    expect(getPixel(buffer, 2, 0)).toEqual([34, 177, 76, 255]);
  });

  it('returns false without modifying when target already matches fill color', () => {
    const buffer = createBuffer(2, 2);
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        setPixel(buffer, x, y, [10, 20, 30, 255]);
      }
    }

    expect(floodFill(buffer, 1, 1, [10, 20, 30, 255])).toBe(false);
    expect(getPixel(buffer, 0, 0)).toEqual([10, 20, 30, 255]);
  });

  it('returns false safely for out-of-bounds coordinates', () => {
    const buffer = createBuffer(3, 3);
    expect(floodFill(buffer, -1, 0, [255, 0, 0, 255])).toBe(false);
    expect(floodFill(buffer, 3, 2, [255, 0, 0, 255])).toBe(false);
    expect(floodFill(buffer, 0, 3, [255, 0, 0, 255])).toBe(false);
  });
});
