import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAX_CANVAS_SIZE, NewImageOptions, TRANSPARENT_COLOR } from '../../models/tool.model';
import { NewImageDialog } from './new-image-dialog';

@Component({
  imports: [NewImageDialog],
  template: `
    <app-new-image-dialog
      [initialWidth]="initialWidth()"
      [initialHeight]="initialHeight()"
      [initialFillColor]="initialFillColor()"
      (create)="created.push($event)"
      (cancel)="cancelCount = cancelCount + 1"
    />
  `,
})
class NewImageDialogHost {
  readonly initialWidth = signal(1280);
  readonly initialHeight = signal(1024);
  readonly initialFillColor = signal(TRANSPARENT_COLOR);
  readonly created: NewImageOptions[] = [];
  cancelCount = 0;
}

describe('NewImageDialog', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewImageDialogHost],
    }).compileComponents();
  });

  it('populates initial values and emits create with chosen size and fill color', () => {
    const fixture = TestBed.createComponent(NewImageDialogHost);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const widthInput = compiled.querySelector('#new-image-width') as HTMLInputElement;
    const heightInput = compiled.querySelector('#new-image-height') as HTMLInputElement;
    expect(widthInput.value).toBe('1280');
    expect(heightInput.value).toBe('1024');
    expect(compiled.querySelector('.fill-value')?.textContent?.trim()).toBe('Transparent');

    widthInput.value = '800';
    widthInput.dispatchEvent(new Event('input'));
    heightInput.value = '600';
    heightInput.dispatchEvent(new Event('input'));

    const blueSwatch = compiled.querySelector(
      'button[aria-label="Select color #00a2e8"]',
    ) as HTMLButtonElement;
    blueSwatch.click();
    fixture.detectChanges();

    expect(compiled.querySelector('.fill-value')?.textContent?.trim()).toBe('#00A2E8');

    const form = compiled.querySelector('.dialog-form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.componentInstance.created).toEqual([
      { width: 800, height: 600, fillColor: '#00a2e8' },
    ]);
  });

  it('validates positive whole dimensions within bounds', () => {
    const fixture = TestBed.createComponent(NewImageDialogHost);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const widthInput = compiled.querySelector('#new-image-width') as HTMLInputElement;
    const createBtn = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;

    for (const badValue of ['0', '-10', '12.5', '', String(MAX_CANVAS_SIZE + 1)]) {
      widthInput.value = badValue;
      widthInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(createBtn.disabled).toBe(true);
      expect(compiled.querySelector('.field-error')).toBeTruthy();
    }

    const form = compiled.querySelector('.dialog-form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    expect(fixture.componentInstance.created).toEqual([]);

    widthInput.value = '512';
    widthInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(createBtn.disabled).toBe(false);
    expect(compiled.querySelector('.field-error')).toBeNull();
  });

  it('cancels on Cancel button, Close button, Escape key, and backdrop click only', () => {
    const fixture = TestBed.createComponent(NewImageDialogHost);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const host = fixture.componentInstance;

    const cancelBtn = Array.from(compiled.querySelectorAll('.dialog-btn')).find(
      (btn) => btn.textContent?.trim() === 'Cancel',
    ) as HTMLButtonElement;
    cancelBtn.click();
    expect(host.cancelCount).toBe(1);

    const closeBtn = compiled.querySelector('.close-btn') as HTMLButtonElement;
    closeBtn.click();
    expect(host.cancelCount).toBe(2);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(host.cancelCount).toBe(3);

    // Click inside dialog card should not cancel
    const card = compiled.querySelector('.dialog-card') as HTMLElement;
    const backdrop = compiled.querySelector('.dialog-backdrop') as HTMLElement;
    card.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    card.click();
    expect(host.cancelCount).toBe(3);

    // Drag starting inside card and releasing on backdrop should not cancel
    card.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    backdrop.click();
    expect(host.cancelCount).toBe(3);

    // Pointerdown + click directly on backdrop cancels
    backdrop.dispatchEvent(new Event('pointerdown'));
    backdrop.click();
    expect(host.cancelCount).toBe(4);
  });
});
