import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CanvasDocumentService } from '../../core/canvas-document.service';
import { EditorStateService } from '../../core/editor-state.service';
import { PRESET_COLORS, TOOL_DEFINITIONS, ToolId } from '../../models/tool.model';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.html',
  styleUrl: './toolbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Toolbar {
  readonly editorState = inject(EditorStateService);
  private readonly canvasDoc = inject(CanvasDocumentService);

  readonly tools = TOOL_DEFINITIONS;
  readonly presetColors = PRESET_COLORS;

  selectTool(toolId: ToolId): void {
    this.canvasDoc.selectTool(toolId);
  }

  selectColor(color: string): void {
    this.editorState.setForegroundColor(color);
  }

  onColorInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.editorState.setForegroundColor(value);
  }
}
