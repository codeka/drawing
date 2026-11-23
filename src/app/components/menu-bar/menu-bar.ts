import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
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
    this.canvasDoc.newDocument();
    this.closeMenu();
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
    this.canvasDoc.saveImage();
    this.closeMenu();
  }
}
