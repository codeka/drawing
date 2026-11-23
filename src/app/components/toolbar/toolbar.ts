import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CanvasDocumentService } from '../../core/canvas-document.service';
import { EditorStateService } from '../../core/editor-state.service';
import {
  MAX_BRUSH_SIZE,
  MAX_TEXT_FONT_SIZE,
  MIN_BRUSH_SIZE,
  MIN_TEXT_FONT_SIZE,
  SLIDER_MAX_BRUSH_SIZE,
  TEXT_FONT_OPTIONS,
  TEXT_FONT_SIZE_PRESETS,
  TOOL_DEFINITIONS,
  ToolId,
} from '../../models/tool.model';
import { ColorPicker } from '../color-picker/color-picker';

type BrushToolId = 'pencil' | 'eraser';

@Component({
  selector: 'app-toolbar',
  imports: [NgTemplateOutlet, ColorPicker],
  templateUrl: './toolbar.html',
  styleUrl: './toolbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
    '(document:keydown.escape)': 'closeFontSizeMenu()',
  },
})
export class Toolbar {
  readonly editorState = inject(EditorStateService);
  private readonly canvasDoc = inject(CanvasDocumentService);

  readonly tools = TOOL_DEFINITIONS;
  readonly minBrushSize = MIN_BRUSH_SIZE;
  readonly maxBrushSize = MAX_BRUSH_SIZE;
  readonly sliderMaxBrushSize = SLIDER_MAX_BRUSH_SIZE;
  readonly textFonts = TEXT_FONT_OPTIONS;
  readonly textFontSizePresets = TEXT_FONT_SIZE_PRESETS;
  readonly minTextFontSize = MIN_TEXT_FONT_SIZE;
  readonly maxTextFontSize = MAX_TEXT_FONT_SIZE;
  readonly fontSizeMenuOpen = signal(false);

  private readonly fontSizeCombo = viewChild<ElementRef<HTMLElement>>('fontSizeCombo');

  constructor() {
    effect(() => {
      if (this.editorState.activeTool() !== 'text') {
        this.fontSizeMenuOpen.set(false);
      }
    });
  }

  selectTool(toolId: ToolId): void {
    this.canvasDoc.selectTool(toolId);
  }

  selectColor(color: string): void {
    this.editorState.setForegroundColor(color);
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
    const parsed = this.parseCommitNumber(input.value);
    if (parsed !== null) {
      this.applyBrushSize(tool, parsed);
    }
    input.value = String(this.currentBrushSize(tool));
  }

  onFontFamilyChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.editorState.setTextFontFamily(value);
  }

  onFontSizeInput(event: Event): void {
    this.fontSizeMenuOpen.set(false);
    const raw = (event.target as HTMLInputElement).value.trim();
    if (!/^\d+$/.test(raw)) {
      return;
    }
    const parsed = Number(raw);
    if (parsed >= MIN_TEXT_FONT_SIZE) {
      this.editorState.setTextFontSize(parsed);
    }
  }

  onFontSizeCommit(event: Event): void {
    const input = event.target as HTMLInputElement;
    const parsed = this.parseCommitNumber(input.value);
    if (parsed !== null) {
      this.editorState.setTextFontSize(parsed);
    }
    input.value = String(this.editorState.textFontSize());
    this.fontSizeMenuOpen.set(false);
  }

  toggleFontSizeMenu(): void {
    this.fontSizeMenuOpen.update((open) => !open);
  }

  closeFontSizeMenu(): void {
    this.fontSizeMenuOpen.set(false);
  }

  selectFontSizePreset(size: number): void {
    this.editorState.setTextFontSize(size);
    this.fontSizeMenuOpen.set(false);
  }

  onDocumentPointerDown(event: PointerEvent): void {
    if (!this.fontSizeMenuOpen()) {
      return;
    }
    const combo = this.fontSizeCombo()?.nativeElement;
    const target = event.target as Node | null;
    if (combo && target && !combo.contains(target)) {
      this.fontSizeMenuOpen.set(false);
    }
  }

  toggleBold(): void {
    this.editorState.toggleTextBold();
  }

  toggleItalic(): void {
    this.editorState.toggleTextItalic();
  }

  toggleUnderline(): void {
    this.editorState.toggleTextUnderline();
  }

  private parseCommitNumber(raw: string): number | null {
    const trimmed = raw.trim();
    if (trimmed === '') {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
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
