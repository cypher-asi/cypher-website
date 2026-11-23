import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {restoreCatalogScroll} from './restoreCatalogScroll';

let y: number, height: number, now: number;
let frame: FrameRequestCallback | undefined;
let card: Element | null;
let current: boolean;
let stop: (() => void) | undefined;
const position = {x: 0, y: 4200, width: 1024, cardTop: 200};
function tick(ms = 16) { now += ms; const next = frame; frame = undefined; next?.(now); }

beforeEach(() => {
  y=0; height=600; now=0; frame=undefined; card=null; current=true;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1024);
  vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => y);
  vi.spyOn(window, 'scrollTo').mockImplementation((options:any) => { y=Math.min(height,options.top); });
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback:FrameRequestCallback) => { frame=callback; return 1; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn(() => { frame=undefined; }));
});
afterEach(() => { stop?.(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('restores a deep position after delayed infinite rows mount, without waiting for images', () => {
  stop=restoreCatalogScroll(position, () => card, () => current);
  expect(y).toBe(600); // Browser clamps before the grid has enough height.
  tick(400);
  height=6000; card=document.createElement('img');
  tick();
  expect(y).toBe(4200);
  expect((card as HTMLImageElement).naturalWidth).toBe(0);
});

it('corrects a late router reset after initially reaching the saved position', () => {
  height=6000; card=document.createElement('a');
  stop=restoreCatalogScroll(position, () => card, () => current);
  expect(y).toBe(4200);
  tick(80); y=0; tick();
  expect(y).toBe(4200);
  tick(260);
  expect(frame).toBeUndefined();
});

it('stops immediately when the user starts scrolling', () => {
  stop=restoreCatalogScroll(position, () => card, () => current);
  window.dispatchEvent(new Event('wheel')); y=200; height=6000; tick();
  expect(y).toBe(200);
  expect(frame).toBeUndefined();
});

it('cannot overwrite a newer navigation', () => {
  stop=restoreCatalogScroll(position, () => card, () => current);
  current=false; y=0; height=6000; tick();
  expect(y).toBe(0);
  expect(frame).toBeUndefined();
});

it('bounds retries if the original card is no longer available', () => {
  stop=restoreCatalogScroll(position, () => card, () => current);
  tick(2001);
  expect(frame).toBeUndefined();
});

it('uses the source card as an anchor after a viewport resize', () => {
  vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(390);
  height=6000; y=100;
  card=document.createElement('a');
  vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({top:500} as DOMRect);
  stop=restoreCatalogScroll(position, () => card, () => current);
  expect(y).toBe(400);
});
