import { Component, inject, signal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReaderService } from '../../services/reader.service';
import { LibraryService } from '../../services/library.service';
import { ZoomService } from '../../services/zoom.service';

@Component({
  selector: 'app-control-panel',
  imports: [FormsModule],
  templateUrl: './control-panel.component.html',
})
export class ControlPanelComponent {
  reader = inject(ReaderService);
  lib    = inject(LibraryService);
  zoom   = inject(ZoomService);

  openSettings = output<void>();

  mangaValue = signal('');
  chValue    = signal(1);
  pgValue    = signal(1);
  ctrlCollapsed = signal(false);

  constructor() {
    // Keep input fields in sync with reader state when it loads externally (e.g. library click)
    // We do a simple effect-like approach via a getter
  }

  get displayManga() { return this.reader.manga() || this.mangaValue(); }
  get displayCh()    { return this.reader.manga() ? this.reader.chapter() : this.chValue(); }
  get displayPg()    { return this.reader.manga() ? this.reader.page()    : this.pgValue(); }

  normManga(raw: string) { return raw.trim().toLowerCase().replace(/\s+/g, '_'); }

  go() {
    const manga = this.normManga(this.mangaValue() || this.reader.manga());
    if (!manga) return;
    this.reader.load(manga, this.chValue() || 1, this.pgValue() || 1);
  }

  onMangaKey(e: KeyboardEvent) { if (e.key === 'Enter') this.go(); }

  onChKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && this.reader.manga())
      this.reader.load(this.reader.manga(), this.chValue() || 1, 1);
  }

  onPgKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && this.reader.manga())
      this.reader.load(this.reader.manga(), this.reader.chapter(), this.pgValue() || 1);
  }

  chInc() {
    if (this.reader.manga()) this.reader.nextChapter();
    else this.chValue.update(v => v + 1);
  }

  chDec() {
    if (this.reader.manga()) this.reader.prevChapter();
    else this.chValue.update(v => Math.max(1, v - 1));
  }

  pgInc() {
    if (this.reader.manga()) this.reader.nextPageFull();
    else this.pgValue.update(v => v + 1);
  }

  pgDec() {
    if (this.reader.manga()) this.reader.prevPageFull();
    else this.pgValue.update(v => Math.max(1, v - 1));
  }

  search() {
    const q = (this.mangaValue() || this.reader.manga()).replace(/_/g, ' ').trim();
    if (!q) return;
    window.open(`https://ww2.mangafreak.me/Find/${encodeURIComponent(q)}`, '_blank');
  }

  openSite() {
    if (!this.reader.manga()) return;
    const name = this.reader.manga().split('_').map(w => w[0].toUpperCase() + w.slice(1)).join('_');
    window.open(`https://ww2.mangafreak.me/Read1_${name}_${this.reader.chapter()}`, '_blank');
  }

  toggleCtrl() { this.ctrlCollapsed.update(v => !v); }
}
