import { inject, Injectable } from '@angular/core';
import {
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CANVAS_WIDTH,
  ToolId,
} from '../models/tool.model';
import { bakeTextToCanvas } from '../tools/text-renderer';
import { EditorStateService } from './editor-state.service';

@Injectable({
  providedIn: 'root',
})
export class CanvasDocumentService {
  private readonly editorState = inject(EditorStateService);
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  attachCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    this.newDocument(DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT);
  }

  getContext(): CanvasRenderingContext2D | null {
    return this.ctx;
  }

  selectTool(toolId: ToolId): void {
    if (this.editorState.activeTool() === toolId) {
      return;
    }
    if (this.editorState.activeTextDraft() !== null) {
      this.commitActiveEdit();
    }
    this.editorState.textSelectionPreview.set(null);
    this.editorState.activeTool.set(toolId);
  }

  commitActiveEdit(): void {
    const draft = this.editorState.activeTextDraft();
    if (!draft) {
      return;
    }
    if (this.ctx) {
      bakeTextToCanvas(this.ctx, draft);
    }
    this.editorState.clearTextDraft();
  }

  cancelActiveEdit(): void {
    this.editorState.textSelectionPreview.set(null);
    this.editorState.clearTextDraft();
  }

  newDocument(
    width: number = DEFAULT_CANVAS_WIDTH,
    height: number = DEFAULT_CANVAS_HEIGHT,
  ): void {
    this.cancelActiveEdit();
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    if (this.ctx) {
      this.ctx.clearRect(0, 0, width, height);
    }
    this.editorState.canvasWidth.set(width);
    this.editorState.canvasHeight.set(height);
    this.editorState.fileName.set('untitled.png');
  }

  async openImageFile(file: File): Promise<void> {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Unable to load image "${file.name}"`));
        image.src = url;
      });

      const width = img.naturalWidth;
      const height = img.naturalHeight;
      if (width <= 0 || height <= 0) {
        throw new Error(`Image "${file.name}" has invalid dimensions`);
      }

      this.cancelActiveEdit();
      if (this.canvas) {
        this.canvas.width = width;
        this.canvas.height = height;
      }
      if (this.ctx) {
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.drawImage(img, 0, 0);
      }

      this.editorState.canvasWidth.set(width);
      this.editorState.canvasHeight.set(height);
      this.editorState.fileName.set(file.name || 'image.png');
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  saveImage(): void {
    this.commitActiveEdit();
    if (!this.canvas) {
      return;
    }

    const rawName = this.editorState.fileName().trim() || 'untitled.png';
    const baseName = rawName.replace(/\.[^/.]+$/, '') || 'untitled';
    const downloadName = `${baseName}.png`;

    this.canvas.toBlob((blob) => {
      if (!blob) {
        return;
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = downloadName;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  }
}
