import { Injectable, computed, effect, signal } from '@angular/core';

/** `system` follows the OS "reduce motion" setting; `full` and `reduced` override it. */
export type MotionPref = 'system' | 'full' | 'reduced';
export type Motion = 'full' | 'reduced';

export const MOTION_STORAGE = 'manga-reader-motion';
const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

export function effectiveMotion(pref: MotionPref, systemReduced: boolean): Motion {
  if (pref === 'system') return systemReduced ? 'reduced' : 'full';
  return pref;
}

function readPref(): MotionPref {
  try {
    const v = localStorage.getItem(MOTION_STORAGE);
    return v === 'full' || v === 'reduced' ? v : 'system';
  } catch { return 'system'; }
}

/** Decides how much the UI animates. It sets `data-motion` on `<html>`; styles.css turns every animation
 *  into a short fade under `html[data-motion="reduced"]`. (Chrome on Linux reports reduced motion whenever
 *  the desktop's animations are off, e.g. KDE at "Instant", so the system choice can be overridden here.) */
@Injectable({ providedIn: 'root' })
export class MotionService {
  readonly pref = signal<MotionPref>(readPref());
  readonly systemReduced = signal(false);
  readonly motion = computed(() => effectiveMotion(this.pref(), this.systemReduced()));

  constructor() {
    const mq = typeof matchMedia === 'function' ? matchMedia(REDUCE_QUERY) : null;
    if (mq) {
      this.systemReduced.set(mq.matches);
      mq.addEventListener?.('change', e => this.systemReduced.set(e.matches));
    }
    // Set it now, before the first render, and keep it in step after.
    document.documentElement.dataset['motion'] = this.motion();
    effect(() => { document.documentElement.dataset['motion'] = this.motion(); });
  }

  set(pref: MotionPref) {
    this.pref.set(pref);
    try {
      if (pref === 'system') localStorage.removeItem(MOTION_STORAGE);
      else localStorage.setItem(MOTION_STORAGE, pref);
    } catch { /* private mode: for this visit only */ }
  }
}
