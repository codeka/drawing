import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CANVAS_WIDTH,
  MAX_CANVAS_SIZE,
  MIN_CANVAS_SIZE,
  TRANSPARENT_COLOR,
} from '../models/tool.model';
import { CanvasDocumentService } from './canvas-document.service';
import { EditorStateService } from './editor-state.service';

describe('CanvasDocumentService', () => {
  let service: CanvasDocumentService;
  let editorState: EditorStateService;
  let mockCtx: {
    clearRect: ReturnType<typeof vi.fn>;
    fillRect: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    restore: ReturnType<typeof vi.fn>;
    beginPath: ReturnType<typeof vi.fn>;
    rect: ReturnType<typeof vi.fn>;
    clip: ReturnType<typeof vi.fn>;
    measureText: ReturnType<typeof vi.fn>;
    fillText: ReturnType<typeof vi.fn>;
    fillStyle: string;
    font: string;
    textBaseline: CanvasTextBaseline;
  };
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CanvasDocumentService);
    editorState = TestBed.inject(EditorStateService);

    mockCtx = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      measureText: vi.fn((text: string) => ({ width: text.length * 8 })),
      fillText: vi.fn(),
      fillStyle: '#000000',
      font: '24px sans-serif',
      textBaseline: 'alphabetic',
    };

    mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockCtx as unknown as CanvasRenderingContext2D),
      toBlob: vi.fn((callback: BlobCallback) =>
        callback(new Blob(['png'], { type: 'image/png' })),
      ),
    } as unknown as HTMLCanvasElement;

    service.attachCanvas(mockCanvas);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('creates a transparent document by clearing without filling', () => {
    editorState.fileName.set('photo.png');
    editorState.cursorPos.set({ x: 10, y: 20 });
    editorState.activeTextDraft.set({
      rect: { x: 0, y: 0, width: 100, height: 40 },
      text: 'draft',
      fontFamily: 'Segoe UI',
      fontSize: 20,
      bold: false,
      italic: false,
      underline: false,
      color: '#000000',
    });

    service.newDocument(640, 480, TRANSPARENT_COLOR);

    expect(mockCanvas.width).toBe(640);
    expect(mockCanvas.height).toBe(480);
    expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 640, 480);
    expect(mockCtx.fillRect).not.toHaveBeenCalled();
    expect(editorState.canvasWidth()).toBe(640);
    expect(editorState.canvasHeight()).toBe(480);
    expect(editorState.fileName()).toBe('untitled.png');
    expect(editorState.cursorPos()).toBeNull();
    expect(editorState.activeTextDraft()).toBeNull();
  });

  it('fills the new canvas when an opaque fill color is provided', () => {
    service.newDocument(800, 600, '#ed1c24');

    expect(mockCanvas.width).toBe(800);
    expect(mockCanvas.height).toBe(600);
    expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
    expect(mockCtx.save).toHaveBeenCalledTimes(1);
    expect(mockCtx.fillStyle).toBe('#ed1c24');
    expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
    expect(mockCtx.restore).toHaveBeenCalledTimes(1);
    expect(editorState.canvasWidth()).toBe(800);
    expect(editorState.canvasHeight()).toBe(600);
  });

  it('clamps out-of-range and non-finite dimensions safely', () => {
    service.newDocument(0, MAX_CANVAS_SIZE + 500, '#ffffff');
    expect(editorState.canvasWidth()).toBe(MIN_CANVAS_SIZE);
    expect(editorState.canvasHeight()).toBe(MAX_CANVAS_SIZE);

    service.newDocument(Number.NaN, 123.6);
    expect(editorState.canvasWidth()).toBe(DEFAULT_CANVAS_WIDTH);
    expect(editorState.canvasHeight()).toBe(124);
    expect(DEFAULT_CANVAS_HEIGHT).toBe(1024);
  });

  it('saves image with chosen filename, updates editorState.fileName, and triggers download', () => {
    vi.useFakeTimers();
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    const createObjectUrlMock = vi.fn(() => 'blob:mock-save-url');
    const revokeObjectUrlMock = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectUrlMock,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeObjectUrlMock,
    });

    const realCreateElement = document.createElement.bind(document);
    const createdAnchors: HTMLAnchorElement[] = [];
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      const el = realCreateElement(tagName);
      if (tagName.toLowerCase() === 'a') {
        vi.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(() => {});
        createdAnchors.push(el as HTMLAnchorElement);
      }
      return el;
    }) as typeof document.createElement);

    try {
      editorState.activeTextDraft.set({
        rect: { x: 0, y: 0, width: 100, height: 40 },
        text: 'hello',
        fontFamily: 'Segoe UI',
        fontSize: 20,
        bold: false,
        italic: false,
        underline: false,
        color: '#000000',
      });

      service.saveImage('my-drawing.png');

      expect(editorState.activeTextDraft()).toBeNull();
      expect(editorState.fileName()).toBe('my-drawing.png');
      expect(createdAnchors).toHaveLength(1);
      expect(createdAnchors[0].href).toBe('blob:mock-save-url');
      expect(createdAnchors[0].download).toBe('my-drawing.png');
      expect(createdAnchors[0].click).toHaveBeenCalledTimes(1);

      vi.runAllTimers();
      expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:mock-save-url');

      service.saveImage('landscape');
      expect(editorState.fileName()).toBe('landscape.png');
      expect(createdAnchors[1].download).toBe('landscape.png');

      service.saveImage();
      expect(editorState.fileName()).toBe('landscape.png');
      expect(createdAnchors[2].download).toBe('landscape.png');
    } finally {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        writable: true,
        value: originalCreateObjectUrl,
      });
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        writable: true,
        value: originalRevokeObjectUrl,
      });
    }
  });
});
