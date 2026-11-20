import { Component, ElementRef, afterRenderEffect, computed, inject, signal, viewChild } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { LayoutService } from '../../../services/layout.service';
import { KeybindingsService } from '../../../services/keybindings.service';
import { ICONS } from '../../../ui/icons';
import { KeybindingsTabComponent } from '../keybindings-tab/keybindings-tab.component';

/** Mobile: what each touch does (a tap never turns the page; a swipe does), and the keybindings when a
 *  keyboard (or at least a fine pointer) is around. */
@Component({
  selector: 'app-controls-tab',
  imports: [LucideAngularModule, KeybindingsTabComponent],
  host: { class: 'flex min-h-full flex-col' },
  template: `
    @if (keys()) {
      <div class="flex h-13 shrink-0 items-center border-b border-line pl-1.5">
        <button #back type="button" class="flex h-11 items-center gap-1.5 px-2.5 text-[13px] font-bold uppercase tracking-[0.1em] text-dim hover:text-paper"
          (click)="keys.set(false)">
          <lucide-icon [img]="icons.chevronLeft" [size]="18" />Controls
        </button>
        <span class="lbl ml-auto pr-5">Keybindings</span>
      </div>
      <app-keybindings-tab class="a-fade-in" />
    } @else {
      <div class="flex shrink-0 flex-col gap-2 px-5 pt-4 pb-3.5">
        <span class="lbl">Turning pages</span>
        <div class="flex h-[92px] items-center justify-between border-2 border-paper bg-ink px-4" aria-hidden="true">
          <lucide-icon [img]="icons.chevronsLeft" [size]="32" />
          <div class="flex flex-col items-center gap-1">
            <span class="dsp text-lg">Swipe</span>
            <span class="text-xs text-dim">sideways, anywhere on the page</span>
          </div>
          <lucide-icon [img]="icons.chevronsRight" [size]="32" />
        </div>
      </div>
      <ul class="border-t border-line">
        @for (g of gestures; track g.title; let i = $index) {
          <li class="flex min-h-15 items-center gap-3.5 border-b border-line px-4 py-[9px] a-row-in" [style.--i]="i">
            <span class="flex size-11 shrink-0 items-center justify-center border-2 border-paper bg-ink"><lucide-icon [img]="g.icon" [size]="18" /></span>
            <div>
              <div class="text-[15px] font-bold">{{ g.title }}</div>
              <div class="text-[13px] text-dim">{{ g.text }}</div>
            </div>
          </li>
        }
      </ul>
      @if (layout.finePointer()) {
        <div class="flex h-7 items-center border-b border-line bg-surface-2 px-4">
          <span class="lbl">Keybindings</span>
          <span class="tag tag-gold ml-auto">Keyboard connected</span>
        </div>
        <button type="button" class="flex min-h-15 w-full items-center gap-3.5 border-b border-line py-[9px] pl-4 pr-2 text-left transition-colors hover:bg-surface-2"
          (click)="keys.set(true)">
          <span class="flex size-11 shrink-0 items-center justify-center border-2 border-paper bg-ink"><lucide-icon [img]="icons.keyboard" [size]="18" /></span>
          <span class="flex-1">
            <span class="block text-[15px] font-bold">{{ presetName() }}</span>
            <span class="block text-[13px] text-dim">{{ actionCount() }} actions. Change preset or record keys.</span>
          </span>
          <lucide-icon [img]="icons.chevronRight" [size]="22" class="mr-1.5" />
        </button>
      }
      <p class="flex-1 px-4 pt-3 pb-4 text-xs text-mute">The bar's Page and Chapter buttons carry on into the next chapter.</p>
    }
  `,
})
export class ControlsTabComponent {
  protected layout = inject(LayoutService);
  private kb = inject(KeybindingsService);
  protected readonly icons = ICONS;
  /** Showing the keybinding editor instead of the gesture list. */
  protected readonly keys = signal(false);
  private readonly back = viewChild<ElementRef<HTMLElement>>('back');

  protected readonly presetName = computed(() => {
    const id = this.kb.activePreset();
    return id ? `${this.kb.getPresetLabel(id)} preset` : 'Custom bindings';
  });
  protected readonly actionCount = computed(() => Object.keys(this.kb.bindings()).length);

  protected readonly gestures = [
    { icon: ICONS.chevronsRight, title: 'Swipe sideways', text: "Turns the page, at 100% zoom only. Stops at the chapter's last page." },
    { icon: ICONS.pointer, title: 'Tap anywhere', text: 'Shows or hides the controls. A tap never turns the page.' },
    { icon: ICONS.pinOff, title: 'Press and hold', text: 'Peeks at the controls until you let go.' },
    { icon: ICONS.zoomIn, title: 'Pinch', text: 'Zooms from 100 to 400%.' },
    { icon: ICONS.hand, title: 'Drag while zoomed', text: 'Pans the page. Swiping turns pages again at 100%.' },
    { icon: ICONS.scan, title: 'Double-tap', text: 'Fits the page, or zooms to where you tapped.' },
  ];

  constructor() {
    // Opening the editor moves focus into it, onto the way back.
    afterRenderEffect(() => this.back()?.nativeElement.focus());
  }
}
