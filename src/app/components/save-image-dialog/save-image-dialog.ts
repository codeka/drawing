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
  DEFAULT_FILE_NAME,
  extractFileBaseName,
  normalizePngFileName,
} from '../../core/file-name';

@Component({
  selector: 'app-save-image-dialog',
  templateUrl: './save-image-dialog.html',
  styleUrl: './save-image-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape($event)',
  },
})
export class SaveImageDialog {
  readonly initialFileName = input<string>(DEFAULT_FILE_NAME);

  readonly save = output<string>();
  readonly cancel = output<void>();

  readonly fileNameText = linkedSignal(() => extractFileBaseName(this.initialFileName()));
  readonly normalizedFileName = computed(() => normalizePngFileName(this.fileNameText()));
  readonly isValid = computed(() => this.normalizedFileName() !== null);

  readonly errorMessage = computed(() => {
    if (this.isValid()) {
      return null;
    }
    const base = this.fileNameText().trim().replace(/\.png$/i, '').trim();
    if (!base) {
      return 'Enter a file name.';
    }
    return 'File name cannot end with a period or contain < > : " / \\ | ? *';
  });

  private readonly fileNameInput = viewChild<ElementRef<HTMLInputElement>>('fileNameInput');
  private backdropPointerDown = false;

  constructor() {
    afterNextRender(() => {
      const inputEl = this.fileNameInput()?.nativeElement;
      inputEl?.focus();
      inputEl?.select();
    });
  }

  onFileNameInput(event: Event): void {
    this.fileNameText.set((event.target as HTMLInputElement).value);
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
    const fileName = this.normalizedFileName();
    if (!fileName) {
      return;
    }
    this.save.emit(fileName);
  }
}
