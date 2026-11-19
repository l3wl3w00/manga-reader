import { ApplicationRef, Injectable, inject } from '@angular/core';

/** next/prev slide-wipe the page; jump fades it in (library, Go); none swaps instantly. */
export type TurnDirection = 'next' | 'prev' | 'jump' | 'none';

interface ViewTransitionLike { finished: Promise<void>; skipTransition(): void; }
type DocWithVT = Document & { startViewTransition?: (cb: () => void) => ViewTransitionLike };

/** Runs a page change inside a View Transition, so the old page wipes away in the reading
 *  direction. Falls back to an instant swap where the API is missing. */
@Injectable({ providedIn: 'root' })
export class PageTurnService {
  private appRef = inject(ApplicationRef);
  private current: ViewTransitionLike | null = null;

  run(dir: TurnDirection, update: () => void) {
    const doc = document as DocWithVT;
    if (dir === 'none' || !doc.startViewTransition) { update(); return; }
    // A new turn never waits for the previous animation: reading speed wins.
    this.current?.skipTransition();
    const root = doc.documentElement;
    root.dataset['turn'] = dir;
    const t = doc.startViewTransition(() => { update(); this.appRef.tick(); });
    this.current = t;
    t.finished.finally(() => {
      if (this.current !== t) return;
      this.current = null;
      delete root.dataset['turn'];
    });
  }
}
