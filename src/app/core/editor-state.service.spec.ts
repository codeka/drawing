import { TestBed } from '@angular/core/testing';
import {
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_ERASER_SIZE,
  DEFAULT_PENCIL_SIZE,
  MAX_BRUSH_SIZE,
  MIN_BRUSH_SIZE,
} from '../models/tool.model';
import { EditorStateService } from './editor-state.service';

describe('EditorStateService', () => {
  let service: EditorStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EditorStateService);
  });

  it('initializes with 1280x1024 defaults, pencil tool (1px), eraser (10px), and black color', () => {
    expect(service.canvasWidth()).toBe(DEFAULT_CANVAS_WIDTH);
    expect(service.canvasHeight()).toBe(DEFAULT_CANVAS_HEIGHT);
    expect(service.activeTool()).toBe('pencil');
    expect(service.pencilSize()).toBe(DEFAULT_PENCIL_SIZE);
    expect(service.eraserSize()).toBe(DEFAULT_ERASER_SIZE);
    expect(service.foregroundColor()).toBe('#000000');
    expect(service.fileName()).toBe('untitled.png');
    expect(service.activeTextDraft()).toBeNull();
  });

  it('updates activeTextDraft color live when foregroundColor changes', () => {
    service.activeTextDraft.set({
      rect: { x: 10, y: 20, width: 200, height: 80 },
      text: 'Hello',
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: 24,
      color: '#000000',
    });

    service.setForegroundColor('#ed1c24');

    expect(service.foregroundColor()).toBe('#ed1c24');
    expect(service.activeTextDraft()?.color).toBe('#ed1c24');
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
});
