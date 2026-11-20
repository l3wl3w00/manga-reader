import { Injectable, signal } from '@angular/core';

/** The strip only ever shows a handful of pages; older ones are let go. */
const LIMIT = 10;

/** Pages fetched ahead (the strip's neighbours) and the page on screen, as decoded images. A turn onto a
 *  page that is already here is instant, and the strip draws its hidden neighbours from these. */
@Injectable({ providedIn: 'root' })
export class PreloadService {
  private readonly loaded = signal<ReadonlyMap<string, HTMLImageElement>>(new Map());
  private readonly pending = new Map<string, (() => void)[]>();
  /** Addresses that answered 404 when fetched ahead (a chapter that is not out yet, say). */
  private readonly gone = signal<ReadonlySet<string>>(new Set());

  missing(url: string): boolean { return this.gone().has(url); }

  get(url: string): HTMLImageElement | null { return this.loaded().get(url) ?? null; }
  ready(url: string): boolean { return this.loaded().has(url); }

  add(url: string, img: HTMLImageElement) {
    const next = new Map(this.loaded());
    next.delete(url);
    next.set(url, img);
    while (next.size > LIMIT) next.delete(next.keys().next().value!);
    this.loaded.set(next);
  }

  /** Fetches and decodes `url` once. `onMissing` runs if it 404s (the chapter ended before it). */
  load(url: string, onMissing?: () => void) {
    if (this.loaded().has(url)) return;
    const waiting = this.pending.get(url);
    if (waiting) { if (onMissing) waiting.push(onMissing); return; }
    this.pending.set(url, onMissing ? [onMissing] : []);
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.onload = async () => {
      try { await img.decode?.(); } catch { /* still drawable */ }
      this.pending.delete(url);
      if (this.gone().has(url)) { const g = new Set(this.gone()); g.delete(url); this.gone.set(g); }
      this.add(url, img);
    };
    img.onerror = () => {
      const callbacks = this.pending.get(url) ?? [];
      this.pending.delete(url);
      this.gone.set(new Set(this.gone()).add(url));
      callbacks.forEach(cb => cb());
    };
    img.src = url;
  }
}
