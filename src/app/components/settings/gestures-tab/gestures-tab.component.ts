import { Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS } from '../../../ui/icons';

/** Mobile: what each touch does (touch replaces the keybindings). */
@Component({
  selector: 'app-gestures-tab',
  imports: [LucideAngularModule],
  host: { class: 'flex min-h-full flex-col' },
  template: `
    <div class="flex shrink-0 flex-col gap-2 px-5 pt-[18px] pb-3.5">
      <span class="lbl">Where to tap</span>
      <div class="grid h-[132px] grid-cols-[28fr_44fr_28fr] border-2 border-paper bg-ink" aria-hidden="true">
        @for (z of zones; track z.label) {
          <div class="flex flex-col items-center justify-center gap-1.5" [class]="z.cls">
            <lucide-icon [img]="z.icon" [size]="20" />
            <span class="lbl text-paper">{{ z.label }}</span>
            <span class="font-mono text-[11px] text-mute">{{ z.pct }}</span>
          </div>
        }
      </div>
    </div>
    <ul class="flex-1 border-t border-line">
      @for (g of gestures; track g.title; let i = $index) {
        <li class="flex min-h-16 items-center gap-3.5 border-b border-line px-4 py-3 last:border-b-0 a-row-in" [style.--i]="i">
          <span class="flex size-11 shrink-0 items-center justify-center border-2 border-paper bg-ink"><lucide-icon [img]="g.icon" [size]="18" /></span>
          <div>
            <div class="text-[15px] font-bold">{{ g.title }}</div>
            <div class="text-[13px] text-dim">{{ g.text }}</div>
          </div>
        </li>
      }
    </ul>
    <p class="shrink-0 border-t border-line px-5 pt-3 pb-5 text-xs text-mute">
      The bar's Page and Chapter buttons carry on into the next chapter. Keybindings appear here when a keyboard is connected.
    </p>
  `,
})
export class GesturesTabComponent {
  protected readonly zones = [
    { label: 'Back', pct: '28%', icon: ICONS.chevronLeft, cls: 'border-r-2 border-dashed border-mute bg-paper/6' },
    { label: 'Controls', pct: '44%', icon: ICONS.pointer, cls: '' },
    { label: 'Next', pct: '28%', icon: ICONS.chevronRight, cls: 'border-l-2 border-dashed border-mute bg-paper/6' },
  ];
  protected readonly gestures = [
    { icon: ICONS.chevronsRight, title: 'Tap an edge, or swipe', text: "Turns the page. Stops at the chapter's last page." },
    { icon: ICONS.pin, title: 'Tap the middle', text: 'Shows or hides the controls.' },
    { icon: ICONS.pinOff, title: 'Press and hold', text: 'Peeks at the controls until you let go.' },
    { icon: ICONS.zoomIn, title: 'Pinch', text: 'Zooms from 100 to 400%.' },
    { icon: ICONS.hand, title: 'Drag while zoomed', text: 'Pans. Swipes turn pages again at 100%.' },
    { icon: ICONS.scan, title: 'Double-tap', text: 'Fits the page, or zooms to where you tapped.' },
  ];
}
