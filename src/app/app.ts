import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DrawingCanvas } from './components/drawing-canvas/drawing-canvas';
import { MenuBar } from './components/menu-bar/menu-bar';
import { Toolbar } from './components/toolbar/toolbar';
import { CanvasDocumentService } from './core/canvas-document.service';
import { EditorStateService } from './core/editor-state.service';
import { ToolId } from './models/tool.model';

const TOOL_SHORTCUTS: Record<string, ToolId> = {
  p: 'pencil',
  f: 'fill',
  e: 'eraser',
  t: 'text',
};

@Component({
  selector: 'app-root',
  imports: [MenuBar, Toolbar, DrawingCanvas],
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

  onKeyDown(event: KeyboardEvent): void {
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
