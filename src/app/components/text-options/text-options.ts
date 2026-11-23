import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { EditorStateService } from '../../core/editor-state.service';
import {
  MAX_TEXT_FONT_SIZE,
  MIN_TEXT_FONT_SIZE,
  TEXT_FONT_OPTIONS,
  TEXT_FONT_SIZE_PRESETS,
} from '../../models/tool.model';

@Component({
  selector: 'app-text-options',
  templateUrl: './text-options.html',
  styleUrl: './text-options.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
    '(document:keydown.escape)': 'closeFontSizeMenu()',
  },
})
export class TextOptions {
  readonly editorState = inject(EditorStateService);

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
}
