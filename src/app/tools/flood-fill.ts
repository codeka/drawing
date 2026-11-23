export interface PixelBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export type RgbaColor = readonly [number, number, number, number];

/**
 * Converts a CSS hex color (#rgb, #rrggbb, or #rrggbbaa) to an RGBA tuple [0-255].
 */
export function parseHexColor(hex: string): [number, number, number, number] {
  const clean = hex.trim().replace(/^#/, '');

  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
      255,
    ];
  }

  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
      255,
    ];
  }

  if (/^[0-9a-fA-F]{8}$/.test(clean)) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
      parseInt(clean.slice(6, 8), 16),
    ];
  }

  return [0, 0, 0, 255];
}

/**
 * Iterative scanline flood fill operating directly on an RGBA pixel buffer.
 * Fully transparent pixels (alpha === 0) are treated as equivalent regardless of RGB values.
 * Returns true if any pixel was modified.
 */
export function floodFill(
  buffer: PixelBuffer,
  startX: number,
  startY: number,
  fillRgba: RgbaColor,
): boolean {
  const sx = Math.floor(startX);
  const sy = Math.floor(startY);
  const { data, width, height } = buffer;

  if (sx < 0 || sx >= width || sy < 0 || sy >= height) {
    return false;
  }

  const startIdx = (sy * width + sx) * 4;
  const targetR = data[startIdx];
  const targetG = data[startIdx + 1];
  const targetB = data[startIdx + 2];
  const targetA = data[startIdx + 3];
  const [fillR, fillG, fillB, fillA] = fillRgba;

  if (targetA === 0 && fillA === 0) {
    return false;
  }

  if (targetA === fillA && targetR === fillR && targetG === fillG && targetB === fillB) {
    return false;
  }

  const matchesTarget = (idx: number): boolean => {
    if (targetA === 0) {
      return data[idx + 3] === 0;
    }
    return (
      data[idx] === targetR &&
      data[idx + 1] === targetG &&
      data[idx + 2] === targetB &&
      data[idx + 3] === targetA
    );
  };

  const stack: number[] = [sx, sy];

  while (stack.length > 0) {
    const y = stack.pop()!;
    const x = stack.pop()!;
    const rowOffset = y * width;

    if (!matchesTarget((rowOffset + x) * 4)) {
      continue;
    }

    let left = x;
    while (left > 0 && matchesTarget((rowOffset + left - 1) * 4)) {
      left--;
    }

    let right = x;
    while (right < width - 1 && matchesTarget((rowOffset + right + 1) * 4)) {
      right++;
    }

    for (let cx = left; cx <= right; cx++) {
      const idx = (rowOffset + cx) * 4;
      data[idx] = fillR;
      data[idx + 1] = fillG;
      data[idx + 2] = fillB;
      data[idx + 3] = fillA;
    }

    for (const ny of [y - 1, y + 1]) {
      if (ny < 0 || ny >= height) {
        continue;
      }
      const nextRowOffset = ny * width;
      let inSpan = false;
      for (let cx = left; cx <= right; cx++) {
        const matches = matchesTarget((nextRowOffset + cx) * 4);
        if (matches && !inSpan) {
          stack.push(cx, ny);
          inSpan = true;
        } else if (!matches) {
          inSpan = false;
        }
      }
    }
  }

  return true;
}
