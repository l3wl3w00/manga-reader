import { Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';
import { LayoutService } from '../../../services/layout.service';
import { ReaderService } from '../../../services/reader.service';
import { LibraryService } from '../../../services/library.service';
import { SourceService } from '../../../services/source.service';
import {
  DEFAULT_SOURCE, Fix, PLACEHOLDERS, Piece, Place, Problem, SOURCE_KEYS, SourceKey, checkTemplate, probeImage, resolveParts,
} from '../../../services/source';
import { ICONS } from '../../../ui/icons';

interface FieldView {
  key: SourceKey;
  text: string;
  /** Its last save was refused: the reader keeps the template in use. */
  refused: boolean;
  /** The template in use is not the default. */
  edited: boolean;
  /** Problems to show: all of them once a save was refused, else the warnings of saved text. */
  problems: Problem[];
  fixes: Fix[];
  /** The text filled in for the sample place, when the text is usable and not empty. */
  parts: Piece[] | null;
  url: string | null;
}

type TestResult = { url: string; state: 'testing' } | { url: string; state: 'ok'; size: string; time: string } | { url: string; state: 'fail' };

/** Settings > Source: the page image, search and chapter link templates. A field saves when it is valid and
 *  loses focus (or on Enter); invalid text stays in the field, marked "Not saved", and is never used. */
@Component({
  selector: 'app-source-tab',
  imports: [LucideDynamicIcon, NgTemplateOutlet],
  host: { class: 'block' },
  templateUrl: './source-tab.component.html',
})
export class SourceTabComponent {
  protected source = inject(SourceService);
  protected layout = inject(LayoutService);
  private reader = inject(ReaderService);
  private lib = inject(LibraryService);
  protected readonly icons = ICONS;
  protected readonly defaults = DEFAULT_SOURCE;
  protected readonly placeholders = PLACEHOLDERS;

  /** What previews and the Test fill in: the page being read, else the last title in the library, else a sample. */
  protected readonly place = computed<Place & { name: string; sample: boolean }>(() => {
    const r = this.reader;
    const e = this.lib.entries()[0];
    const p = r.manga() ? { manga: r.manga(), ch: r.chapter(), pg: r.page() }
      : e ? { manga: e.slug, ch: e.lastChapter ?? 1, pg: e.lastPage ?? 1 } : null;
    const at = p ?? { manga: 'one_piece', ch: 1, pg: 1 };
    return { ...at, name: this.lib.formatName(at.manga), sample: !p };
  });

  protected readonly fields = computed<Record<SourceKey, FieldView>>(() => {
    const saved = this.source.templates(), refusedKeys = this.source.refused(), place = this.place();
    const out = {} as Record<SourceKey, FieldView>;
    for (const key of SOURCE_KEYS) {
      const text = this.source.text(key);
      const all = checkTemplate(key, text);
      const refused = refusedKeys.has(key);
      const problems = refused ? all : text.trim() === saved[key] ? all.filter(p => p.level === 'warn') : [];
      const usable = !!text.trim() && !all.some(p => p.level === 'error');
      const parts = usable ? resolveParts(text, key, place) : null;
      out[key] = {
        key, text, refused, edited: saved[key] !== DEFAULT_SOURCE[key], problems,
        fixes: problems.flatMap(p => (p.fix ? [p.fix] : [])),
        parts, url: parts ? parts.map(x => x.text).join('') : null,
      };
    }
    return out;
  });

  protected readonly anythingToReset = computed(() =>
    SOURCE_KEYS.some(k => this.fields()[k].edited || this.fields()[k].refused || this.fields()[k].text !== this.source.templates()[k]));

  // ---- Editing ----

  /** Where the caret was when each field lost focus, for a placeholder chip pressed from the keyboard. */
  private readonly carets: Partial<Record<SourceKey, [number, number]>> = {};

  protected onInput(key: SourceKey, e: Event) { this.source.edit(key, (e.target as HTMLInputElement).value); }

  protected onBlur(key: SourceKey, e: Event) {
    const el = e.target as HTMLInputElement;
    this.carets[key] = [el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length];
    this.source.commit(key);
  }

  protected commit(key: SourceKey) { this.source.commit(key); }

  /** A chip puts its placeholder at the caret (the chip keeps the field focused on mouse and touch). */
  protected insert(key: SourceKey, name: string, input: HTMLInputElement) {
    const t = input.value;
    const focused = document.activeElement === input;
    const [a, b] = focused ? [input.selectionStart ?? t.length, input.selectionEnd ?? t.length] : this.carets[key] ?? [t.length, t.length];
    const token = `{${name}}`;
    const next = t.slice(0, a) + token + t.slice(b);
    input.value = next;
    this.source.edit(key, next);
    input.focus();
    input.setSelectionRange(a + token.length, a + token.length);
  }

  protected fix(key: SourceKey, fix: Fix, input: HTMLInputElement) {
    this.source.edit(key, fix.apply(input.value));
    this.source.commit(key);
    this.refocus(input);
  }

  protected reset(key: SourceKey, input: HTMLInputElement) {
    this.source.reset(key);
    input.value = this.source.templates()[key];
    this.refocus(input);
  }

  protected resetAll() { this.source.resetAll(); }

  /** The button pressed may vanish (a fix done, a reset to default): keep keyboard focus nearby. Not on a
   *  phone, where focusing the field would open the keyboard. */
  private refocus(input: HTMLInputElement) {
    if (!this.layout.mobile()) input.focus();
  }

  // ---- Test ----

  private readonly result = signal<TestResult | null>(null);
  /** The latest result, while it is for the address the field resolves to now. */
  protected readonly test = computed(() => {
    const r = this.result();
    return r && r.url === this.fields().image.url ? r : null;
  });

  protected async runTest() {
    const url = this.fields().image.url;
    if (!url || this.test()?.state === 'testing') return;
    this.result.set({ url, state: 'testing' });
    const r = await probeImage(url);
    if (this.result()?.url !== url) return;
    this.result.set(r.ok
      ? { url, state: 'ok', size: `${r.width} × ${r.height}`, time: `${Math.max(0.1, r.ms / 1000).toFixed(1)} s` }
      : { url, state: 'fail' });
  }

  protected noDefault(e: Event) { e.preventDefault(); }
}
