import { Injectable, computed, signal } from '@angular/core';
import {
  DEFAULT_SOURCE, SOURCE_KEYS, SOURCE_STORAGE, SourceKey, SourceTemplates, isUsable, normalizeSource, resolve, siteLabel,
  storedSource,
} from './source';

function readStored(): SourceTemplates {
  try {
    const raw = localStorage.getItem(SOURCE_STORAGE);
    return normalizeSource(raw ? JSON.parse(raw) : null);
  } catch { return { ...DEFAULT_SOURCE }; }
}

/** The one place URLs are made: page images (the reader, the pages fetched ahead, covers), the search link
 *  and the "open chapter on site" link, from the templates in Settings > Source. Only valid templates are
 *  ever used: text that fails its check stays a draft in the settings field ("Not saved"). */
@Injectable({ providedIn: 'root' })
export class SourceService {
  /** The templates in use (always valid). */
  readonly templates = signal<SourceTemplates>(readStored());
  /** Field text that differs from the template in use: being typed, or invalid and not saved. */
  readonly drafts = signal<Partial<SourceTemplates>>({});
  /** Fields whose last save was refused (invalid). */
  readonly refused = signal<ReadonlySet<SourceKey>>(new Set());

  readonly image = computed(() => this.templates().image);
  /** How buttons name the sites, or null when the link is emptied (its buttons are hidden). */
  readonly searchSite = computed(() => siteLabel(this.templates().search, 'search'));
  readonly chapterSite = computed(() => siteLabel(this.templates().chapter, 'chapter'));
  readonly imageEdited = computed(() => this.templates().image !== DEFAULT_SOURCE.image);

  pageUrl(manga: string, ch: number, pg: number): string {
    return resolve(this.templates().image, 'image', { manga, ch, pg });
  }

  /** Null when the search link is emptied. */
  searchUrl(name: string): string | null {
    const t = this.templates().search;
    return t && name.trim() ? resolve(t, 'search', { manga: name }) : null;
  }

  /** Null when the chapter link is emptied. */
  chapterUrl(manga: string, ch: number): string | null {
    const t = this.templates().chapter;
    return t ? resolve(t, 'chapter', { manga, ch }) : null;
  }

  /** What the field shows. */
  text(key: SourceKey): string { return this.drafts()[key] ?? this.templates()[key]; }

  edit(key: SourceKey, text: string) {
    this.drafts.update(d => ({ ...d, [key]: text }));
  }

  /** Saves the field's text if it is valid (blur, Enter, a fix). False when it was refused. */
  commit(key: SourceKey): boolean {
    const text = this.text(key).trim();
    if (!isUsable(key, text)) { this.refused.update(s => new Set(s).add(key)); return false; }
    this.apply(key, text);
    return true;
  }

  reset(key: SourceKey) { this.apply(key, DEFAULT_SOURCE[key]); }

  resetAll() { SOURCE_KEYS.forEach(k => this.reset(k)); }

  private apply(key: SourceKey, text: string) {
    this.drafts.update(d => { const { [key]: _, ...rest } = d; return rest; });
    this.refused.update(s => { const n = new Set(s); n.delete(key); return n; });
    if (this.templates()[key] === text) return;
    this.templates.update(t => ({ ...t, [key]: text }));
    const stored = storedSource(this.templates());
    try {
      if (stored) localStorage.setItem(SOURCE_STORAGE, JSON.stringify(stored));
      else localStorage.removeItem(SOURCE_STORAGE);
    } catch { /* private mode: for this visit only */ }
  }
}
