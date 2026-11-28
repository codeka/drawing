import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ConfirmDialog } from './components/confirm-dialog/confirm-dialog';
import { DrawingCanvas } from './components/drawing-canvas/drawing-canvas';
import { MenuBar } from './components/menu-bar/menu-bar';
import { NewImageDialog } from './components/new-image-dialog/new-image-dialog';
import { SaveImageDialog } from './components/save-image-dialog/save-image-dialog';
import { Toolbar } from './components/toolbar/toolbar';
import { CanvasDocumentService } from './core/canvas-document.service';
import { EditorStateService } from './core/editor-state.service';
import { NewImageOptions, ToolId, TRANSPARENT_COLOR } from './models/tool.model';

type ActiveDialog = 'new' | 'save' | 'paste-confirm' | null;

interface StatusMessage {
  text: string;
  kind: 'success' | 'error';
}

const TOOL_SHORTCUTS: Record<string, ToolId> = {
  p: 'pencil',
  f: 'fill',
  e: 'eraser',
  t: 'text',
  l: 'line',
  s: 'shapes',
};

@Component({
  selector: 'app-root',
  imports: [MenuBar, Toolbar, DrawingCanvas, NewImageDialog, SaveImageDialog, ConfirmDialog],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'onKeyDown($event)',
    '(window:paste)': 'onPaste($event)',
  },
})
export class App {
  readonly editorState = inject(EditorStateService);
  private readonly canvasDoc = inject(CanvasDocumentService);

  readonly activeDialog = signal<ActiveDialog>(null);
  readonly lastNewFillColor = signal<string>(TRANSPARENT_COLOR);
  readonly pendingPasteFile = signal<File | null>(null);
  readonly statusMessage = signal<StatusMessage | null>(null);
  private statusTimer: ReturnType<typeof setTimeout> | null = null;

  openNewImageDialog(): void {
    this.activeDialog.set('new');
  }

  openSaveImageDialog(): void {
    this.activeDialog.set('save');
  }

  closeDialog(): void {
    this.pendingPasteFile.set(null);
    this.activeDialog.set(null);
  }

  onConfirmPaste(): void {
    const file = this.pendingPasteFile();
    this.pendingPasteFile.set(null);
    this.activeDialog.set(null);
    if (file) {
      void this.openPastedImage(file);
    }
  }

  onPaste(event: ClipboardEvent): void {
    if (this.activeDialog() !== null) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (this.isTextInputElement(target)) {
      return;
    }

    const file = this.extractClipboardImageFile(event.clipboardData);
    if (!file) {
      return;
    }

    event.preventDefault();
    this.handlePastedImageFile(file);
  }

  async onCopyRequested(): Promise<void> {
    try {
      await this.canvasDoc.copyImage();
      this.showStatusMessage('Copied image to clipboard', 'success');
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Failed to copy image to clipboard.';
      this.showStatusMessage(message, 'error');
    }
  }

  async onPasteRequested(): Promise<void> {
    if (!navigator.clipboard?.read) {
      this.showStatusMessage('Clipboard paste is not supported here. Try Ctrl+V.', 'error');
      return;
    }

    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType =
          item.types.find((type) => type === 'image/png') ??
          item.types.find((type) => type.startsWith('image/'));
        if (!imageType) {
          continue;
        }
        const blob = await item.getType(imageType);
        const ext = imageType.split('/')[1]?.split('+')[0] || 'png';
        const file = new File([blob], `image.${ext === 'jpeg' ? 'jpg' : ext}`, {
          type: imageType,
        });
        this.handlePastedImageFile(file);
        return;
      }
      this.showStatusMessage('No image found in clipboard.', 'error');
    } catch {
      this.showStatusMessage('Unable to read clipboard. Try pressing Ctrl+V.', 'error');
    }
  }

  onCreateNewImage(options: NewImageOptions): void {
    this.lastNewFillColor.set(options.fillColor);
    this.canvasDoc.newDocument(options.width, options.height, options.fillColor);
    this.activeDialog.set(null);
  }

  onSaveImage(fileName: string): void {
    this.canvasDoc.saveImage(fileName);
    this.activeDialog.set(null);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.activeDialog() !== null) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (
      (event.ctrlKey || event.metaKey) &&
      !event.altKey &&
      !event.shiftKey &&
      event.key.toLowerCase() === 'c'
    ) {
      if (this.isTextInputElement(target)) {
        return;
      }
      event.preventDefault();
      void this.onCopyRequested();
      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    if (this.isTextInputElement(target)) {
      return;
    }

    if (this.editorState.activeShapeDraft() !== null) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.canvasDoc.cancelActiveEdit();
        return;
      }
      if (event.key === 'Enter' && target?.tagName !== 'BUTTON') {
        event.preventDefault();
        this.canvasDoc.commitActiveEdit();
        return;
      }
    }

    const toolId = TOOL_SHORTCUTS[event.key.toLowerCase()];
    if (toolId) {
      event.preventDefault();
      this.canvasDoc.selectTool(toolId);
    }
  }

  private isTextInputElement(target: HTMLElement | null): boolean {
    return Boolean(
      target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable),
    );
  }

  private extractClipboardImageFile(clipboardData: DataTransfer | null): File | null {
    if (!clipboardData) {
      return null;
    }

    if (clipboardData.items) {
      for (const item of Array.from(clipboardData.items)) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            return file;
          }
        }
      }
    }

    if (clipboardData.files) {
      for (const file of Array.from(clipboardData.files)) {
        if (file.type.startsWith('image/')) {
          return file;
        }
      }
    }

    return null;
  }

  private handlePastedImageFile(file: File): void {
    if (this.canvasDoc.hasUnsavedWork()) {
      this.pendingPasteFile.set(file);
      this.activeDialog.set('paste-confirm');
      return;
    }

    void this.openPastedImage(file);
  }

  private showStatusMessage(text: string, kind: 'success' | 'error'): void {
    if (this.statusTimer !== null) {
      clearTimeout(this.statusTimer);
    }
    this.statusMessage.set({ text, kind });
    this.statusTimer = setTimeout(() => {
      this.statusMessage.set(null);
      this.statusTimer = null;
    }, 4000);
  }

  private async openPastedImage(file: File): Promise<void> {
    try {
      await this.canvasDoc.openImageFile(file);
    } catch (error) {
      console.error('Failed to paste image:', error);
      this.showStatusMessage('Failed to paste image from clipboard.', 'error');
    }
  }
}
