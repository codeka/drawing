import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SaveImageDialog } from './save-image-dialog';

@Component({
  imports: [SaveImageDialog],
  template: `
    <app-save-image-dialog
      [initialFileName]="initialFileName()"
      (save)="saved.push($event)"
      (cancel)="cancelCount = cancelCount + 1"
    />
  `,
})
class SaveImageDialogHost {
  readonly initialFileName = signal('untitled.png');
  readonly saved: string[] = [];
  cancelCount = 0;
}

describe('SaveImageDialog', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SaveImageDialogHost],
    }).compileComponents();
  });

  it('pre-fills base name stripped of extension and emits normalized png filenames', () => {
    const fixture = TestBed.createComponent(SaveImageDialogHost);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('#save-image-filename') as HTMLInputElement;
    const form = compiled.querySelector('.dialog-form') as HTMLFormElement;

    expect(input.value).toBe('untitled');

    fixture.componentInstance.initialFileName.set('photo.jpg');
    fixture.detectChanges();
    expect(input.value).toBe('photo');

    fixture.componentInstance.initialFileName.set('v1.2.png');
    fixture.detectChanges();
    expect(input.value).toBe('v1.2');

    input.value = 'my-art';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    form.dispatchEvent(new Event('submit'));

    input.value = 'sketch.png';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    form.dispatchEvent(new Event('submit'));

    input.value = 'v1.2';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    form.dispatchEvent(new Event('submit'));

    expect(fixture.componentInstance.saved).toEqual(['my-art.png', 'sketch.png', 'v1.2.png']);
  });

  it('rejects empty and invalid filenames and disables Save', () => {
    const fixture = TestBed.createComponent(SaveImageDialogHost);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const input = compiled.querySelector('#save-image-filename') as HTMLInputElement;
    const saveBtn = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;
    const form = compiled.querySelector('.dialog-form') as HTMLFormElement;

    for (const badName of ['', '   ', '.png', 'foo.', '..', 'a/b', 'a:b', 'a*b']) {
      input.value = badName;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(saveBtn.disabled).toBe(true);
      expect(compiled.querySelector('.field-error')).toBeTruthy();
      form.dispatchEvent(new Event('submit'));
    }

    expect(fixture.componentInstance.saved).toEqual([]);

    input.value = 'valid-name';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(saveBtn.disabled).toBe(false);
    expect(compiled.querySelector('.field-error')).toBeNull();
  });

  it('cancels on Cancel button, Close button, Escape key, and direct backdrop click only', () => {
    const fixture = TestBed.createComponent(SaveImageDialogHost);
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

    const card = compiled.querySelector('.dialog-card') as HTMLElement;
    const backdrop = compiled.querySelector('.dialog-backdrop') as HTMLElement;
    card.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    card.click();
    expect(host.cancelCount).toBe(3);

    card.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    backdrop.click();
    expect(host.cancelCount).toBe(3);

    backdrop.dispatchEvent(new Event('pointerdown'));
    backdrop.click();
    expect(host.cancelCount).toBe(4);
  });
});
