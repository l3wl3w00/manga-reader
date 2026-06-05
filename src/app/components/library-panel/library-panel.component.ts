import { Component, inject, signal } from '@angular/core';
import { LibraryService, LibraryEntry } from '../../services/library.service';
import { ReaderService } from '../../services/reader.service';

@Component({
  selector: 'app-library-panel',
  imports: [],
  templateUrl: './library-panel.component.html',
})
export class LibraryPanelComponent {
  lib    = inject(LibraryService);
  reader = inject(ReaderService);

  collapsed   = signal(false);
  confirmSlug = signal<string | null>(null);

  toggleCollapse() { this.collapsed.update(v => !v); }

  openEntry(entry: LibraryEntry) {
    this.reader.load(entry.slug, entry.lastChapter ?? 1, entry.lastPage ?? 1);
  }

  coverUrl(slug: string) {
    return `https://images.mangafreak.me/mangas/${slug}/${slug}_1/${slug}_1_1.jpg`;
  }

  initials(slug: string) {
    return this.lib.formatName(slug).split(' ').slice(0, 2).map(w => w[0]).join('');
  }

  pct(entry: LibraryEntry): number | null {
    const total = entry.chapterPages?.[entry.lastChapter!];
    return total ? Math.round(((entry.lastPage ?? 1) / total) * 100) : null;
  }

  requestRemove(slug: string, e: Event) {
    e.stopPropagation();
    this.confirmSlug.set(slug);
  }

  confirmRemove(e: Event) {
    e.stopPropagation();
    const slug = this.confirmSlug();
    if (slug) this.lib.remove(slug);
    this.confirmSlug.set(null);
  }

  cancelRemove(e: Event) { e.stopPropagation(); this.confirmSlug.set(null); }

  fav(slug: string, e: Event) { e.stopPropagation(); this.lib.toggleFavourite(slug); }
}
