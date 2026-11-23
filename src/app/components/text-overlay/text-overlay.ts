import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Rect, TextDraft, TextStyleOption } from '../../models/tool.model';
import { getTextLineHeight } from '../../tools/text-renderer';

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface InteractionState {
  kind: 'move' | 'resize';
  handle?: ResizeHandle;
  startClientX: number;
  startClientY: number;
  startRect: Rect;
}

const MIN_BOX_WIDTH = 40;
const MIN_BOX_HEIGHT = 28;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

@Component({
  selector: 'app-text-overlay',
  templateUrl: './text-overlay.html',
  styleUrl: './text-overlay.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextOverlay {
  readonly draft = input.required<TextDraft>();
  readonly canvasWidth = input.required<number>();
  readonly canvasHeight = input.required<number>();

  readonly draftChange = output<Partial<TextDraft>>();
  readonly toggleStyle = output<TextStyleOption>();
  readonly commit = output<void>();
  readonly cancel = output<void>();

  readonly handles: readonly ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  readonly lineHeightPx = computed(() => getTextLineHeight(this.draft().fontSize));
  readonly placeActionsBelow = computed(() => this.draft().rect.y < 32);

  private readonly textInput = viewChild<ElementRef<HTMLTextAreaElement>>('textInput');
  private interaction: InteractionState | null = null;

  constructor() {
    afterNextRender(() => {
      this.textInput()?.nativeElement.focus();
    });
  }

  onOverlayPointerDown(event: PointerEvent): void {
    event.stopPropagation();
  }

  onDragBarPointerDown(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.interaction = {
      kind: 'move',
      startClientX: event.clientX,
      startClientY: event.clientY,
      startRect: { ...this.draft().rect },
    };
  }

  onHandlePointerDown(handle: ResizeHandle, event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.interaction = {
      kind: 'resize',
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startRect: { ...this.draft().rect },
    };
  }

  onInteractionPointerMove(event: PointerEvent): void {
    if (!this.interaction) {
      return;
    }

    const dx = Math.round(event.clientX - this.interaction.startClientX);
    const dy = Math.round(event.clientY - this.interaction.startClientY);
    const { startRect, kind, handle } = this.interaction;
    const maxW = this.canvasWidth();
    const maxH = this.canvasHeight();

    if (kind === 'move') {
      const x = clamp(startRect.x + dx, 0, Math.max(0, maxW - startRect.width));
      const y = clamp(startRect.y + dy, 0, Math.max(0, maxH - startRect.height));
      this.draftChange.emit({ rect: { ...startRect, x, y } });
      return;
    }

    let left = startRect.x;
    let top = startRect.y;
    let right = startRect.x + startRect.width;
    let bottom = startRect.y + startRect.height;

    if (handle?.includes('w')) {
      left = clamp(startRect.x + dx, 0, right - MIN_BOX_WIDTH);
    }
    if (handle?.includes('e')) {
      right = clamp(startRect.x + startRect.width + dx, left + MIN_BOX_WIDTH, maxW);
    }
    if (handle?.includes('n')) {
      top = clamp(startRect.y + dy, 0, bottom - MIN_BOX_HEIGHT);
    }
    if (handle?.includes('s')) {
      bottom = clamp(startRect.y + startRect.height + dy, top + MIN_BOX_HEIGHT, maxH);
    }

    this.draftChange.emit({
      rect: {
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
      },
    });
  }

  onInteractionPointerUp(event: PointerEvent): void {
    const target = event.currentTarget as HTMLElement;
    try {
      if (target.hasPointerCapture(event.pointerId)) {
        target.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Ignore release errors if capture was already lost.
    }
    this.interaction = null;
  }

  onTextInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.draftChange.emit({ text: value });
  }

  onTextareaKeyDown(event: KeyboardEvent): void {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel.emit();
      return;
    }
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.commit.emit();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey) {
      const key = event.key.toLowerCase();
      if (key === 'b' || key === 'i' || key === 'u') {
        event.preventDefault();
        const style: TextStyleOption =
          key === 'b' ? 'bold' : key === 'i' ? 'italic' : 'underline';
        this.toggleStyle.emit(style);
      }
    }
  }
}
