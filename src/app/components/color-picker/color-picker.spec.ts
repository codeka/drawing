import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TRANSPARENT_COLOR } from '../../models/tool.model';
import { ColorPicker } from './color-picker';

@Component({
  imports: [ColorPicker],
  template: `
    <app-color-picker
      [color]="color()"
      [allowTransparent]="allowTransparent()"
      (colorChange)="onColorChange($event)"
    />
  `,
})
class ColorPickerHost {
  readonly color = signal('#000000');
  readonly allowTransparent = signal(false);
  readonly emittedColors: string[] = [];

  onColorChange(value: string): void {
    this.emittedColors.push(value);
    this.color.set(value);
  }
}

describe('ColorPicker', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColorPickerHost],
    }).compileComponents();
  });

  it('emits preset and native colors and hides transparent option by default', () => {
    const fixture = TestBed.createComponent(ColorPickerHost);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.transparent-btn')).toBeNull();

    const redBtn = compiled.querySelector(
      'button[aria-label="Select color #ed1c24"]',
    ) as HTMLButtonElement;
    redBtn.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.emittedColors).toEqual(['#ed1c24']);
    expect(redBtn.classList.contains('active')).toBe(true);

    const nativeInput = compiled.querySelector('.color-native-input') as HTMLInputElement;
    nativeInput.value = '#123456';
    nativeInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.emittedColors).toEqual(['#ed1c24', '#123456']);
    expect(redBtn.classList.contains('active')).toBe(false);
  });

  it('supports selecting transparent and switching back to opaque color', () => {
    const fixture = TestBed.createComponent(ColorPickerHost);
    fixture.componentInstance.allowTransparent.set(true);
    fixture.componentInstance.color.set('#3f48cc');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const transparentBtn = compiled.querySelector('.transparent-btn') as HTMLButtonElement;
    expect(transparentBtn).toBeTruthy();

    transparentBtn.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.emittedColors).toEqual([TRANSPARENT_COLOR]);
    expect(transparentBtn.classList.contains('active')).toBe(true);
    expect(transparentBtn.getAttribute('aria-pressed')).toBe('true');

    const activeSwatch = compiled.querySelector('.active-swatch') as HTMLElement;
    expect(activeSwatch.classList.contains('checkerboard')).toBe(true);
    expect(activeSwatch.style.backgroundColor).toBe('');

    const nativeInput = compiled.querySelector('.color-native-input') as HTMLInputElement;
    expect(nativeInput.value).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(nativeInput.value.toLowerCase()).toBe('#3f48cc');
    expect(compiled.querySelector('.color-swatch.active')).toBeNull();

    const whiteBtn = compiled.querySelector(
      'button[aria-label="Select color #ffffff"]',
    ) as HTMLButtonElement;
    whiteBtn.click();
    fixture.detectChanges();

    expect(transparentBtn.classList.contains('active')).toBe(false);
    expect(activeSwatch.classList.contains('checkerboard')).toBe(false);
    expect(nativeInput.value.toLowerCase()).toBe('#ffffff');
  });
});
