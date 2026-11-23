import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { PRESET_COLORS, TRANSPARENT_COLOR } from '../../models/tool.model';

@Component({
  selector: 'app-color-picker',
  templateUrl: './color-picker.html',
  styleUrl: './color-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorPicker {
  readonly color = input.required<string>();
  readonly allowTransparent = input<boolean>(false);
  readonly customColorLabel = input<string>('Custom color');

  readonly colorChange = output<string>();

  readonly presetColors = PRESET_COLORS;
  readonly isTransparent = computed(() => this.color().toLowerCase() === TRANSPARENT_COLOR);

  // Native <input type="color"> only accepts #rrggbb values, so preserve the last hex color when transparent.
  readonly nativeColorValue = linkedSignal<string, string>({
    source: this.color,
    computation: (next, previous) =>
      /^#[0-9a-fA-F]{6}$/.test(next) ? next : (previous?.value ?? '#ffffff'),
  });

  selectColor(color: string): void {
    this.colorChange.emit(color);
  }

  selectTransparent(): void {
    this.colorChange.emit(TRANSPARENT_COLOR);
  }

  onNativeColorInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.colorChange.emit(value);
  }

  isPresetActive(preset: string): boolean {
    return !this.isTransparent() && this.color().toLowerCase() === preset.toLowerCase();
  }
}
