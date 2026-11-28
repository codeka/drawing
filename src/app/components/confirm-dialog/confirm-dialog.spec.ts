import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConfirmDialog } from './confirm-dialog';

@Component({
  imports: [ConfirmDialog],
  template: `
    <app-confirm-dialog
      title="Replace Current Image?"
      message="You have unsaved changes."
      confirmLabel="Replace"
      cancelLabel="Cancel"
      (confirm)="confirmCount = confirmCount + 1"
      (cancel)="cancelCount = cancelCount + 1"
    />
  `,
})
class ConfirmDialogHost {
  confirmCount = 0;
  cancelCount = 0;
}

describe('ConfirmDialog', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogHost],
    }).compileComponents();
  });

  it('renders title, message, and buttons and emits confirm/cancel appropriately', () => {
    const fixture = TestBed.createComponent(ConfirmDialogHost);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const host = fixture.componentInstance;

    expect(compiled.querySelector('.dialog-title')?.textContent?.trim()).toBe(
      'Replace Current Image?',
    );
    expect(compiled.querySelector('.dialog-message')?.textContent?.trim()).toBe(
      'You have unsaved changes.',
    );

    const confirmBtn = compiled.querySelector('.dialog-btn.primary') as HTMLButtonElement;
    confirmBtn.click();
    expect(host.confirmCount).toBe(1);

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

    const card = compiled.querySelector('.dialog-card') as HTMLElement;
    const backdrop = compiled.querySelector('.dialog-backdrop') as HTMLElement;
    card.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    backdrop.click();
    expect(host.cancelCount).toBe(3);

    backdrop.dispatchEvent(new Event('pointerdown'));
    backdrop.click();
    expect(host.cancelCount).toBe(4);
  });
});
