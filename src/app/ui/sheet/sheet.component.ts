import { Component, input, output, signal } from '@angular/core';

const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 0.6; // px per ms

/** Mobile bottom sheet: rises with a slight overshoot, drag the handle or header down to dismiss.
 *  Header content goes in [sheetHeader]; the parent removes the sheet when `closed` fires. */
@Component({
  selector: 'app-sheet',
  host: { class: 'fixed inset-0', '[style.z-index]': '80 + level() * 2', 'animate.leave': 'x-leave' },
  template: `
    <div class="absolute inset-0" [class]="backdrop()" animate.enter="a-fade-in" data-leave="fade"
      (click)="closed.emit()"></div>
    <!-- The after: block extends the sheet below the screen, so the spring overshoot never shows a gap. -->
    <section class="absolute inset-x-0 bottom-0 mx-auto after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-24 after:bg-surface-1 flex max-h-[calc(100dvh-24px)] max-w-xl flex-col border-t-2 bg-surface-1 pb-[env(safe-area-inset-bottom)]"
      [class]="(tall() ? 'top-[72px] ' : '') + (danger() ? 'border-shu' : 'border-paper')"
      [attr.role]="danger() ? 'alertdialog' : 'dialog'" aria-modal="true" [attr.aria-label]="label()"
      animate.enter="a-sheet-in" data-leave="sheet"
      [style.transform]="dragY() ? 'translateY(' + dragY() + 'px)' : null"
      [style.transition]="settling() ? 'transform 320ms var(--ease-spring)' : null">
      <div class="shrink-0 touch-none cursor-grab active:cursor-grabbing"
        (pointerdown)="dragStart($event)" (pointermove)="dragMove($event)"
        (pointerup)="dragEnd($event)" (pointercancel)="dragEnd($event)">
        <div class="mx-auto mt-2.5 mb-1 h-[5px] w-11 bg-mute" aria-hidden="true"></div>
        <ng-content select="[sheetHeader]" />
      </div>
      <ng-content />
    </section>
  `,
})
export class SheetComponent {
  readonly label = input.required<string>();
  /** Library: leaves 72px of the page showing above. */
  readonly tall = input(false);
  /** Destructive confirm: shu top rule. */
  readonly danger = input(false);
  readonly backdrop = input('bg-ink/80');
  /** Stacking level: a sheet opened from another sheet goes one level up. */
  readonly level = input(0);
  readonly closed = output<void>();

  protected readonly dragY = signal(0);
  protected readonly settling = signal(false);
  private drag: { y: number; t: number; id: number } | null = null;

  protected dragStart(e: PointerEvent) {
    if ((e.target as HTMLElement).closest('button, a, input')) return;
    this.drag = { y: e.clientY, t: e.timeStamp, id: e.pointerId };
    this.settling.set(false);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  protected dragMove(e: PointerEvent) {
    if (!this.drag || e.pointerId !== this.drag.id) return;
    const dy = e.clientY - this.drag.y;
    this.dragY.set(dy > 0 ? dy : dy * 0.15);
  }

  protected dragEnd(e: PointerEvent) {
    if (!this.drag || e.pointerId !== this.drag.id) return;
    const velocity = this.dragY() / Math.max(1, e.timeStamp - this.drag.t);
    this.drag = null;
    if (this.dragY() > DISMISS_DISTANCE || (this.dragY() > 24 && velocity > DISMISS_VELOCITY)) {
      this.closed.emit();
    } else {
      this.settling.set(true);
      this.dragY.set(0);
    }
  }
}
