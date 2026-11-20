import { Component, computed, inject, input } from '@angular/core';
import { AppearanceService, BackdropLook } from '../../services/appearance.service';

/** What sits behind the pages: a flat print colour, or Drift (halftone dot fields slowly sliding past each
 *  other). Ink, the default, draws nothing over the dotted ink ground. Panels and bars stay ink above it.
 *  Without `look` it shows the saved setting; the settings previews pass their own. */
@Component({
  selector: 'app-backdrop',
  host: { class: 'pointer-events-none block', 'aria-hidden': 'true' },
  template: `
    @let l = shown();
    @if (!l.ink) {
      <div class="bd" [class.bd-drift]="l.mode === 'drift'" [style.--c1]="l.c1" [style.--c2]="l.c2" [style.--c3]="l.c3"
        [style.--g]="grid() + 'px'"></div>
    }
  `,
})
export class BackdropComponent {
  private appearance = inject(AppearanceService);
  readonly look = input<BackdropLook | null>(null);
  /** Dot grid of the drift fields: smaller in the little previews. */
  readonly grid = input(30);
  protected readonly shown = computed(() => this.look() ?? this.appearance.look());
}
