import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReaderComponent } from './reader.component';
import { ClickZonesComponent } from '../click-zones/click-zones.component';
import { ReaderService } from '../../services/reader.service';
import { ZoomService } from '../../services/zoom.service';

@Component({ imports: [ReaderComponent, ClickZonesComponent], template: '<app-reader /><app-click-zones />' })
class Host {}

const mouse = (type: string, target: EventTarget, x: number, y: number) =>
  target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));

describe('ReaderComponent drag-pan over the click zones', () => {
  let next: ReturnType<typeof vi.spyOn>;
  let zone: HTMLElement;

  beforeEach(async () => {
    localStorage.clear();
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    TestBed.inject(ZoomService).zoom.set(2);
    next = vi.spyOn(TestBed.inject(ReaderService), 'nextPage').mockImplementation(() => {});
    zone = fixture.nativeElement.querySelector('button[aria-label^="Next page"]');
  });

  // Regression: a drag that ended over an edge zone also turned the page.
  it('does not turn the page when the drag ends', () => {
    mouse('mousedown', zone, 900, 400);
    mouse('mousemove', document, 840, 380);
    mouse('mouseup', zone, 840, 380);
    mouse('click', zone, 840, 380);
    expect(next).not.toHaveBeenCalled();
  });

  it('still turns the page on a plain click', () => {
    mouse('mousedown', zone, 900, 400);
    mouse('mouseup', zone, 900, 400);
    mouse('click', zone, 900, 400);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
