import { Component, computed, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ReaderService } from '../../services/reader.service';
import { ICONS } from '../../ui/icons';

export const pad2 = (n: number) => String(n).padStart(2, '0');
/** Above this many pages a tick per page gets too thin: draw a plain bar instead. */
export const MAX_TICKS = 24;

/** Desktop page navigation. These buttons roll into the next / previous chapter. */
@Component({
  selector: 'app-bottom-bar',
  imports: [LucideAngularModule],
  host: { class: 'block' },
  templateUrl: './bottom-bar.component.html',
})
export class BottomBarComponent {
  protected reader = inject(ReaderService);
  protected readonly icons = ICONS;
  protected readonly pad2 = pad2;

  protected readonly atStart = computed(() => this.reader.page() <= 1 && this.reader.chapter() <= 1);
  protected readonly ticks = computed(() => {
    const tp = this.reader.totalPages();
    return tp && tp <= MAX_TICKS ? Array.from({ length: tp }, (_, i) => i < this.reader.shown().page) : null;
  });
}
