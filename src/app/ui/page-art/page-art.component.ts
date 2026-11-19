import { Component, computed, input } from '@angular/core';

const HOST = 'grid grid-cols-6 grid-rows-[27%_22%_1fr] gap-[1.5%] p-[2.7%]';
const HOST_KIND = {
  print: `${HOST} bg-paper`,
  skeleton: `${HOST} bg-[#dad5ca]`,
  outline: `${HOST} border-[3px] border-dashed border-mute`,
};
const PANEL_KIND = {
  print: 'border-2 border-[#111]',
  skeleton: 'border-2 border-[#a9a498] bg-[#cfcabf] halftone [--tone:#b9b4a8] [--dot:1.3px] [--grid:7px]',
  outline: 'border-2 border-line',
};

/** A drawn manga page (five panels in screentone): the loading skeleton, the welcome placeholder
 *  and the zoom-settings preview. Fills its host; the host's parent sets the size. */
@Component({
  selector: 'app-page-art',
  host: { '[class]': 'hostClass()', 'aria-hidden': 'true' },
  template: `
    @for (p of panels; track p.col) {
      <i [class]="p.col + ' ' + panelClass() + (kind() === 'print' ? ' ' + p.tone : '')"></i>
    }
  `,
})
export class PageArtComponent {
  /** print: inked page. skeleton: grey screentone placeholder. outline: dashed empty page. */
  readonly kind = input<'print' | 'skeleton' | 'outline'>('print');

  protected readonly hostClass = computed(() => HOST_KIND[this.kind()]);
  protected readonly panelClass = computed(() => PANEL_KIND[this.kind()]);

  protected readonly panels = [
    { col: 'col-span-4', tone: 't-speed' },
    { col: 'col-span-2', tone: 'bg-[#111]' },
    { col: 'col-span-2', tone: 't-dot' },
    { col: 'col-span-4', tone: 't-hatch' },
    { col: 'col-span-6', tone: 'bg-white' },
  ];
}
