import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape($event)',
  },
})
export class ConfirmDialog {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input<string>('Confirm');
  readonly cancelLabel = input<string>('Cancel');

  readonly confirm = output<void>();
  readonly cancel = output<void>();

  private readonly confirmButton = viewChild<ElementRef<HTMLButtonElement>>('confirmButton');
  private backdropPointerDown = false;

  constructor() {
    afterNextRender(() => {
      this.confirmButton()?.nativeElement.focus();
    });
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
}
