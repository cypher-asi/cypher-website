import {act, cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import StorePageTransition from './StorePageTransition';

const route = vi.hoisted(() => ({path: '/store/browse', push: vi.fn(), prefetch: vi.fn()}));
vi.mock('next/navigation', () => ({usePathname: () => route.path, useRouter: () => ({push: route.push, prefetch: route.prefetch})}));
const moves: Array<{element:Element;frames:Keyframe[];y:number}> = [];
let finishExit: (()=>void) | undefined;
let holdExit = false;
let y = 1200;
const view = (product: boolean, card = true, key = 'page') => <><StorePageTransition key={`${key}-controller`}/><main id="page-main" key={`${key}-content`}>{product
  ? <div data-product-hero><img src="/hat.webp" alt="Hat detail"/></div>
  : card ? <article><a href="/store/HDWR_001?color=chalk"><img src="/hat.webp" alt="Hat"/></a></article> : <p>Restoring products</p>}</main></>;

beforeEach(() => {
  route.path = '/store/browse'; route.push.mockReset(); route.prefetch.mockReset();
  moves.length=0; holdExit=false; finishExit=undefined; y=1200;
  window.history.replaceState({key:'browse'}, '', '/store/browse');
  vi.stubGlobal('matchMedia', vi.fn(() => ({matches:false})));
  vi.spyOn(window,'scrollY','get').mockImplementation(()=>y);
  vi.spyOn(window,'scrollTo').mockImplementation((options:any)=>{y=options.top;});
  vi.spyOn(HTMLImageElement.prototype,'complete','get').mockReturnValue(true);
  vi.spyOn(HTMLImageElement.prototype,'naturalWidth','get').mockReturnValue(500);
  vi.spyOn(HTMLImageElement.prototype,'getBoundingClientRect').mockImplementation(function(this: HTMLImageElement) {
    const detail=Boolean(this.closest('[data-product-hero]'));
    return {top:100,bottom:detail?700:400,left:detail?30:300,right:detail?630:600,width:detail?600:300,height:detail?600:300,x:detail?30:300,y:100,toJSON:()=>({})};
  });
  Object.defineProperty(Element.prototype,'animate',{configurable:true,value:vi.fn(function(this:Element,frames:Keyframe[],options:KeyframeAnimationOptions){
    moves.push({element:this,frames,y});
    let done:()=>void=()=>{};
    const finished=holdExit&&options.duration===90 ? new Promise<void>(resolve=>{done=resolve;finishExit=resolve;}) : Promise.resolve();
    return {finished,cancel:vi.fn(()=>done())};
  })});
});
afterEach(async () => {
  cleanup();
  await new Promise(done=>setTimeout(done,10));
  vi.restoreAllMocks();vi.unstubAllGlobals();
  delete (Element.prototype as Partial<Element>).animate;
  delete (HTMLImageElement.prototype as Partial<HTMLImageElement>).decode;
  delete window.__wwHistoryBridgeInstalled;
  delete window.__wwHandlePopstate;
});

it('starts navigation immediately and keeps the grid visible while the route loads', async () => {
  holdExit=true;
  const ui=render(view(false));
  fireEvent.click(ui.getByAltText('Hat'));
  expect(route.push).toHaveBeenCalledWith('/store/HDWR_001?color=chalk',{scroll:false});
  // The page is never dimmed, hidden or faded (that caused a visible blink).
  expect(moves.some(move=>move.element.id==='page-main')).toBe(false);
  expect(document.querySelectorAll('.ww-transition-image')).toHaveLength(1);
  expect(ui.getByAltText('Hat').style.visibility).toBe('');
  expect(document.querySelector<HTMLElement>('.ww-transition-image')?.style.visibility).toBe('hidden');
  await act(async()=>finishExit?.());
  await waitFor(()=>expect(route.push).toHaveBeenCalledWith('/store/HDWR_001?color=chalk',{scroll:false}));
  expect(document.getElementById('page-main')?.style.opacity).toBe('');
  await act(async()=>{route.path='/store/HDWR_001';ui.rerender(view(true));});
  await waitFor(()=>expect(document.querySelector('.ww-transition-image')).toBeNull());
  expect(moves.some(move=>move.element.id==='page-main')).toBe(false);
  expect(moves[0].frames).toEqual([
    {transform:'translate(0px, 0px) scale(1, 1)'},
    {transform:'translate(-270px, 0px) scale(2, 2)'},
  ]);
  expect(document.getElementById('page-main')?.style.opacity).toBe('');
  expect(ui.getByAltText('Hat detail').style.visibility).toBe('');
});

it('returns to a delayed grid and the exact saved scroll without adding history entries', async () => {
  const ui=render(view(false));
  fireEvent.click(ui.getByAltText('Hat'));
  await waitFor(()=>expect(route.push).toHaveBeenCalled());
  await act(async()=>{route.path='/store/HDWR_001';ui.rerender(view(true));});
  await waitFor(()=>expect(document.querySelector('.ww-transition-image')).toBeNull());
  Object.defineProperty(HTMLImageElement.prototype,'decode',{configurable:true,value:vi.fn(()=>new Promise<void>(()=>{}))});
  const pushState=vi.spyOn(window.history,'pushState');
  const pop=vi.fn(()=>{route.path='/store/browse';ui.rerender(view(false,false));});
  window.addEventListener('popstate',pop);
  // The real router can publish its new pathname before dispatching popstate,
  // while the outgoing product is still on screen.
  await act(async()=>{route.path='/store/browse';ui.rerender(view(true));});
  await act(async()=>window.dispatchEvent(new PopStateEvent('popstate',{state:{key:'browse'}})));
  await waitFor(()=>expect(pop).toHaveBeenCalledTimes(1));
  await act(async()=>{y=800;ui.rerender(view(false));});
  await waitFor(()=>expect(document.querySelector('.ww-transition-image')).toBeNull());
  expect(moves[1].y).toBe(1200);
  expect(moves[1].frames[1]).toEqual({transform:'translate(270px, 0px) scale(0.5, 0.5)'});
  expect(HTMLImageElement.prototype.decode).not.toHaveBeenCalled();
  expect(pushState).not.toHaveBeenCalled();
  expect(route.push).toHaveBeenCalledTimes(1);
  window.removeEventListener('popstate',pop);
});

it('can cancel an outgoing navigation before the route changes', async () => {
  holdExit=true;
  const ui=render(view(false));
  fireEvent.click(ui.getByAltText('Hat'));
  window.history.replaceState({},'','/economy');
  await act(async()=>window.dispatchEvent(new PopStateEvent('popstate')));
  expect(document.querySelector('.ww-transition-image')).toBeNull();
  expect(document.documentElement.dataset.storeTransition).toBeUndefined();
  expect(ui.getByAltText('Hat').style.visibility).toBe('');
  expect(route.push).toHaveBeenCalledTimes(1);
});

it('keeps scroll restoration without animations when reduced motion is requested', () => {
  vi.mocked(window.matchMedia).mockReturnValue({matches:true} as MediaQueryList);
  const ui=render(view(false));
  const anchor=ui.getByAltText('Hat').closest('a')!;
  anchor.addEventListener('click',event=>event.preventDefault()); // Avoid jsdom navigating.
  fireEvent.click(anchor);
  expect(route.push).toHaveBeenCalledWith('/store/HDWR_001?color=chalk',{scroll:false});
  expect(moves).toHaveLength(0);
  expect(document.querySelector('.ww-transition-image')).toBeNull();
});

it('still reveals the destination when image decoding fails', async () => {
  Object.defineProperty(HTMLImageElement.prototype,'decode',{configurable:true,value:()=>Promise.reject(new Error('broken image'))});
  const ui=render(view(false));
  fireEvent.click(ui.getByAltText('Hat'));
  await waitFor(()=>expect(route.push).toHaveBeenCalled());
  await act(async()=>{route.path='/store/HDWR_001';ui.rerender(view(true));});
  await waitFor(()=>expect(document.documentElement.dataset.storeTransition).toBeUndefined());
  expect(document.getElementById('page-main')?.style.opacity).toBe('');
  expect(document.querySelector('.ww-transition-image')).toBeNull();
});

it('warms only the intended product route, including its selected finish', () => {
  const ui=render(view(false));
  fireEvent.pointerOver(ui.getByAltText('Hat'));
  fireEvent.pointerDown(ui.getByAltText('Hat'));
  fireEvent.focusIn(ui.getByAltText('Hat').closest('a')!);
  expect(route.prefetch).toHaveBeenCalledExactlyOnceWith('/store/HDWR_001?color=chalk');
});

it('cleans up overlays and hidden content if unmounted during navigation', async () => {
  holdExit=true;
  const ui=render(view(false));
  fireEvent.click(ui.getByAltText('Hat'));
  await act(async()=>ui.unmount());
  await waitFor(()=>expect(document.querySelector('.ww-transition-image')).toBeNull());
  expect(document.documentElement.dataset.storeTransition).toBeUndefined();
  expect(route.push).toHaveBeenCalledTimes(1);
});

it('captures Back before a synchronous router replaces the product', async () => {
  const bridge = (event:PopStateEvent) => window.__wwHandlePopstate?.(event);
  window.__wwHistoryBridgeInstalled = true;
  window.addEventListener('popstate', bridge, true);
  const ui = render(view(false));
  const routerPop = vi.fn(() => {route.path='/store/browse';ui.rerender(view(false));});
  window.addEventListener('popstate', routerPop, true);
  try {
    fireEvent.click(ui.getByAltText('Hat'));
    await waitFor(()=>expect(route.push).toHaveBeenCalled());
    await act(async()=>{route.path='/store/HDWR_001';ui.rerender(view(true));});
    await waitFor(()=>expect(document.querySelector('.ww-transition-image')).toBeNull());
    holdExit = true;
    await act(async()=>window.dispatchEvent(new PopStateEvent('popstate')));
    expect(routerPop).toHaveBeenCalledTimes(1);
    expect(document.querySelector<HTMLElement>('.ww-transition-image')?.style.width).toBe('600px');
    await act(async()=>finishExit?.());
    await waitFor(()=>expect(document.querySelector('.ww-transition-image')).toBeNull());
    expect(routerPop).toHaveBeenCalledTimes(1);
    expect(moves.at(-1)?.frames[1]).toEqual({transform:'translate(270px, 0px) scale(0.5, 0.5)'});
  } finally {
    window.removeEventListener('popstate', bridge, true);
    window.removeEventListener('popstate', routerPop, true);
  }
});

it('retains the moving image when the framework remounts the root layout', async () => {
  const ui=render(view(false));
  fireEvent.click(ui.getByAltText('Hat'));
  await waitFor(()=>expect(route.push).toHaveBeenCalled());
  await act(async()=>{route.path='/store/HDWR_001';ui.rerender(view(true,true,'remounted'));});
  await waitFor(()=>expect(document.querySelector('.ww-transition-image')).toBeNull());
  expect(moves.at(-1)?.frames[1]).toEqual({transform:'translate(-270px, 0px) scale(2, 2)'});
  expect(document.getElementById('page-main')?.style.opacity).toBe('');
  expect(document.documentElement.dataset.storeTransition).toBeUndefined();
});

it('lands on the image pixels inside mobile viewer padding without a size snap', async () => {
  vi.spyOn(HTMLImageElement.prototype,'naturalHeight','get').mockReturnValue(500);
  const ui=render(view(false));
  fireEvent.click(ui.getByAltText('Hat'));
  await waitFor(()=>expect(route.push).toHaveBeenCalled());
  await act(async()=>{route.path='/store/HDWR_001';ui.rerender(view(true));});
  Object.assign(ui.getByAltText('Hat detail').style,{padding:'24px',objectFit:'contain',objectPosition:'50% 50%'});
  await waitFor(()=>expect(document.querySelector('.ww-transition-image')).toBeNull());
  expect(moves.at(-1)?.frames[1]).toEqual({transform:'translate(-246px, 24px) scale(1.84, 1.84)'});
});

it('restores Back immediately when product entry is interrupted before its first animation frame', async () => {
  const ui=render(view(false));
  fireEvent.click(ui.getByAltText('Hat'));
  await act(async()=>{route.path='/store/HDWR_001';ui.rerender(view(true));});
  const pop=vi.fn((_event:PopStateEvent)=>{route.path='/store/browse';ui.rerender(view(false));});
  window.addEventListener('popstate',pop);
  try {
    await act(async()=>window.dispatchEvent(new PopStateEvent('popstate',{state:{__vinext_scrollY:0,routerKey:'preserve'}})));
    expect(y).toBe(1200);
    expect(pop.mock.calls[0][0].state).toMatchObject({__vinext_scrollY:1200,routerKey:'preserve'});
    await waitFor(()=>expect(document.querySelector('.ww-transition-image')).toBeNull());
    expect(y).toBe(1200);
    expect(document.getElementById('page-main')?.style.opacity).toBe('');
  } finally { window.removeEventListener('popstate',pop); }
});

it('retains the saved grid position across a root controller teardown and remount', async () => {
  let ui=render(view(false));
  fireEvent.click(ui.getByAltText('Hat'));
  await act(async()=>{route.path='/store/HDWR_001';ui.rerender(view(true));});
  await waitFor(()=>expect(document.querySelector('.ww-transition-image')).toBeNull());
  ui.unmount();
  await act(async()=>{await new Promise(done=>setTimeout(done,10));});
  ui=render(view(true));
  const pop=()=>{route.path='/store/browse';ui.rerender(view(false));};
  window.addEventListener('popstate',pop);
  try {
    await act(async()=>window.dispatchEvent(new PopStateEvent('popstate')));
    await waitFor(()=>expect(document.querySelector('.ww-transition-image')).toBeNull());
    expect(y).toBe(1200);
  } finally { window.removeEventListener('popstate',pop); }
});
