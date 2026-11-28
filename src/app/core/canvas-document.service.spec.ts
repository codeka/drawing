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
    closePath: ReturnType<typeof vi.fn>;
    rect: ReturnType<typeof vi.fn>;
    clip: ReturnType<typeof vi.fn>;
    fill: ReturnType<typeof vi.fn>;
    stroke: ReturnType<typeof vi.fn>;
    measureText: ReturnType<typeof vi.fn>;
    fillText: ReturnType<typeof vi.fn>;
    fillStyle: string;
    strokeStyle: string;
    lineWidth: number;
    lineJoin: CanvasLineJoin;
    miterLimit: number;
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
      closePath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      measureText: vi.fn((text: string) => ({ width: text.length * 8 })),
      fillText: vi.fn(),
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      lineJoin: 'miter',
      miterLimit: 10,
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

      editorState.activeShapeDraft.set({
        rect: { x: 10, y: 10, width: 80, height: 60 },
        shapeType: 'rectangle',
        outlineWidth: 8,
        outlineColor: '#ed1c24',
        fillColor: '#3f48d1',
      });
      service.saveImage('with-shape');
      expect(editorState.activeShapeDraft()).toBeNull();
      expect(mockCtx.fill).toHaveBeenCalledTimes(1);
      expect(mockCtx.stroke).toHaveBeenCalledTimes(1);
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

  it('commits activeShapeDraft on tool switch and clears shape/line previews on cancelActiveEdit', () => {
    editorState.activeTool.set('shapes');
    editorState.activeShapeDraft.set({
      rect: { x: 10, y: 20, width: 100, height: 80 },
      shapeType: 'rectangle',
      outlineWidth: 8,
      outlineColor: '#000000',
      fillColor: TRANSPARENT_COLOR,
    });
    editorState.shapeSelectionPreview.set({ x: 0, y: 0, width: 50, height: 50 });

    service.selectTool('line');
    expect(editorState.activeTool()).toBe('line');
    expect(editorState.activeShapeDraft()).toBeNull();
    expect(editorState.shapeSelectionPreview()).toBeNull();
    expect(mockCtx.stroke).toHaveBeenCalledTimes(1);

    editorState.linePreview.set({
      start: { x: 0, y: 0 },
      end: { x: 40, y: 40 },
      color: '#000000',
      thickness: 8,
      startCap: 'round',
      endCap: 'round',
    });
    editorState.activeShapeDraft.set({
      rect: { x: 20, y: 20, width: 80, height: 80 },
      shapeType: 'rectangle',
      outlineWidth: 8,
      outlineColor: '#000000',
      fillColor: TRANSPARENT_COLOR,
    });
    service.cancelActiveEdit();
    expect(editorState.linePreview()).toBeNull();
    expect(editorState.activeShapeDraft()).toBeNull();
    expect(mockCtx.stroke).toHaveBeenCalledTimes(1);
  });

  it('tracks hasUnsavedWork across edits, saveImage, and newDocument', () => {
    expect(service.hasUnsavedWork()).toBe(false);

    editorState.markDirty();
    expect(service.hasUnsavedWork()).toBe(true);

    service.newDocument(320, 240);
    expect(service.hasUnsavedWork()).toBe(false);

    editorState.activeTextDraft.set({
      rect: { x: 0, y: 0, width: 100, height: 40 },
      text: '',
      fontFamily: 'Segoe UI',
      fontSize: 20,
      bold: false,
      italic: false,
      underline: false,
      color: '#000000',
    });
    expect(service.hasUnsavedWork()).toBe(false);

    editorState.updateTextDraft({ text: 'Hi' });
    expect(service.hasUnsavedWork()).toBe(true);

    service.commitActiveEdit();
    expect(editorState.hasUnsavedChanges()).toBe(true);
    expect(service.hasUnsavedWork()).toBe(true);

    service.saveImage('saved');
    expect(editorState.hasUnsavedChanges()).toBe(false);
    expect(service.hasUnsavedWork()).toBe(false);
  });

  it('copies canvas image to clipboard as PNG and throws when Clipboard API is unavailable', async () => {
    const originalClipboard = navigator.clipboard;
    const originalClipboardItem = (globalThis as { ClipboardItem?: typeof ClipboardItem })
      .ClipboardItem;

    const writeMock = vi.fn().mockResolvedValue(undefined);
    class MockClipboardItem {
      constructor(public readonly items: Record<string, Blob>) {}
    }

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { write: writeMock },
    });
    Object.defineProperty(globalThis, 'ClipboardItem', {
      configurable: true,
      writable: true,
      value: MockClipboardItem,
    });

    try {
      await service.copyImage();
      expect(writeMock).toHaveBeenCalledTimes(1);
      const [items] = writeMock.mock.calls[0];
      expect(items).toHaveLength(1);
      expect(items[0].items['image/png']).toBeInstanceOf(Blob);

      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {},
      });
      await expect(service.copyImage()).rejects.toThrow(
        'Clipboard image copy is not supported in this browser.',
      );
    } finally {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: originalClipboard,
      });
      Object.defineProperty(globalThis, 'ClipboardItem', {
        configurable: true,
        writable: true,
        value: originalClipboardItem,
      });
    }
  });
});
