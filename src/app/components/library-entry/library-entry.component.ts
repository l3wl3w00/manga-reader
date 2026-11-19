import { Component, computed, inject, input } from '@angular/core';
import { LibraryEntry, LibraryService, relativeTime } from '../../services/library.service';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Title, place ("CH 214 · P 07/19"), status and progress of one library entry. */
@Component({
  selector: 'app-library-entry',
  host: { class: 'flex min-w-0 flex-1 flex-col gap-[5px]' },
  template: `
    <span class="truncate font-bold" [class]="large() ? 'text-base' : 'text-sm'">{{ name() }}</span>
    <span class="flex items-center gap-2 whitespace-nowrap font-mono text-[11px] text-dim">
      CH {{ entry().lastChapter ?? 1 }} · P {{ place() }}
      @if (current()) {
        <span class="tag tag-fill">Reading</span>
      } @else if (done()) {
        <span class="tag text-dim">Done</span>
      } @else if (lastRead()) {
        <span class="truncate text-mute">{{ lastRead() }}</span>
      }
    </span>
    <span class="prg" [class.prg-cur]="current()"
      [attr.title]="pct() === null ? 'Chapter length not known yet' : null">
      @if (pct() !== null) { <i [style.transform]="'scaleX(' + pct()! / 100 + ')'"></i> }
    </span>
  `,
})
export class LibraryEntryComponent {
  private lib = inject(LibraryService);
  readonly entry = input.required<LibraryEntry>();
  readonly current = input(false);
  readonly large = input(false);

  protected readonly name = computed(() => this.lib.formatName(this.entry().slug));
  private readonly total = computed(() => this.lib.lastChapterLength(this.entry()));
  protected readonly place = computed(() => {
    const page = pad2(this.entry().lastPage ?? 1), total = this.total();
    return total ? `${page}/${pad2(total)}` : page;
  });
  protected readonly pct = computed(() => {
    const total = this.total();
    return total ? Math.min(100, Math.round(((this.entry().lastPage ?? 1) / total) * 100)) : null;
  });
  protected readonly done = computed(() => this.pct() === 100);
  protected readonly lastRead = computed(() => relativeTime(this.entry().updatedAt, this.lib.now()));
}
