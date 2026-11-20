import type { LucideIconData } from '@lucide/angular';
import {
  ArrowRight, Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ExternalLink, Hand, Keyboard,
  Library, Minus, Pencil, Pin, PinOff, Plus, Pointer, RotateCcw, Scan, Search, Settings, Star, Trash2,
  TriangleAlert, X, ZoomIn,
} from 'lucide';
import type { IconNode } from 'lucide';

/** Plain icon data from `lucide`, not `@lucide/angular`'s per-icon components: each of those compiles into a
 *  full Angular component, which made the single-file build ~80 kB bigger for the same 25 icons. */
const icon = (name: string, node: IconNode): LucideIconData => ({ name, node });

/** Every Lucide icon the app uses (design system board). Render with `<svg [lucideIcon]="icons.x" />`. */
export const ICONS = {
  arrowRight: icon('arrow-right', ArrowRight),
  check: icon('check', Check),
  chevronLeft: icon('chevron-left', ChevronLeft),
  chevronRight: icon('chevron-right', ChevronRight),
  chevronsLeft: icon('chevrons-left', ChevronsLeft),
  chevronsRight: icon('chevrons-right', ChevronsRight),
  externalLink: icon('external-link', ExternalLink),
  hand: icon('hand', Hand),
  keyboard: icon('keyboard', Keyboard),
  library: icon('library', Library),
  minus: icon('minus', Minus),
  pencil: icon('pencil', Pencil),
  pin: icon('pin', Pin),
  pinOff: icon('pin-off', PinOff),
  plus: icon('plus', Plus),
  pointer: icon('pointer', Pointer),
  reset: icon('rotate-ccw', RotateCcw),
  scan: icon('scan', Scan),
  search: icon('search', Search),
  settings: icon('settings', Settings),
  star: icon('star', Star),
  trash: icon('trash-2', Trash2),
  alert: icon('triangle-alert', TriangleAlert),
  x: icon('x', X),
  zoomIn: icon('zoom-in', ZoomIn),
} as const;
