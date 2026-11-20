import { Directive, ElementRef, afterRenderEffect, inject, input } from '@angular/core';

/** A neighbour is drawn from a copy this many pixels wide (about 1/32 of a page): nothing larger than about a
 *  third of the page can survive, and the blur works on a few hundred pixels. */
export const TINY_WIDTH = 20;
/** Blur, as a share of the tiny copy's width (page width / 8 at full size). */
const BLUR_SHARE = 1 / 8;
/** Luminance is pulled this far toward the neighbour grey, so what is left is overall tone in a narrow band:
 *  black and white panels, a huge page number or a face end up a few percent apart. */
const TONE_FLATTEN = 0.82;
const NEIGHBOUR_GREY = '110 107 100'; // --color-nb

/** Draws `img` onto `canvas` as tone only: shrunk to ~20px wide, blurred by about an eighth of the page, its
 *  luminance squeezed into a narrow band and darkened. The strip scales it back up with CSS: a hidden neighbour
 *  costs one tiny static bitmap and no filter per frame. A cross-origin page taints the canvas, which only stops
 *  reading it back; showing it is fine. */
export function drawTinyPage(canvas: HTMLCanvasElement, img: HTMLImageElement | null) {
  if (!img?.naturalWidth) return;
  const w = TINY_WIDTH;
  const h = Math.max(8, Math.round((img.naturalHeight / img.naturalWidth) * w));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const blur = w * BLUR_SHARE;
  ctx.fillStyle = `rgb(${NEIGHBOUR_GREY})`;
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = 'high';
  // Canvas filters are missing in older Safari: there the 20px copy and the tone squeeze below do the work.
  if (typeof (ctx as { filter?: unknown }).filter === 'string') {
    ctx.filter = `blur(${blur}px)`;
    ctx.drawImage(img, -blur, -blur, w + 2 * blur, h + 2 * blur);
    ctx.filter = 'none';
  } else {
    ctx.drawImage(img, 0, 0, w, h);
  }
  ctx.fillStyle = `rgb(${NEIGHBOUR_GREY} / ${TONE_FLATTEN})`;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgb(0 0 0 / 0.35)';
  ctx.fillRect(0, 0, w, h);
}

@Directive({ selector: 'canvas[appTinyPage]', host: { 'aria-hidden': 'true' } })
export class TinyPageDirective {
  readonly image = input.required<HTMLImageElement | null>({ alias: 'appTinyPage' });

  constructor() {
    const canvas = inject<ElementRef<HTMLCanvasElement>>(ElementRef).nativeElement;
    afterRenderEffect(() => drawTinyPage(canvas, this.image()));
  }
}
