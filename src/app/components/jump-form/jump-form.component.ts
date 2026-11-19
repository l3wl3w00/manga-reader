import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ReaderService } from '../../services/reader.service';
import { ZoomService } from '../../services/zoom.service';
import { UiService } from '../../services/ui.service';
import { ICONS } from '../../ui/icons';

export function normManga(raw: string) { return raw.trim().toLowerCase().replace(/\s+/g, '_'); }

export function searchUrl(name: string) {
  return `https://ww2.mangafreak.me/Find/${encodeURIComponent(name.replace(/_/g, ' ').trim())}`;
}

export function chapterUrl(manga: string, chapter: number) {
  const name = manga.split('_').map(w => (w[0]?.toUpperCase() ?? '') + w.slice(1)).join('_');
  return `https://ww2.mangafreak.me/Read1_${name}_${chapter}`;
}

/** Manga / chapter / page entry. panel: desktop rail, where the steppers navigate at once (as before).
 *  sheet and welcome: mobile, where the steppers edit a draft that Go applies. */
@Component({
  selector: 'app-jump-form',
  imports: [LucideAngularModule],
  host: { class: 'flex flex-col', '[class.gap-3]': "variant() === 'panel'", '[class.gap-4]': "variant() !== 'panel'" },
  templateUrl: './jump-form.component.html',
})
export class JumpFormComponent {
  protected reader = inject(ReaderService);
  protected zoom = inject(ZoomService);
  private ui = inject(UiService);
  protected readonly icons = ICONS;

  readonly variant = input<'panel' | 'sheet' | 'welcome'>('panel');
  /** Fired after Go, so a sheet can close. */
  readonly submitted = output<void>();

  protected readonly mangaDraft = linkedSignal(() => this.reader.manga());
  protected readonly chDraft = linkedSignal(() => this.reader.chapter());
  protected readonly pgDraft = linkedSignal(() => this.reader.page());

  protected readonly large = computed(() => this.variant() !== 'panel');
  protected readonly live = computed(() => this.variant() === 'panel' && !!this.reader.lastGood());
  protected readonly loaded = computed(() => !!this.reader.lastGood());
  protected readonly invalid = computed(() =>
    this.reader.screen() === 'not-found' && normManga(this.mangaDraft()) === this.reader.missed()?.manga);
  protected readonly loadingLabel = computed(() =>
    this.reader.busy() ? `Loading page ${String(this.reader.page()).padStart(2, '0')}` : null);
  protected readonly goLabel = computed(() => {
    if (this.variant() !== 'sheet') return 'Go';
    const sameManga = normManga(this.mangaDraft()) === this.reader.manga();
    if (sameManga && this.chDraft() === this.reader.chapter()) return `Go to page ${this.pgDraft()}`;
    return sameManga ? `Go to chapter ${this.chDraft()}` : 'Go';
  });

  protected setNumber(target: 'ch' | 'pg', raw: string) {
    const n = Math.max(1, parseInt(raw, 10) || 1);
    (target === 'ch' ? this.chDraft : this.pgDraft).set(n);
  }

  protected go() {
    const manga = normManga(this.mangaDraft());
    if (!manga) return;
    this.reader.load(manga, this.chDraft() || 1, this.pgDraft() || 1);
    this.submitted.emit();
  }

  protected onEnter(field: 'manga' | 'ch' | 'pg') {
    if (field === 'manga' || !this.live()) { this.go(); return; }
    if (field === 'ch') this.reader.load(this.reader.manga(), this.chDraft(), 1, { dir: 'jump' });
    else this.reader.goToPage(this.pgDraft());
  }

  protected step(target: 'ch' | 'pg', delta: 1 | -1) {
    if (this.live()) {
      if (target === 'ch') { if (delta > 0) this.reader.nextChapter(); else this.reader.prevChapter(); }
      else if (delta > 0) this.reader.nextPageFull(); else this.reader.prevPageFull();
      return;
    }
    const s = target === 'ch' ? this.chDraft : this.pgDraft;
    s.update(v => Math.max(1, v + delta));
  }

  protected search() {
    const q = this.mangaDraft() || this.reader.manga();
    if (q.trim()) window.open(searchUrl(q), '_blank', 'noopener');
  }

  protected openSite() {
    if (this.loaded()) window.open(chapterUrl(this.reader.manga(), this.reader.chapter()), '_blank', 'noopener');
  }

  protected openSettings() { this.ui.openSettings(); }
}
