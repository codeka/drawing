import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CanvasDocumentService } from '../../core/canvas-document.service';
import { EditorStateService } from '../../core/editor-state.service';
import {
  MAX_BRUSH_SIZE,
  MIN_BRUSH_SIZE,
  PRESET_COLORS,
  SLIDER_MAX_BRUSH_SIZE,
  TOOL_DEFINITIONS,
  ToolId,
} from '../../models/tool.model';

type BrushToolId = 'pencil' | 'eraser';

@Component({
  selector: 'app-toolbar',
  imports: [NgTemplateOutlet],
  templateUrl: './toolbar.html',
  styleUrl: './toolbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Toolbar {
  readonly editorState = inject(EditorStateService);
  private readonly canvasDoc = inject(CanvasDocumentService);

  readonly tools = TOOL_DEFINITIONS;
  readonly presetColors = PRESET_COLORS;
  readonly minBrushSize = MIN_BRUSH_SIZE;
  readonly maxBrushSize = MAX_BRUSH_SIZE;
  readonly sliderMaxBrushSize = SLIDER_MAX_BRUSH_SIZE;

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

  sliderValue(size: number): number {
    return Math.min(size, SLIDER_MAX_BRUSH_SIZE);
  }

  onSizeSliderInput(tool: BrushToolId, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.applyBrushSize(tool, value);
  }

  onSizeTextInput(tool: BrushToolId, event: Event): void {
    const raw = (event.target as HTMLInputElement).value.trim();
    if (!/^\d+$/.test(raw)) {
      return;
    }
    const parsed = Number(raw);
    if (parsed >= MIN_BRUSH_SIZE) {
      this.applyBrushSize(tool, parsed);
    }
  }

  onSizeTextCommit(tool: BrushToolId, event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.trim();
    if (raw !== '') {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        this.applyBrushSize(tool, parsed);
      }
    }
    input.value = String(this.currentBrushSize(tool));
  }

  private applyBrushSize(tool: BrushToolId, size: number): void {
    if (tool === 'pencil') {
      this.editorState.setPencilSize(size);
    } else {
      this.editorState.setEraserSize(size);
    }
  }

  private currentBrushSize(tool: BrushToolId): number {
    return tool === 'pencil' ? this.editorState.pencilSize() : this.editorState.eraserSize();
  }
}
