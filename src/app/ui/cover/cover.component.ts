import { Component, computed, inject, input, signal } from '@angular/core';
import { LibraryService } from '../../services/library.service';

/** Picks one of the seven screentone fallbacks from the slug, so a title keeps its look. */
export function coverVariant(slug: string): number {
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) % 7;
}

/** A title's cover: chapter 1 page 1 from the image host, over a screentone fallback with initials. */
@Component({
  selector: 'app-cover',
  host: {
    '[class]': "'relative block shrink-0 overflow-hidden border-2 border-paper ' + (large() ? 'w-14 h-[78px]' : 'w-[42px] h-[58px]')",
    'aria-hidden': 'true',
  },
  template: `
    <span class="absolute inset-0" [class]="'cov-' + variant()"></span>
    @if (!failed()) {
      <img [src]="url()" referrerpolicy="no-referrer" alt="" loading="lazy" draggable="false"
        class="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-300"
        [class.opacity-100]="loaded()" (load)="loaded.set(true)" (error)="failed.set(true)" />
    }
    <b class="absolute left-0 bottom-0 bg-ink px-1 py-0.5 font-display font-normal text-[11px] leading-[1.1] text-paper">{{ initials() }}</b>
  `,
})
export class CoverComponent {
  private lib = inject(LibraryService);
  readonly slug = input.required<string>();
  readonly large = input(false);

  protected readonly loaded = signal(false);
  protected readonly failed = signal(false);
  protected readonly variant = computed(() => coverVariant(this.slug()));
  protected readonly initials = computed(() => this.lib.initials(this.slug()));
  protected readonly url = computed(() => {
    const s = this.slug();
    return `https://images.mangafreak.me/mangas/${s}/${s}_1/${s}_1_1.jpg`;
  });
}
