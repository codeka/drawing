import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DrawingCanvas } from './components/drawing-canvas/drawing-canvas';
import { MenuBar } from './components/menu-bar/menu-bar';
import { NewImageDialog } from './components/new-image-dialog/new-image-dialog';
import { SaveImageDialog } from './components/save-image-dialog/save-image-dialog';
import { Toolbar } from './components/toolbar/toolbar';
import { CanvasDocumentService } from './core/canvas-document.service';
import { EditorStateService } from './core/editor-state.service';
import { NewImageOptions, ToolId, TRANSPARENT_COLOR } from './models/tool.model';

type ActiveDialog = 'new' | 'save' | null;

const TOOL_SHORTCUTS: Record<string, ToolId> = {
  p: 'pencil',
  f: 'fill',
  e: 'eraser',
  t: 'text',
};

@Component({
  selector: 'app-root',
  imports: [MenuBar, Toolbar, DrawingCanvas, NewImageDialog, SaveImageDialog],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'onKeyDown($event)',
  },
})
export class App {
  readonly editorState = inject(EditorStateService);
  private readonly canvasDoc = inject(CanvasDocumentService);

  readonly activeDialog = signal<ActiveDialog>(null);
  readonly lastNewFillColor = signal<string>(TRANSPARENT_COLOR);

  openNewImageDialog(): void {
    this.activeDialog.set('new');
  }

  openSaveImageDialog(): void {
    this.activeDialog.set('save');
  }

  closeDialog(): void {
    this.activeDialog.set(null);
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

    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable)
    ) {
      return;
    }

    const toolId = TOOL_SHORTCUTS[event.key.toLowerCase()];
    if (toolId) {
      event.preventDefault();
      this.canvasDoc.selectTool(toolId);
    }
  }
}
