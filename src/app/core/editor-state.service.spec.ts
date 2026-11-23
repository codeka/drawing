import { TestBed } from '@angular/core/testing';
import { DEFAULT_CANVAS_HEIGHT, DEFAULT_CANVAS_WIDTH } from '../models/tool.model';
import { EditorStateService } from './editor-state.service';

describe('EditorStateService', () => {
  let service: EditorStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EditorStateService);
  });

  it('initializes with 1280x1024 transparent defaults, pencil tool, and black color', () => {
    expect(service.canvasWidth()).toBe(DEFAULT_CANVAS_WIDTH);
    expect(service.canvasHeight()).toBe(DEFAULT_CANVAS_HEIGHT);
    expect(service.activeTool()).toBe('pencil');
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
});
