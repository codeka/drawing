import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Rect, ShapeDraft } from '../../models/tool.model';
import { ResizeHandle } from '../text-overlay/text-overlay';

interface InteractionState {
  kind: 'move' | 'resize';
  handle?: ResizeHandle;
  startClientX: number;
  startClientY: number;
  startRect: Rect;
}

const MIN_SHAPE_SIZE = 16;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

@Component({
  selector: 'app-shape-overlay',
  templateUrl: './shape-overlay.html',
  styleUrl: './shape-overlay.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShapeOverlay {
  readonly draft = input.required<ShapeDraft>();
  readonly canvasWidth = input.required<number>();
  readonly canvasHeight = input.required<number>();

  readonly draftChange = output<Partial<ShapeDraft>>();
  readonly commit = output<void>();
  readonly cancel = output<void>();

  readonly handles: readonly ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  readonly placeActionsBelow = computed(() => this.draft().rect.y < 32);

  private interaction: InteractionState | null = null;

  onOverlayPointerDown(event: PointerEvent): void {
    event.stopPropagation();
  }

  onBodyPointerDown(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    try {
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
      // Ignore environments without pointer capture support.
    }
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
    try {
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
      // Ignore environments without pointer capture support.
    }
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

    const minW = Math.min(MIN_SHAPE_SIZE, Math.max(1, maxW));
    const minH = Math.min(MIN_SHAPE_SIZE, Math.max(1, maxH));
    let left = startRect.x;
    let top = startRect.y;
    let right = startRect.x + startRect.width;
    let bottom = startRect.y + startRect.height;

    if (handle?.includes('w')) {
      left = clamp(startRect.x + dx, 0, right - minW);
    }
    if (handle?.includes('e')) {
      right = clamp(startRect.x + startRect.width + dx, left + minW, maxW);
    }
    if (handle?.includes('n')) {
      top = clamp(startRect.y + dy, 0, bottom - minH);
    }
    if (handle?.includes('s')) {
      bottom = clamp(startRect.y + startRect.height + dy, top + minH, maxH);
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
}
