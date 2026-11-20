import { ApplicationRef, Injectable, inject } from '@angular/core';

/** next/prev slide the page strip one page over; arrive sharpens a page that was still loading in place;
 *  jump fades the whole strip (library, Go); none swaps instantly. */
export type TurnDirection = 'next' | 'prev' | 'arrive' | 'jump' | 'none';
export type StripTurn = 'next' | 'prev' | 'arrive';

/** The page strip's animations (the reader registers itself). `before` runs on the old state, `after` once
 *  the new one is rendered. */
export interface StripAnimator {
  before(dir: StripTurn): void;
  after(dir: StripTurn): void;
  /** Ends any running turn at once (a new turn or a drag never waits for it). */
  settle(): void;
  /** A swipe let go short of the snap mark: the strip springs back from `fromX`. */
  springBack(fromX: number): void;
}

interface ViewTransitionLike { finished: Promise<void>; skipTransition(): void; }
type DocWithVT = Document & { startViewTransition?: (cb: () => void) => ViewTransitionLike };

/** Runs a page change: next/prev/arrive through the page strip's own animation, jump inside a View Transition
 *  (a fade), with an instant swap where neither is available. */
@Injectable({ providedIn: 'root' })
export class PageTurnService {
  private appRef = inject(ApplicationRef);
  private current: ViewTransitionLike | null = null;
  private strip: StripAnimator | null = null;

  attach(animator: StripAnimator): () => void {
    this.strip = animator;
    return () => { if (this.strip === animator) this.strip = null; };
  }

  get animator(): StripAnimator | null { return this.strip; }

  run(dir: TurnDirection, update: () => void) {
    // A new turn never waits for the previous animation: reading speed wins.
    this.current?.skipTransition();
    if (dir === 'next' || dir === 'prev' || dir === 'arrive') {
      const strip = this.strip;
      strip?.before(dir);
      update();
      if (strip) { this.appRef.tick(); strip.after(dir); }
      return;
    }
    this.strip?.settle();
    const doc = document as DocWithVT;
    if (dir === 'none' || !doc.startViewTransition) { update(); return; }
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
