import { Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { LayoutService } from '../../../services/layout.service';
import {
  AppearanceService, BackdropLook, BackdropMode, DRIFTS, DriftId, NeighbourOpacity, SOLIDS, Trio, driftColours,
} from '../../../services/appearance.service';
import { ICONS } from '../../../ui/icons';
import { BackdropComponent } from '../../../ui/backdrop/backdrop.component';
import { PageArtComponent } from '../../../ui/page-art/page-art.component';
import { MotionTabComponent } from '../motion-tab/motion-tab.component';

const COLOUR_ROLES = ['Base colour', 'Second colour', 'Third colour'] as const;

/** Backdrop (Solid or Drift), how see-through the hidden neighbour pages are, with a live preview; and Motion. */
@Component({
  selector: 'app-appearance-tab',
  imports: [LucideAngularModule, NgTemplateOutlet, BackdropComponent, PageArtComponent, MotionTabComponent],
  host: { class: 'block' },
  templateUrl: './appearance-tab.component.html',
})
export class AppearanceTabComponent {
  protected app = inject(AppearanceService);
  protected layout = inject(LayoutService);
  protected readonly icons = ICONS;
  protected readonly solids = SOLIDS;
  protected readonly drifts = DRIFTS;
  protected readonly roles = COLOUR_ROLES;

  protected readonly modes: { value: BackdropMode; label: string }[] = [
    { value: 'solid', label: 'Solid' }, { value: 'drift', label: 'Drift' },
  ];
  protected readonly opacities: { value: NeighbourOpacity; label: string }[] = [
    { value: 'opaque', label: 'Opaque' }, { value: '25', label: '25%' }, { value: '50', label: '50%' },
  ];

  /** Set when the last colour picked was too light and got darkened. */
  protected readonly darkened = signal<string | null>(null);

  protected readonly solidName = computed(() => {
    const b = this.app.backdrop();
    return b.solid === 'custom' ? 'Custom' : SOLIDS.find(s => s.id === b.solid)!.name;
  });
  protected readonly solidHex = computed(() => this.app.look().c1);
  protected readonly driftName = computed(() => {
    const id = this.app.backdrop().drift;
    return id === 'custom' ? 'Custom' : DRIFTS.find(d => d.id === id)!.name;
  });
  protected readonly trio = computed(() => driftColours(this.app.backdrop()));
  protected readonly customDriftLook = computed<BackdropLook>(() => {
    const [c1, c2, c3] = this.app.backdrop().driftCustom;
    return { mode: 'drift', ink: false, c1, c2, c3 };
  });

  protected driftLook(colours: Trio): BackdropLook {
    return { mode: 'drift', ink: false, c1: colours[0], c2: colours[1], c3: colours[2] };
  }

  protected pickDrift(id: DriftId | 'custom') { this.darkened.set(null); this.app.setDrift(id); }

  protected setSolidCustom(e: Event) {
    const hex = (e.target as HTMLInputElement).value;
    this.darkened.set(this.app.setSolidCustom(hex) ? this.app.backdrop().solidCustom : null);
  }

  protected setDriftColour(i: 0 | 1 | 2, e: Event) {
    const hex = (e.target as HTMLInputElement).value;
    this.darkened.set(this.app.setDriftColour(i, hex) ? this.app.backdrop().driftCustom[i] : null);
  }
}
