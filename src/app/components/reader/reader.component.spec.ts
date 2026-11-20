import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReaderComponent } from './reader.component';
import { ReaderService, buildUrl } from '../../services/reader.service';
import { ZoomService } from '../../services/zoom.service';
import { UiService } from '../../services/ui.service';
import { LibraryService } from '../../services/library.service';

@Component({ imports: [ReaderComponent], template: '<app-reader />' })
class Host {}

const M = 'crimson_tide_ronin';
const mouse = (type: string, target: EventTarget, x: number, y: number) =>
  target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));

/** Reading page `page` of chapter `chapter`, as if it had just loaded. */
async function readingAt(page: number, total: number | null = 19, chapter = 214) {
  const reader = TestBed.inject(ReaderService);
  const spot = { manga: M, chapter, page };
  reader.manga.set(M); reader.chapter.set(chapter); reader.page.set(page); reader.totalPages.set(total);
  reader.lastGood.set(spot); reader.imgSrc.set(buildUrl(M, chapter, page)); reader.screen.set('image');
  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();
  return fixture;
}

const button = (f: ComponentFixture<Host>, label: string) =>
  (f.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(`button[aria-label^="${label}"]`);

describe('ReaderComponent page strip (desktop)', () => {
  let reader: ReaderService;
  let ui: UiService;

  beforeEach(() => {
    localStorage.clear();
    reader = TestBed.inject(ReaderService);
    ui = TestBed.inject(UiService);
    vi.spyOn(reader, 'nextPage').mockImplementation(() => true);
    vi.spyOn(reader, 'prevPage').mockImplementation(() => true);
    vi.spyOn(reader, 'nextChapter').mockImplementation(() => {});
  });

  it('turns the page (page only) when a neighbour is clicked, without touching the panels', async () => {
    const f = await readingAt(7);
    button(f, 'Next page')!.click();
    button(f, 'Previous page')!.click();
    expect(reader.nextPage).toHaveBeenCalledTimes(1);
    expect(reader.prevPage).toHaveBeenCalledTimes(1);
    expect(ui.panelsLocked()).toBe(true);
  });

  it('shows the next-chapter teaser after the last page, and only it changes chapter', async () => {
    const f = await readingAt(19);
    expect(button(f, 'Next page')).toBeNull();
    button(f, 'Next chapter, 215')!.click();
    expect(reader.nextChapter).toHaveBeenCalledTimes(1);
    expect(reader.nextPage).not.toHaveBeenCalled();
    expect(f.nativeElement.textContent).toMatch(/Ch(apter)?\s*215/);
  });

  it('has nothing to click before chapter 1, page 1', async () => {
    const f = await readingAt(1, 19, 1);
    expect(button(f, 'Previous page')).toBeNull();
    expect(f.nativeElement.textContent).toContain('No earlier page');
  });

  it('locks or unlocks the panels on a click on the page', async () => {
    const f = await readingAt(7);
    (f.nativeElement.querySelector('app-reader') as HTMLElement).click();
    expect(ui.panelsLocked()).toBe(false);
  });

  it('keeps the neighbours clickable while zoomed in (page only), and a press on one never starts a pan', async () => {
    const f = await readingAt(7);
    const zoom = TestBed.inject(ZoomService);
    zoom.setZoom(2, 512, 300);
    await f.whenStable();
    const next = button(f, 'Next page')!;
    mouse('mousedown', next, 1000, 300);
    expect(zoom.isDragging()).toBe(false);
    mouse('mouseup', next, 1000, 300);
    next.click();
    expect(reader.nextPage).toHaveBeenCalledTimes(1);
    expect(ui.panelsLocked()).toBe(true);
  });

  it('locks or unlocks the panels on a plain click inside the zoomed frame', async () => {
    const f = await readingAt(7);
    TestBed.inject(ZoomService).setZoom(2, 512, 300);
    await f.whenStable();
    const frame = f.nativeElement.querySelector('.slot-cur .slot-box') as HTMLElement;
    mouse('mousedown', frame, 500, 300);
    mouse('mouseup', frame, 500, 300);
    mouse('click', frame, 500, 300);
    expect(ui.panelsLocked()).toBe(false);
    expect(reader.nextPage).not.toHaveBeenCalled();
  });

  // Regression: a zoomed drag that started on a neighbour and ended over the page locked the panels.
  it('neither locks the panels nor turns the page when a press on a neighbour is dragged off it', async () => {
    const f = await readingAt(7);
    TestBed.inject(ZoomService).setZoom(2, 512, 300);
    await f.whenStable();
    const next = button(f, 'Next page')!;
    const stage = f.nativeElement.querySelector('app-reader') as HTMLElement;
    mouse('mousedown', next, 1000, 300);
    mouse('mousemove', document, 800, 300);
    mouse('mouseup', stage, 600, 300);
    mouse('click', stage, 600, 300);
    expect(ui.panelsLocked()).toBe(true);
    expect(reader.nextPage).not.toHaveBeenCalled();
  });

  it('does nothing on a click on an inert neighbour (an earlier chapter\'s page)', async () => {
    TestBed.inject(LibraryService).saveProgress(M, 213, 22);
    TestBed.inject(LibraryService).saveChapterLength(M, 213, 22);
    const f = await readingAt(1);
    const inert = f.nativeElement.querySelector('.nb-inert') as HTMLElement;
    expect(inert).not.toBeNull();
    inert.click();
    expect(ui.panelsLocked()).toBe(true);
    expect(reader.prevPage).not.toHaveBeenCalled();
  });

  // Regression: a drag that ended over an edge zone also turned the page.
  it('neither turns the page nor toggles the panels when a drag-pan ends', async () => {
    const f = await readingAt(7);
    TestBed.inject(ZoomService).setZoom(2, 512, 300);
    await f.whenStable();
    const stage = f.nativeElement.querySelector('app-reader') as HTMLElement;
    mouse('mousedown', stage, 900, 400);
    mouse('mousemove', document, 840, 380);
    mouse('mouseup', stage, 840, 380);
    mouse('click', stage, 840, 380);
    expect(reader.nextPage).not.toHaveBeenCalled();
    expect(ui.panelsLocked()).toBe(true);
  });
});
