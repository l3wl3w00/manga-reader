/** Keyboard focus kept inside a modal: Tab off the last control wraps to the first, Shift+Tab back. */

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)]
    .filter(el => !el.closest('[inert], [hidden]') && el.getAttribute('tabindex') !== '-1');
}

/** Where Tab should go instead of the browser's default, or null to let it be. */
export function wrapTarget(list: HTMLElement[], active: Element | null, back: boolean): HTMLElement | null {
  if (!list.length) return null;
  const first = list[0], last = list[list.length - 1];
  const i = active ? list.indexOf(active as HTMLElement) : -1;
  if (i === -1) return back ? last : first;
  if (back && active === first) return last;
  if (!back && active === last) return first;
  return null;
}
