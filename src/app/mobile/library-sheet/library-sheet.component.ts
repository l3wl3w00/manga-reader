import { Component, computed, inject, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { LibraryEntry, LibraryService } from '../../services/library.service';
import { ReaderService } from '../../services/reader.service';
import { UiService } from '../../services/ui.service';
import { SheetComponent } from '../../ui/sheet/sheet.component';
import { CoverComponent } from '../../ui/cover/cover.component';
import { ICONS } from '../../ui/icons';
import { LibraryEntryComponent } from '../../components/library-entry/library-entry.component';
import { settleSwipe } from '../../gestures/gestures';

/** Width of the two action tiles a swiped row reveals. */
export const ROW_ACTIONS_W = 168;
/** Movement before a row drag picks a direction (horizontal: swipe the row; vertical: scroll). */
const AXIS_SLOP = 8;

/** Mobile library sheet: Favourites and Recent, rows swipe left for Favourite / Remove,
 *  and Remove asks in a second sheet. */
@Component({
  selector: 'app-library-sheet',
  imports: [LucideDynamicIcon, SheetComponent, CoverComponent, LibraryEntryComponent],
  // The host is what the layout removes, so it carries the leave; the sheets inside animate out with it.
  host: { class: 'fixed inset-0 z-[80]', 'animate.leave': 'x-leave' },
  templateUrl: './library-sheet.component.html',
})
export class LibrarySheetComponent {
  protected lib = inject(LibraryService);
  private reader = inject(ReaderService);
  protected ui = inject(UiService);
  protected readonly icons = ICONS;
  protected readonly actionsW = ROW_ACTIONS_W;

  protected readonly current = computed(() => this.reader.lastGood()?.manga ?? '');
  protected readonly openSlug = signal<string | null>(null);
  protected readonly removing = signal<LibraryEntry | null>(null);
  protected readonly drag = signal<{ slug: string; x: number } | null>(null);
  /** Rows sliding shut: their action tiles stay until the row covers them again. */
  protected readonly closing = signal<ReadonlySet<string>>(new Set());
  private gesture: { slug: string; x: number; y: number; base: number; axis: 'x' | 'y' | null; id: number } | null = null;


  protected offset(slug: string): number {
    const d = this.drag();
    if (d?.slug === slug) return d.x;
    return this.openSlug() === slug ? -ROW_ACTIONS_W : 0;
  }

  protected down(e: PointerEvent, slug: string) {
    this.gesture = { slug, x: e.clientX, y: e.clientY, base: this.offset(slug), axis: null, id: e.pointerId };
  }

  protected move(e: PointerEvent) {
    const g = this.gesture;
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (!g.axis) {
      if (Math.hypot(dx, dy) < AXIS_SLOP) return;
      g.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (g.axis === 'x') (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    if (g.axis === 'x') this.drag.set({ slug: g.slug, x: Math.min(0, Math.max(-ROW_ACTIONS_W - 24, g.base + dx)) });
  }

  protected up(e: PointerEvent, entry: LibraryEntry) {
    const g = this.gesture;
    if (!g || e.pointerId !== g.id) return;
    this.gesture = null;
    if (g.axis === 'x') {
      const wasOpen = this.openSlug() === g.slug;
      const open = settleSwipe(this.drag()?.x ?? 0, ROW_ACTIONS_W, wasOpen);
      this.drag.set(null);
      this.setOpen(open ? g.slug : null);
    } else if (!g.axis) {
      this.tap(entry);
    }
  }

  protected cancel() { this.gesture = null; this.drag.set(null); }

  /** Opens one row (or none), letting the previously open one slide shut over its tiles. */
  private setOpen(slug: string | null) {
    const prev = this.openSlug();
    if (prev && prev !== slug) this.closing.update(s => new Set(s).add(prev));
    this.openSlug.set(slug);
  }

  protected closed(slug: string) {
    if (this.closing().has(slug)) this.closing.update(s => { const n = new Set(s); n.delete(slug); return n; });
  }

  protected tap(entry: LibraryEntry) {
    if (this.openSlug()) { this.setOpen(null); return; }
    this.reader.load(entry.slug, entry.lastChapter ?? 1, entry.lastPage ?? 1);
    this.ui.closeSheet();
  }

  protected favourite(slug: string) { this.lib.toggleFavourite(slug); this.setOpen(null); }

  protected askRemove(entry: LibraryEntry) { this.removing.set(entry); }

  protected confirmRemove() {
    const e = this.removing();
    if (e) this.lib.remove(e.slug);
    this.removing.set(null);
    this.setOpen(null);
  }

  protected findManga() { this.ui.openSheet('jump'); }
}
