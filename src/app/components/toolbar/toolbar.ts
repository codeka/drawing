import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CanvasDocumentService } from '../../core/canvas-document.service';
import { EditorStateService } from '../../core/editor-state.service';
import {
  MAX_BRUSH_SIZE,
  MIN_BRUSH_SIZE,
  ShapeColorSlot,
  SLIDER_MAX_BRUSH_SIZE,
  TOOL_DEFINITIONS,
  ToolId,
  TRANSPARENT_COLOR,
} from '../../models/tool.model';
import { ColorPicker } from '../color-picker/color-picker';
import { LineOptions } from '../line-options/line-options';
import { ShapeOptions } from '../shape-options/shape-options';
import { TextOptions } from '../text-options/text-options';

type BrushToolId = 'pencil' | 'eraser';

@Component({
  selector: 'app-toolbar',
  imports: [NgTemplateOutlet, ColorPicker, LineOptions, ShapeOptions, TextOptions],
  templateUrl: './toolbar.html',
  styleUrl: './toolbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Toolbar {
  readonly editorState = inject(EditorStateService);
  private readonly canvasDoc = inject(CanvasDocumentService);

  readonly tools = TOOL_DEFINITIONS;
  readonly minBrushSize = MIN_BRUSH_SIZE;
  readonly maxBrushSize = MAX_BRUSH_SIZE;
  readonly sliderMaxBrushSize = SLIDER_MAX_BRUSH_SIZE;

  selectTool(toolId: ToolId): void {
    this.canvasDoc.selectTool(toolId);
  }

  selectColor(color: string): void {
    this.editorState.setForegroundColor(color);
  }

  selectShapeColorSlot(slot: ShapeColorSlot): void {
    this.editorState.setActiveShapeColorSlot(slot);
  }

  selectShapeColor(color: string): void {
    this.editorState.setActiveShapeColor(color);
  }

  isTransparentColor(color: string): boolean {
    return color.trim().toLowerCase() === TRANSPARENT_COLOR;
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
    const trimmed = input.value.trim();
    if (trimmed !== '') {
      const parsed = Number(trimmed);
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
