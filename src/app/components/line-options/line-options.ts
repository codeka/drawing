import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EditorStateService } from '../../core/editor-state.service';
import {
  LINE_CAP_DEFINITIONS,
  LineCap,
  LineCapSlot,
  MAX_BRUSH_SIZE,
  MIN_BRUSH_SIZE,
  SLIDER_MAX_BRUSH_SIZE,
} from '../../models/tool.model';

@Component({
  selector: 'app-line-options',
  imports: [NgTemplateOutlet],
  templateUrl: './line-options.html',
  styleUrl: './line-options.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineOptions {
  readonly editorState = inject(EditorStateService);
  readonly caps = LINE_CAP_DEFINITIONS;
  readonly minBrushSize = MIN_BRUSH_SIZE;
  readonly maxBrushSize = MAX_BRUSH_SIZE;
  readonly sliderMaxBrushSize = SLIDER_MAX_BRUSH_SIZE;

  sliderValue(size: number): number {
    return Math.min(size, SLIDER_MAX_BRUSH_SIZE);
  }

  selectCapSlot(slot: LineCapSlot): void {
    this.editorState.setActiveLineCapSlot(slot);
  }

  selectCap(cap: LineCap): void {
    this.editorState.setActiveLineCap(cap);
  }

  onThicknessSliderInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.editorState.setLineWidth(value);
  }

  onThicknessTextInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value.trim();
    if (!/^\d+$/.test(raw)) {
      return;
    }
    const parsed = Number(raw);
    if (parsed >= MIN_BRUSH_SIZE) {
      this.editorState.setLineWidth(parsed);
    }
  }

  onThicknessTextCommit(event: Event): void {
    const input = event.target as HTMLInputElement;
    const trimmed = input.value.trim();
    if (trimmed !== '') {
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) {
        this.editorState.setLineWidth(parsed);
      }
    }
    input.value = String(this.editorState.lineWidth());
  }
}
