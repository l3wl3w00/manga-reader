/** Fitting the reading overlays (key hints, caption) into the dark gutter beside the page, so they never
 *  print over it. Both are JetBrains Mono, whose advance is 0.6em, so their width is exact arithmetic. */

const MONO_ADVANCE = 0.6;
/** .folio: 11px, 0.14em tracking. */
export const folioWidth = (text: string) => text.length * 11 * (MONO_ADVANCE + 0.14);
/** .key.key-sm: 12px bold mono, 8px padding and a 2px border each side. */
const keyWidth = (label: string) => label.length * 12 * MONO_ADVANCE + 20;

/** Distance from the screen edge to the overlay's text (a 16px inset plus the ink chip's 8px padding), and the
 *  space kept free before the page (the chip's right padding fits inside it). */
export const OVERLAY_LEFT = 24;
const PAGE_GAP = 12;

export const fits = (width: number, gutter: number) => OVERLAY_LEFT + width + PAGE_GAP <= gutter;

/** Width of "[Tab] peek panels  [Ctrl] lock panels" (gap-2, ml-2.5 before the second key). */
export function keyHintsWidth(peekKey: string, lockKey: string): number {
  return keyWidth(peekKey) + 8 + folioWidth('peek panels') + 8 + 10 + keyWidth(lockKey) + 8 + folioWidth('lock panels');
}

/** The longest caption that fits, or null when none does. */
export function fitCaption(gutter: number, ...options: string[]): string | null {
  return options.find(o => fits(folioWidth(o), gutter)) ?? null;
}
