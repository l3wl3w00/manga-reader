import { Component, ElementRef, afterRenderEffect, computed, inject, signal, viewChild } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { LibraryEntry, LibraryService } from '../../services/library.service';
import { ReaderService } from '../../services/reader.service';
import { UiService } from '../../services/ui.service';
import { LayoutService } from '../../services/layout.service';
import { CoverComponent } from '../../ui/cover/cover.component';
import { ICONS } from '../../ui/icons';
import { LibraryEntryComponent } from '../library-entry/library-entry.component';

/** Desktop library: Favourites and Recent, hover actions, remove confirmed in place. */
@Component({
  selector: 'app-library-panel',
  imports: [LucideDynamicIcon, CoverComponent, LibraryEntryComponent],
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  templateUrl: './library-panel.component.html',
})
export class LibraryPanelComponent {
  protected lib = inject(LibraryService);
  private reader = inject(ReaderService);
  protected ui = inject(UiService);
  private layout = inject(LayoutService);
  protected readonly icons = ICONS;

  protected readonly confirmSlug = signal<string | null>(null);
  protected readonly current = computed(() => this.reader.lastGood()?.manga ?? '');
  /** More rows below the fold: the list's foot fades out to say so. */
  protected readonly moreBelow = signal(false);

  private readonly list = viewChild<ElementRef<HTMLElement>>('list');
  private readonly confirmRow = viewChild<ElementRef<HTMLElement>>('confirmRow');

  constructor() {
    // A remove confirm opened low in the list scrolls itself into view.
    afterRenderEffect(() => this.confirmRow()?.nativeElement.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }));
    afterRenderEffect(() => {
      this.lib.listing(); this.layout.viewport(); this.confirmSlug();
      this.updateMoreBelow();
    });
  }

  protected updateMoreBelow() {
    const el = this.list()?.nativeElement;
    this.moreBelow.set(!!el && el.scrollHeight - el.scrollTop - el.clientHeight > 2);
  }

  protected open(entry: LibraryEntry) {
    this.reader.load(entry.slug, entry.lastChapter ?? 1, entry.lastPage ?? 1);
  }

  protected toggleFavourite(slug: string, e: Event) { e.stopPropagation(); this.lib.toggleFavourite(slug); }

  protected requestRemove(slug: string, e: Event) { e.stopPropagation(); this.confirmSlug.set(slug); }

  protected confirmRemove() {
    const slug = this.confirmSlug();
    if (slug) this.lib.remove(slug);
    this.confirmSlug.set(null);
  }
}
