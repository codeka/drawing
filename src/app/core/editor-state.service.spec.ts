import { TestBed } from '@angular/core/testing';
import {
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_ERASER_SIZE,
  DEFAULT_LINE_END_CAP,
  DEFAULT_LINE_START_CAP,
  DEFAULT_LINE_WIDTH,
  DEFAULT_PENCIL_SIZE,
  DEFAULT_SHAPE_FILL_COLOR,
  DEFAULT_SHAPE_OUTLINE_COLOR,
  DEFAULT_SHAPE_OUTLINE_WIDTH,
  DEFAULT_SHAPE_TYPE,
  DEFAULT_TEXT_FONT_FAMILY,
  DEFAULT_TEXT_FONT_SIZE,
  MAX_BRUSH_SIZE,
  MAX_TEXT_FONT_SIZE,
  MIN_BRUSH_SIZE,
  MIN_TEXT_FONT_SIZE,
} from '../models/tool.model';
import { EditorStateService } from './editor-state.service';

describe('EditorStateService', () => {
  let service: EditorStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EditorStateService);
  });

  it('initializes with 1280x1024 defaults, pencil tool, eraser, text defaults, and black color', () => {
    expect(service.canvasWidth()).toBe(DEFAULT_CANVAS_WIDTH);
    expect(service.canvasHeight()).toBe(DEFAULT_CANVAS_HEIGHT);
    expect(service.activeTool()).toBe('pencil');
    expect(service.pencilSize()).toBe(DEFAULT_PENCIL_SIZE);
    expect(service.eraserSize()).toBe(DEFAULT_ERASER_SIZE);
    expect(service.textFontFamily()).toBe(DEFAULT_TEXT_FONT_FAMILY);
    expect(service.textFontSize()).toBe(DEFAULT_TEXT_FONT_SIZE);
    expect(service.textBold()).toBe(false);
    expect(service.textItalic()).toBe(false);
    expect(service.textUnderline()).toBe(false);
    expect(service.foregroundColor()).toBe('#000000');
    expect(service.fileName()).toBe('untitled.png');
    expect(service.activeTextDraft()).toBeNull();
  });

  it('updates activeTextDraft color live when foregroundColor changes', () => {
    service.activeTextDraft.set({
      rect: { x: 10, y: 20, width: 200, height: 80 },
      text: 'Hello',
      fontFamily: DEFAULT_TEXT_FONT_FAMILY,
      fontSize: DEFAULT_TEXT_FONT_SIZE,
      bold: false,
      italic: false,
      underline: false,
      color: '#000000',
    });

    service.setForegroundColor('#ed1c24');

    expect(service.foregroundColor()).toBe('#ed1c24');
    expect(service.activeTextDraft()?.color).toBe('#ed1c24');
  });

  it('updates text option defaults when no draft is active and validates values', () => {
    service.setTextFontFamily('Georgia, serif');
    service.setTextFontSize(36);
    service.toggleTextBold();
    service.toggleTextItalic();
    service.toggleTextUnderline();

    expect(service.textFontFamily()).toBe('Georgia, serif');
    expect(service.textFontSize()).toBe(36);
    expect(service.textBold()).toBe(true);
    expect(service.textItalic()).toBe(true);
    expect(service.textUnderline()).toBe(true);
    expect(service.activeTextDraft()).toBeNull();

    service.setTextFontFamily('   ');
    expect(service.textFontFamily()).toBe('Georgia, serif');

    service.setTextFontSize(2);
    expect(service.textFontSize()).toBe(MIN_TEXT_FONT_SIZE);

    service.setTextFontSize(999);
    expect(service.textFontSize()).toBe(MAX_TEXT_FONT_SIZE);

    service.setTextFontSize(18.6);
    expect(service.textFontSize()).toBe(19);

    service.setTextFontSize(Number.NaN);
    expect(service.textFontSize()).toBe(19);
  });

  it('updates both defaults and activeTextDraft live when text options change', () => {
    service.activeTextDraft.set({
      rect: { x: 10, y: 20, width: 240, height: 80 },
      text: 'Sample',
      fontFamily: DEFAULT_TEXT_FONT_FAMILY,
      fontSize: DEFAULT_TEXT_FONT_SIZE,
      bold: false,
      italic: false,
      underline: false,
      color: '#000000',
    });

    service.setTextFontFamily('Consolas, monospace');
    service.setTextFontSize(48);
    service.toggleTextBold();
    service.toggleTextItalic();
    service.toggleTextUnderline();

    expect(service.textFontFamily()).toBe('Consolas, monospace');
    expect(service.textFontSize()).toBe(48);
    expect(service.textBold()).toBe(true);
    expect(service.textItalic()).toBe(true);
    expect(service.textUnderline()).toBe(true);

    expect(service.activeTextDraft()).toEqual({
      rect: { x: 10, y: 20, width: 240, height: 80 },
      text: 'Sample',
      fontFamily: 'Consolas, monospace',
      fontSize: 48,
      bold: true,
      italic: true,
      underline: true,
      color: '#000000',
    });

    service.setTextBold(false);
    service.setTextItalic(false);
    service.setTextUnderline(false);

    expect(service.textBold()).toBe(false);
    expect(service.textItalic()).toBe(false);
    expect(service.textUnderline()).toBe(false);
    expect(service.activeTextDraft()?.bold).toBe(false);
    expect(service.activeTextDraft()?.italic).toBe(false);
    expect(service.activeTextDraft()?.underline).toBe(false);
  });

  it('clamps pencil and eraser sizes independently and ignores non-finite values', () => {
    service.setPencilSize(0);
    expect(service.pencilSize()).toBe(MIN_BRUSH_SIZE);

    service.setPencilSize(999);
    expect(service.pencilSize()).toBe(MAX_BRUSH_SIZE);

    service.setPencilSize(14.6);
    expect(service.pencilSize()).toBe(15);

    service.setPencilSize(Number.NaN);
    expect(service.pencilSize()).toBe(15);
    expect(service.eraserSize()).toBe(DEFAULT_ERASER_SIZE);

    service.setEraserSize(25);
    expect(service.eraserSize()).toBe(25);
    expect(service.pencilSize()).toBe(15);

    service.setEraserSize(-5);
    expect(service.eraserSize()).toBe(MIN_BRUSH_SIZE);
  });

  it('initializes line and shape defaults, clamps widths, and updates activeShapeDraft live', () => {
    expect(service.lineWidth()).toBe(DEFAULT_LINE_WIDTH);
    expect(service.lineStartCap()).toBe(DEFAULT_LINE_START_CAP);
    expect(service.lineEndCap()).toBe(DEFAULT_LINE_END_CAP);
    expect(service.activeLineCapSlot()).toBe('end');
    expect(service.activeLineCap()).toBe(DEFAULT_LINE_END_CAP);
    expect(service.shapeType()).toBe(DEFAULT_SHAPE_TYPE);
    expect(service.shapeOutlineWidth()).toBe(DEFAULT_SHAPE_OUTLINE_WIDTH);
    expect(service.shapeOutlineColor()).toBe(DEFAULT_SHAPE_OUTLINE_COLOR);
    expect(service.shapeFillColor()).toBe(DEFAULT_SHAPE_FILL_COLOR);
    expect(service.shapeInstant()).toBe(false);
    expect(service.activeShapeColorSlot()).toBe('outline');
    expect(service.activeShapeDraft()).toBeNull();

    service.setShapeInstant(true);
    expect(service.shapeInstant()).toBe(true);
    service.setShapeInstant(false);
    expect(service.shapeInstant()).toBe(false);

    expect(service.hasUnsavedChanges()).toBe(false);
    service.markDirty();
    expect(service.hasUnsavedChanges()).toBe(true);
    service.clearDirty();
    expect(service.hasUnsavedChanges()).toBe(false);

    service.setLineWidth(0);
    expect(service.lineWidth()).toBe(MIN_BRUSH_SIZE);
    service.setLineWidth(999);
    expect(service.lineWidth()).toBe(MAX_BRUSH_SIZE);
    service.setLineWidth(Number.NaN);
    expect(service.lineWidth()).toBe(MAX_BRUSH_SIZE);
    service.setActiveLineCap('stealth-arrow');
    expect(service.lineEndCap()).toBe('stealth-arrow');
    expect(service.lineStartCap()).toBe(DEFAULT_LINE_START_CAP);
    service.setActiveLineCapSlot('start');
    service.setActiveLineCap('circle');
    expect(service.lineStartCap()).toBe('circle');
    expect(service.activeLineCap()).toBe('circle');
    service.setLineStartCap('arrow');
    expect(service.lineStartCap()).toBe('arrow');
    service.setLineEndCap('hollow-arrow');
    expect(service.lineEndCap()).toBe('hollow-arrow');

    service.activeShapeDraft.set({
      rect: { x: 10, y: 20, width: 140, height: 140 },
      shapeType: DEFAULT_SHAPE_TYPE,
      outlineWidth: DEFAULT_SHAPE_OUTLINE_WIDTH,
      outlineColor: DEFAULT_SHAPE_OUTLINE_COLOR,
      fillColor: DEFAULT_SHAPE_FILL_COLOR,
    });

    service.setShapeType('heart');
    service.setShapeOutlineWidth(12);
    service.setActiveShapeColor('#ed1c24');
    service.setActiveShapeColorSlot('fill');
    service.setActiveShapeColor('#23cc56');

    expect(service.shapeType()).toBe('heart');
    expect(service.shapeOutlineWidth()).toBe(12);
    expect(service.shapeOutlineColor()).toBe('#ed1c24');
    expect(service.shapeFillColor()).toBe('#23cc56');
    expect(service.activeShapeDraft()).toEqual({
      rect: { x: 10, y: 20, width: 140, height: 140 },
      shapeType: 'heart',
      outlineWidth: 12,
      outlineColor: '#ed1c24',
      fillColor: '#23cc56',
    });

    service.setShapeOutlineWidth(0);
    expect(service.shapeOutlineWidth()).toBe(MIN_BRUSH_SIZE);
    service.setShapeOutlineWidth(Number.NaN);
    expect(service.shapeOutlineWidth()).toBe(MIN_BRUSH_SIZE);
  });
});
