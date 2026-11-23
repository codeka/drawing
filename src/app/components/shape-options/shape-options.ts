import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CanvasDocumentService } from '../../core/canvas-document.service';
import { EditorStateService } from '../../core/editor-state.service';
import {
  MAX_BRUSH_SIZE,
  MIN_BRUSH_SIZE,
  SHAPE_DEFINITIONS,
  ShapeType,
  SLIDER_MAX_BRUSH_SIZE,
} from '../../models/tool.model';

@Component({
  selector: 'app-shape-options',
  templateUrl: './shape-options.html',
  styleUrl: './shape-options.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShapeOptions {
  readonly editorState = inject(EditorStateService);
  private readonly canvasDoc = inject(CanvasDocumentService);

  readonly shapes = SHAPE_DEFINITIONS;
  readonly minBrushSize = MIN_BRUSH_SIZE;
  readonly maxBrushSize = MAX_BRUSH_SIZE;
  readonly sliderMaxBrushSize = SLIDER_MAX_BRUSH_SIZE;

  sliderValue(size: number): number {
    return Math.min(size, SLIDER_MAX_BRUSH_SIZE);
  }

  selectShape(shape: ShapeType): void {
    this.editorState.setShapeType(shape);
  }

  onOutlineSliderInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.editorState.setShapeOutlineWidth(value);
  }

  onOutlineTextInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value.trim();
    if (!/^\d+$/.test(raw)) {
      return;
    }
    const parsed = Number(raw);
    if (parsed >= MIN_BRUSH_SIZE) {
      this.editorState.setShapeOutlineWidth(parsed);
    }
  }

  onOutlineTextCommit(event: Event): void {
    const input = event.target as HTMLInputElement;
    const trimmed = input.value.trim();
    if (trimmed !== '') {
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) {
        this.editorState.setShapeOutlineWidth(parsed);
      }
    }
    input.value = String(this.editorState.shapeOutlineWidth());
  }

  onInstantChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.editorState.setShapeInstant(checked);
    if (checked && this.editorState.activeShapeDraft() !== null) {
      this.canvasDoc.commitActiveEdit();
    }
  }
}
