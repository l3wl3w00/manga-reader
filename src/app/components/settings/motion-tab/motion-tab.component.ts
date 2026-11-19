import { Component, inject } from '@angular/core';
import { LayoutService } from '../../../services/layout.service';
import { MotionPref, MotionService } from '../../../services/motion.service';

/** How much the interface animates: follow the system, always full, or always reduced. */
@Component({
  selector: 'app-motion-tab',
  host: { class: 'block' },
  template: `
    @let mobile = layout.mobile();
    <div class="flex flex-col gap-5" [class]="mobile ? 'p-5' : 'px-8 pt-7 pb-8'">
      <div>
        <div class="dsp" [class]="mobile ? 'text-[17px]' : 'text-lg'" id="motion-title">Motion</div>
        <div class="mt-1.5 text-[13px] text-dim">Page slides, panels, sheets and the end-of-chapter stamp.</div>
      </div>
      <div role="radiogroup" aria-labelledby="motion-title" class="flex flex-col border-2 border-paper">
        @for (o of options; track o.value; let i = $index) {
          <label class="flex cursor-pointer items-center gap-3.5 px-4 py-3.5 transition-colors duration-150 hover:bg-surface-2"
            [class.border-t-2]="i > 0" [class.border-line]="i > 0" [class.bg-surface-2]="motion.pref() === o.value">
            <input type="radio" name="motion" class="sr-only peer" [value]="o.value" [checked]="motion.pref() === o.value"
              (change)="motion.set(o.value)" />
            <span class="flex size-5 shrink-0 items-center justify-center border-2 border-paper peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-shu"
              aria-hidden="true">
              @if (motion.pref() === o.value) { <span class="size-2.5 bg-shu"></span> }
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-[15px] font-bold">{{ o.title }}</span>
              <span class="block text-[13px] text-dim">
                @if (o.value === 'system') {
                  Your system asks for {{ motion.systemReduced() ? 'reduced' : 'full' }} motion right now.
                } @else { {{ o.text }} }
              </span>
            </span>
            @if (o.value === 'system' && motion.pref() === 'system') {
              <span class="tag text-mute">{{ motion.motion() === 'full' ? 'Full' : 'Reduced' }}</span>
            }
          </label>
        }
      </div>
      <p class="text-xs text-mute">Saved in this browser only.</p>
    </div>
  `,
})
export class MotionTabComponent {
  protected motion = inject(MotionService);
  protected layout = inject(LayoutService);
  protected readonly options: { value: MotionPref; title: string; text: string }[] = [
    { value: 'system', title: 'Follow system', text: '' },
    { value: 'full', title: 'Full', text: 'Every animation, whatever the system says.' },
    { value: 'reduced', title: 'Reduced', text: 'Short fades instead of slides and springs.' },
  ];
}
