import {
  ArrowRight, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ExternalLink, Hand,
  Keyboard, Library, Minus, Pencil, Pin, PinOff, Plus, Pointer, RotateCcw, Scan, Search, Settings, Star,
  Trash2, TriangleAlert, X, ZoomIn,
} from 'lucide-angular';

/** Every Lucide icon the app uses (design system board). */
export const ICONS = {
  arrowRight: ArrowRight, chevronLeft: ChevronLeft, chevronRight: ChevronRight,
  chevronsLeft: ChevronsLeft, chevronsRight: ChevronsRight, externalLink: ExternalLink, hand: Hand,
  keyboard: Keyboard, library: Library, minus: Minus, pencil: Pencil, pin: Pin, pinOff: PinOff, plus: Plus,
  pointer: Pointer, reset: RotateCcw, scan: Scan, search: Search, settings: Settings, star: Star,
  trash: Trash2, alert: TriangleAlert, x: X, zoomIn: ZoomIn,
} as const;
