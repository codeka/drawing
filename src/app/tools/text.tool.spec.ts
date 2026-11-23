import { vi } from 'vitest';
import { TextDraft } from '../models/tool.model';
import { ToolContext } from './drawing-tool';
import { getTextLineHeight, TEXT_BOX_PADDING } from './text-renderer';
import { TextTool } from './text.tool';

function createToolContext(overrides: Partial<ToolContext> = {}): {
  ctx: ToolContext;
  getCapturedDraft: () => TextDraft | null;
} {
  let activeDraft: TextDraft | null = null;
  const ctx: ToolContext = {
    ctx: {} as CanvasRenderingContext2D,
    width: 800,
    height: 600,
    color: '#3f48d1',
    pencilSize: 8,
    eraserSize: 10,
    lineWidth: 8,
    lineStartCap: 'round',
    lineEndCap: 'round',
    shapeType: 'rectangle',
    shapeOutlineWidth: 8,
    shapeOutlineColor: '#000000',
    shapeFillColor: 'transparent',
    shapeInstant: false,
    shiftKey: false,
    textFontFamily: 'Georgia, serif',
    textFontSize: 36,
    textBold: true,
    textItalic: true,
    textUnderline: true,
    getTextDraft: () => activeDraft,
    setTextDraft: (draft) => {
      activeDraft = draft;
    },
    commitTextDraft: vi.fn(),
    setTextSelectionPreview: vi.fn(),
    getShapeDraft: () => null,
    setShapeDraft: vi.fn(),
    commitShapeDraft: vi.fn(),
    setShapeSelectionPreview: vi.fn(),
    setLinePreview: vi.fn(),
    ...overrides,
  };

  return {
    ctx,
    getCapturedDraft: () => activeDraft,
  };
}

describe('TextTool', () => {
  it('initializes click-created draft from ToolContext text options', () => {
    const tool = new TextTool();
    const { ctx, getCapturedDraft } = createToolContext();

    tool.onPointerDown({ x: 50, y: 60 }, ctx);
    tool.onPointerUp({ x: 52, y: 62 }, ctx);

    const draft = getCapturedDraft();
    expect(draft).toEqual({
      rect: { x: 52, y: 62, width: 240, height: 80 },
      text: '',
      fontFamily: 'Georgia, serif',
      fontSize: 36,
      bold: true,
      italic: true,
      underline: true,
      color: '#3f48d1',
    });
  });

  it('initializes drag-created draft from ToolContext text options and dragged rect', () => {
    const tool = new TextTool();
    const { ctx, getCapturedDraft } = createToolContext({
      textFontFamily: 'Consolas, monospace',
      textFontSize: 18,
      textBold: false,
      textItalic: true,
      textUnderline: false,
      color: '#ed1c24',
    });

    tool.onPointerDown({ x: 40, y: 50 }, ctx);
    tool.onPointerMove({ x: 300, y: 170 }, ctx);
    tool.onPointerUp({ x: 300, y: 170 }, ctx);

    expect(getCapturedDraft()).toEqual({
      rect: { x: 40, y: 50, width: 260, height: 120 },
      text: '',
      fontFamily: 'Consolas, monospace',
      fontSize: 18,
      bold: false,
      italic: true,
      underline: false,
      color: '#ed1c24',
    });
  });

  it('expands click-created box height to fit large default font sizes', () => {
    const tool = new TextTool();
    const largeFontSize = 96;
    const { ctx, getCapturedDraft } = createToolContext({
      textFontSize: largeFontSize,
    });

    tool.onPointerDown({ x: 20, y: 30 }, ctx);
    tool.onPointerUp({ x: 20, y: 30 }, ctx);

    const draft = getCapturedDraft();
    expect(draft?.rect.height).toBe(getTextLineHeight(largeFontSize) + TEXT_BOX_PADDING * 2);
  });
});
