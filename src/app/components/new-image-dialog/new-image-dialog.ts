import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  linkedSignal,
  output,
  viewChild,
} from '@angular/core';
import {
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CANVAS_WIDTH,
  MAX_CANVAS_SIZE,
  MIN_CANVAS_SIZE,
  NewImageOptions,
  TRANSPARENT_COLOR,
} from '../../models/tool.model';
import { ColorPicker } from '../color-picker/color-picker';

function parseCanvasDimension(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value < MIN_CANVAS_SIZE || value > MAX_CANVAS_SIZE) {
    return null;
  }
  return value;
}

@Component({
  selector: 'app-new-image-dialog',
  imports: [ColorPicker],
  templateUrl: './new-image-dialog.html',
  styleUrl: './new-image-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape($event)',
  },
})
export class NewImageDialog {
  readonly initialWidth = input<number>(DEFAULT_CANVAS_WIDTH);
  readonly initialHeight = input<number>(DEFAULT_CANVAS_HEIGHT);
  readonly initialFillColor = input<string>(TRANSPARENT_COLOR);

  readonly create = output<NewImageOptions>();
  readonly cancel = output<void>();

  readonly minCanvasSize = MIN_CANVAS_SIZE;
  readonly maxCanvasSize = MAX_CANVAS_SIZE;

  readonly widthText = linkedSignal(() => String(this.initialWidth()));
  readonly heightText = linkedSignal(() => String(this.initialHeight()));
  readonly fillColor = linkedSignal(() => this.initialFillColor());

  readonly parsedWidth = computed(() => parseCanvasDimension(this.widthText()));
  readonly parsedHeight = computed(() => parseCanvasDimension(this.heightText()));
  readonly isWidthValid = computed(() => this.parsedWidth() !== null);
  readonly isHeightValid = computed(() => this.parsedHeight() !== null);
  readonly isValid = computed(() => this.isWidthValid() && this.isHeightValid());

  readonly fillColorLabel = computed(() =>
    this.fillColor().toLowerCase() === TRANSPARENT_COLOR
      ? 'Transparent'
      : this.fillColor().toUpperCase(),
  );

  private readonly widthInput = viewChild<ElementRef<HTMLInputElement>>('widthInput');
  private backdropPointerDown = false;

  constructor() {
    afterNextRender(() => {
      const inputEl = this.widthInput()?.nativeElement;
      inputEl?.focus();
      inputEl?.select();
    });
  }

  onWidthInput(event: Event): void {
    this.widthText.set((event.target as HTMLInputElement).value);
  }

  onHeightInput(event: Event): void {
    this.heightText.set((event.target as HTMLInputElement).value);
  }

  onFillColorChange(color: string): void {
    this.fillColor.set(color);
  }

  onBackdropPointerDown(event: PointerEvent): void {
    this.backdropPointerDown = event.target === event.currentTarget;
  }

  onBackdropClick(event: MouseEvent): void {
    const shouldCancel = this.backdropPointerDown && event.target === event.currentTarget;
    this.backdropPointerDown = false;
    if (shouldCancel) {
      this.cancel.emit();
    }
  }

  onEscape(event: Event): void {
    event.preventDefault();
    this.cancel.emit();
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    const width = this.parsedWidth();
    const height = this.parsedHeight();
    if (width === null || height === null) {
      return;
    }
    this.create.emit({
      width,
      height,
      fillColor: this.fillColor(),
    });
  }
}
