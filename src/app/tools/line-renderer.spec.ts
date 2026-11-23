import { vi } from 'vitest';
import { LINE_CAP_DEFINITIONS, LineDraft, TRANSPARENT_COLOR } from '../models/tool.model';
import { renderLineToCanvas, snapLineEndPoint } from './line-renderer';

function createMockCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt' as CanvasLineCap,
    lineJoin: 'miter' as CanvasLineJoin,
  };
}

function makeLine(overrides: Partial<LineDraft> = {}): LineDraft {
  return {
    start: { x: 20, y: 30 },
    end: { x: 180, y: 30 },
    color: '#000000',
    thickness: 8,
    startCap: 'round',
    endCap: 'round',
    ...overrides,
  };
}

describe('snapLineEndPoint', () => {
  it('snaps to nearest 45-degree angle while preserving length', () => {
    const snappedHorizontal = snapLineEndPoint({ x: 100, y: 100 }, { x: 200, y: 112 });
    expect(snappedHorizontal.x).toBeCloseTo(200.717, 2);
    expect(snappedHorizontal.y).toBeCloseTo(100, 5);

    const snappedDiag = snapLineEndPoint({ x: 0, y: 0 }, { x: 100, y: 90 });
    const expected = Math.hypot(100, 90) * Math.SQRT1_2;
    expect(snappedDiag.x).toBeCloseTo(expected, 5);
    expect(snappedDiag.y).toBeCloseTo(expected, 5);

    expect(snapLineEndPoint({ x: 10, y: 20 }, { x: 10, y: 20 })).toEqual({ x: 10, y: 20 });
  });
});

describe('renderLineToCanvas', () => {
  it('skips rendering when color is transparent or thickness is non-positive', () => {
    const ctx = createMockCtx();
    renderLineToCanvas(
      ctx as unknown as CanvasRenderingContext2D,
      makeLine({ color: TRANSPARENT_COLOR }),
    );
    renderLineToCanvas(ctx as unknown as CanvasRenderingContext2D, makeLine({ thickness: 0 }));
    expect(ctx.save).not.toHaveBeenCalled();
  });

  it('draws square or circular dot on degenerate zero-length line depending on caps', () => {
    const roundCtx = createMockCtx();
    renderLineToCanvas(
      roundCtx as unknown as CanvasRenderingContext2D,
      makeLine({ end: { x: 20, y: 30 }, startCap: 'round', endCap: 'flat', thickness: 8 }),
    );
    expect(roundCtx.arc).toHaveBeenCalledWith(20, 30, 4, 0, Math.PI * 2);
    expect(roundCtx.fill).toHaveBeenCalledTimes(1);

    const flatCtx = createMockCtx();
    renderLineToCanvas(
      flatCtx as unknown as CanvasRenderingContext2D,
      makeLine({ end: { x: 20, y: 30 }, startCap: 'flat', endCap: 'square', thickness: 8 }),
    );
    expect(flatCtx.fillRect).toHaveBeenCalledWith(16, 26, 8, 8);
  });

  it('renders all 10 caps cleanly on both start and end and supports mixed caps', () => {
    for (const cap of LINE_CAP_DEFINITIONS) {
      const startCtx = createMockCtx();
      renderLineToCanvas(
        startCtx as unknown as CanvasRenderingContext2D,
        makeLine({ startCap: cap.id, endCap: 'flat' }),
      );
      expect(startCtx.save).toHaveBeenCalled();
      expect(startCtx.restore).toHaveBeenCalled();

      const endCtx = createMockCtx();
      renderLineToCanvas(
        endCtx as unknown as CanvasRenderingContext2D,
        makeLine({ startCap: 'flat', endCap: cap.id }),
      );
      expect(endCtx.save).toHaveBeenCalled();
      expect(endCtx.restore).toHaveBeenCalled();
    }

    // Mixed caps: round start + flat end draws butt shaft + 1 round end dot
    const roundFlatCtx = createMockCtx();
    renderLineToCanvas(
      roundFlatCtx as unknown as CanvasRenderingContext2D,
      makeLine({ startCap: 'round', endCap: 'flat' }),
    );
    expect(roundFlatCtx.stroke).toHaveBeenCalledTimes(1);
    expect(roundFlatCtx.arc).toHaveBeenCalledTimes(1);
    expect(roundFlatCtx.fill).toHaveBeenCalledTimes(1);

    // Arrow at both ends draws 2 arrowheads
    const bothArrowCtx = createMockCtx();
    renderLineToCanvas(
      bothArrowCtx as unknown as CanvasRenderingContext2D,
      makeLine({ startCap: 'arrow', endCap: 'arrow' }),
    );
    expect(bothArrowCtx.stroke).toHaveBeenCalledTimes(1);
    expect(bothArrowCtx.fill).toHaveBeenCalledTimes(2);

    // Circle start + Hollow arrow end draws shaft, circle fill, and hollow triangle stroke
    const mixedCtx = createMockCtx();
    renderLineToCanvas(
      mixedCtx as unknown as CanvasRenderingContext2D,
      makeLine({ startCap: 'circle', endCap: 'hollow-arrow' }),
    );
    expect(mixedCtx.fill).toHaveBeenCalledTimes(1);
    expect(mixedCtx.stroke).toHaveBeenCalledTimes(2);
  });

  it('omits shaft when combined start and end pullback meets or exceeds length', () => {
    const shortDoubleArrowCtx = createMockCtx();
    renderLineToCanvas(
      shortDoubleArrowCtx as unknown as CanvasRenderingContext2D,
      makeLine({
        start: { x: 10, y: 10 },
        end: { x: 25, y: 10 },
        thickness: 8,
        startCap: 'arrow',
        endCap: 'arrow',
      }),
    );
    expect(shortDoubleArrowCtx.stroke).not.toHaveBeenCalled();
    expect(shortDoubleArrowCtx.fill).toHaveBeenCalledTimes(2);
  });
});
