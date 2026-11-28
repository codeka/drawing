import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CanvasDocumentService } from '../../core/canvas-document.service';

type MenuId = 'file' | 'edit' | 'view';

@Component({
  selector: 'app-menu-bar',
  templateUrl: './menu-bar.html',
  styleUrl: './menu-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
    '(document:keydown.escape)': 'closeMenu()',
  },
})
export class MenuBar {
  private readonly canvasDoc = inject(CanvasDocumentService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly openMenu = signal<MenuId | null>(null);
  readonly newRequested = output<void>();
  readonly saveRequested = output<void>();
  readonly copyRequested = output<void>();
  readonly pasteRequested = output<void>();
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  toggleMenu(id: MenuId): void {
    this.openMenu.update((current) => (current === id ? null : id));
  }

  onMenuTriggerEnter(id: MenuId): void {
    if (this.openMenu() !== null) {
      this.openMenu.set(id);
    }
  }

  closeMenu(): void {
    this.openMenu.set(null);
  }

  onDocumentPointerDown(event: PointerEvent): void {
    if (this.openMenu() === null) {
      return;
    }
    const target = event.target as Node | null;
    if (target && !this.elementRef.nativeElement.contains(target)) {
      this.closeMenu();
    }
  }

  onNew(): void {
    this.closeMenu();
    this.newRequested.emit();
  }

  onOpenClick(): void {
    this.closeMenu();
    this.fileInput()?.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    try {
      await this.canvasDoc.openImageFile(file);
    } catch (error) {
      console.error('Failed to open image file:', error);
    }
  }

  onSave(): void {
    this.closeMenu();
    this.saveRequested.emit();
  }

  onCopy(): void {
    this.closeMenu();
    this.copyRequested.emit();
  }

  onPaste(): void {
    this.closeMenu();
    this.pasteRequested.emit();
  }
}
