import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/** Same breakpoint as the `mobile:` variant in styles.css. */
export const MOBILE_QUERY = '(max-width: 767.98px), (pointer: coarse)';
/** A keyboard (or at least a fine pointer) is around: show keybindings even on the mobile layout. */
export const FINE_POINTER_QUERY = '(any-pointer: fine)';

function watch(query: string, destroyRef: DestroyRef) {
  const mql = typeof matchMedia === 'function' ? matchMedia(query) : null;
  const s = signal(mql?.matches ?? false);
  if (mql) {
    const onChange = (e: MediaQueryListEvent) => s.set(e.matches);
    mql.addEventListener('change', onChange);
    destroyRef.onDestroy(() => mql.removeEventListener('change', onChange));
  }
  return s.asReadonly();
}

@Injectable({ providedIn: 'root' })
export class LayoutService {
  private destroyRef = inject(DestroyRef);
  readonly mobile = watch(MOBILE_QUERY, this.destroyRef);
  readonly finePointer = watch(FINE_POINTER_QUERY, this.destroyRef);
  readonly viewport = signal({ w: window.innerWidth, h: window.innerHeight });

  constructor() {
    const onResize = () => this.viewport.set({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    this.destroyRef.onDestroy(() => window.removeEventListener('resize', onResize));
  }
}
