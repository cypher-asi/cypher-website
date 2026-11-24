'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import './StorePageTransition.css';
import {restoreCatalogScroll} from './restoreCatalogScroll';

declare global {
  interface Window {
    __wwHistoryBridgeInstalled?: boolean;
    __wwHandlePopstate?: (event: PopStateEvent) => void;
  }
}

/** Keep normal link semantics; only enhance unmodified, same-origin page changes. */
export function transitionDestination(event: MouseEvent, anchor: HTMLAnchorElement, current: URL): URL | null {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
    || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')
    || anchor.closest('[data-page-transition="none"]')) return null;
  const url = new URL(anchor.href, current);
  return url.origin === current.origin && url.pathname !== current.pathname ? url : null;
}

type Pending = {path: string; complete: () => void; skip: () => void};
type ReturnTarget = {url: string; productPath: string; cardHref: string; x: number; y: number; width: number; cardTop: number};
type NavigationState = {
  router: {current: ReturnType<typeof useRouter> | null};
  previous: {current: string | null};
  pending: {current: Pending | null};
  returnTargets: {current: ReturnTarget[]};
  displayedProduct: {current: string | null};
  stopScroll?: () => void;
  navigationId: number;
  detach?: () => void;
  disposeTimer?: ReturnType<typeof setTimeout>;
};
const sessions = new WeakMap<Document, NavigationState>();
function navigationState(): NavigationState {
  const existing = typeof document !== 'undefined' ? sessions.get(document) : undefined;
  if (existing) return existing;
  const state: NavigationState = {navigationId:0,router:{current:null},previous:{current:null},pending:{current:null},returnTargets:{current:[]},displayedProduct:{current:null}};
  if (typeof document !== 'undefined') sessions.set(document, state);
  return state;
}
const nextFrame = () => new Promise<void>(done => requestAnimationFrame(() => done()));
const motion = {enter: 120, image: 220, easing: 'cubic-bezier(.22,1,.36,1)'};

function visibleImage(image: HTMLImageElement | null) {
  if (!image?.complete || !image.naturalWidth) return null;
  const rect = image.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight ? image : null;
}

// Animate the pixels, not the padded <img> box. Product viewers add padding
// (especially on mobile); measuring the outer box makes the image snap smaller
// when the travelling copy hands over to the real image.
function imageBox(image: HTMLImageElement) {
  const rect = image.getBoundingClientRect();
  const css = getComputedStyle(image);
  const px = (value:string) => parseFloat(value) || 0;
  const insetLeft = px(css.paddingLeft) + px(css.borderLeftWidth);
  const insetTop = px(css.paddingTop) + px(css.borderTopWidth);
  const width = rect.width - insetLeft - px(css.paddingRight) - px(css.borderRightWidth);
  const height = rect.height - insetTop - px(css.paddingBottom) - px(css.borderBottomWidth);
  if (css.objectFit !== 'contain' || !image.naturalHeight) return {left:rect.left+insetLeft,top:rect.top+insetTop,width,height};
  const scale = Math.min(width/image.naturalWidth,height/image.naturalHeight);
  const w = image.naturalWidth*scale, h = image.naturalHeight*scale;
  const positions = css.objectPosition.split(' ');
  const fraction = (value:string|undefined) => value?.endsWith('%') ? px(value)/100 : .5;
  return {left:rect.left+insetLeft+(width-w)*fraction(positions[0]),top:rect.top+insetTop+(height-h)*fraction(positions[1]),width:w,height:h};
}

function productPath(path: string) {
  return /^\/store\/(?:products\/[^/]+|market\/[^/]+\/(?:group\/)?[^/]+|[A-Z]+_[^/]+)\/?$/.test(path);
}

export default function StorePageTransition() {
  const router = useRouter();
  const sessionRef = useRef<NavigationState | null>(null);
  if (!sessionRef.current) sessionRef.current = navigationState();
  const session = sessionRef.current;
  const {router: routerRef, previous, pending, returnTargets, displayedProduct} = session;
  routerRef.current = router;
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    if (pending.current?.path === pathname) pending.current.complete();
  }, [pathname, previous, pending]);

  useEffect(() => {
    // Vinext can remount the root layout on navigation/history restoration.
    // Keep the controller alive through that handoff, without duplicate listeners.
    clearTimeout(session.disposeTimer);
    const release = () => { session.disposeTimer = setTimeout(() => {
      session.detach?.(); session.detach = undefined;
    }, 0); };
    if (session.detach) return release;
    let replaying = false;
    const scrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    const enabled = () => Boolean(document.getElementById('page-main'));
    const motionEnabled = () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      && typeof document.getElementById('page-main')?.animate === 'function';
    const returnTarget = (destination: URL) => returnTargets.current.findLast(target =>
      target.url === destination.pathname + destination.search && target.productPath === displayedProduct.current);

    function start(destination: URL, source: HTMLImageElement | null, navigate: () => void, returning?: ReturnTarget) {
      pending.current?.skip();
      session.stopScroll?.();
      const navigationId = ++session.navigationId;
      const hasMotion = motionEnabled();
      displayedProduct.current = productPath(destination.pathname) ? destination.pathname : null;
      let page = document.getElementById('page-main')!;
      const shared = hasMotion ? visibleImage(source) : null;
      const sourceVisibility = shared?.style.visibility ?? '';
      const pageOpacity = page.style.opacity;
      let hero: HTMLImageElement | null = null;
      let hiddenHero: HTMLImageElement | null = null;
      let heroVisibility = '';
      let cancelled = false;
      let resolve = () => {};
      const routeReady = new Promise<void>(done => { resolve = done; });
      const animations = new Set<Animation>();
      const animate = (element: Element, frames: Keyframe[], options: KeyframeAnimationOptions) => {
        if (!hasMotion) return Promise.resolve();
        const animation = element.animate(frames, {...options, fill: 'forwards'});
        animations.add(animation);
        return animation.finished.catch(() => {});
      };

      // Keep one lightweight image in front of both pages. Unlike an async View
      // Transition snapshot, this does not freeze rendering while the router
      // fetches or the returning infinite grid restores its cards and scroll.
      const image = shared ? document.createElement('img') : null;
      const from = shared ? imageBox(shared) : undefined;
      if (image && shared && from) {
        image.src = shared.currentSrc || shared.src;
        image.alt = '';
        image.setAttribute('aria-hidden', 'true');
        image.className = 'ww-transition-image';
        Object.assign(image.style, {
          left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px',
          objectFit: getComputedStyle(shared).objectFit || 'contain', objectPosition: getComputedStyle(shared).objectPosition,
        });
        image.style.visibility = 'hidden';
        document.body.appendChild(image);
      }
      document.documentElement.dataset.storeTransition = 'loading';
      const cleanup = () => {
        if (cancelled) return;
        cancelled = true;
        resolve();
        animations.forEach(animation => animation.cancel());
        image?.remove();
        if (shared) shared.style.visibility = sourceVisibility;
        if (hiddenHero) hiddenHero.style.visibility = heroVisibility;
        if (pending.current === state) {
          page.style.opacity = pageOpacity;
          delete document.documentElement.dataset.storeTransition;
          pending.current = null;
        }
        clearTimeout(timer);
      };
      const findImage = () => returning
        ? [...document.querySelectorAll<HTMLAnchorElement>('a[href]')].find(link => link.href === returning.cardHref && link.querySelector('img'))?.querySelector('img') ?? null
        : document.querySelector<HTMLImageElement>('[data-product-hero] img');
      let committed = false;
      const state: Pending = {path: destination.pathname, complete: () => {
        if (cancelled || committed) return;
        committed = true;
        const nextPage = document.getElementById('page-main');
        animations.forEach(animation => animation.cancel());
        animations.clear();
        if (nextPage && nextPage !== page) {
          page.style.opacity = pageOpacity;
          page = nextPage;
        }
        // Only hide the destination after it exists. The outgoing page remains
        // visible throughout a slow route request, rather than a blank screen.
        if (returning) {
          session.stopScroll = restoreCatalogScroll(returning, findImage, () => session.navigationId === navigationId && previous.current === destination.pathname);
        } else if (!destination.hash) window.scrollTo({left: 0, top: 0, behavior: 'instant'});
        if (image) image.style.visibility = 'visible';
        resolve();
      }, skip: cleanup};
      pending.current = state;
      // Failed navigation/images must never leave content hidden or controls blocked.
      const timer = setTimeout(cleanup, 5000);

      void (async () => {
        // Fetch immediately. The page itself is never dimmed, hidden or faded:
        // swapping it in place avoids a visible blink on every click.
        navigate();
        // Some routers publish the history URL before popstate. In that case
        // pathname has already changed; there will be no second hook update.
        if (previous.current === destination.pathname) state.complete();
        await routeReady;
        if (cancelled) return;

        // One paint boundary is enough for the committed layout. Never wait for
        // image decoding, stable samples or pagination before showing the page.
        if (hasMotion) await nextFrame();
        if (cancelled) return;
        hero = findImage();
        if (hero) { hero.loading = 'eager'; hero.fetchPriority = 'high'; }

        const target = visibleImage(hero);
        const to = target ? imageBox(target) : undefined;
        if (target && image && to && from) {
          hiddenHero = target;
          heroVisibility = target.style.visibility;
          target.style.visibility = 'hidden';
          image.style.objectFit = getComputedStyle(target).objectFit || 'contain';
          image.style.objectPosition = getComputedStyle(target).objectPosition;
        }
        document.documentElement.dataset.storeTransition = 'entering';
        const travel = image && to && from
          ? animate(image, [
              {transform: 'translate(0px, 0px) scale(1, 1)'},
              {transform: `translate(${to.left-from.left}px, ${to.top-from.top}px) scale(${to.width/from.width}, ${to.height/from.height})`},
            ], {duration: motion.image, easing: motion.easing})
          : image ? animate(image, [{opacity: 1}, {opacity: 0}], {duration: motion.enter}) : Promise.resolve();
        await travel;
      })().catch(() => {}).finally(cleanup);
    }

    function navigate(event: MouseEvent) {
      const anchor = event.target instanceof Element ? event.target.closest('a') : null;
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const current = new URL(window.location.href);
      const destination = transitionDestination(event, anchor, current);
      if (!destination || !enabled()) return;
      const returning = returnTarget(destination);
      const source = returning ? document.querySelector<HTMLImageElement>('[data-product-hero] img')
        : productPath(destination.pathname) ? anchor.querySelector('img') ?? anchor.closest('article')?.querySelector('img') ?? null : null;
      if (!returning && productPath(destination.pathname)) {
        returnTargets.current.push({url: current.pathname + current.search, productPath: destination.pathname, cardHref: anchor.href, x: window.scrollX, y: window.scrollY, width: window.innerWidth, cardTop: source?.getBoundingClientRect().top ?? anchor.getBoundingClientRect().top});
        if (returnTargets.current.length > 30) returnTargets.current.shift();
      }
      event.preventDefault();
      start(destination, source, () => routerRef.current!.push(destination.pathname + destination.search + destination.hash, {scroll: Boolean(destination.hash)}), returning);
    }

    function traverse(event: PopStateEvent) {
      if (replaying || !enabled()) return;
      const destination = new URL(window.location.href);
      const returning = returnTarget(destination);
      if (!returning) { pending.current?.skip(); session.stopScroll?.(); session.navigationId++; return; }
      event.stopImmediatePropagation();
      start(destination, document.querySelector<HTMLImageElement>('[data-product-hero] img'), () => {
        replaying = true;
        try { window.dispatchEvent(new PopStateEvent('popstate', {state: {...event.state, __vinext_scrollX: returning.x, __vinext_scrollY: returning.y}})); }
        finally { replaying = false; }
      }, returning);
    }
    // Warm an intended destination only (including collection and account pages).
    // Never prefetch the whole infinite catalog or spend a data-saving connection.
    const warmed = new Set<string>();
    function warm(event: Event) {
      const anchor = event.target instanceof Element ? event.target.closest('a') : null;
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const destination = transitionDestination(new MouseEvent('click'), anchor, new URL(window.location.href));
      const connection=(navigator as Navigator & {connection?:{saveData?:boolean;effectiveType?:string}}).connection;
      if (!destination || connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType??'')) return;
      const href = destination.pathname + destination.search;
      if (warmed.has(href)) return;
      warmed.add(href);
      if(warmed.size>40)warmed.delete(warmed.values().next().value!);
      try { routerRef.current?.prefetch?.(href); } catch { /* Navigation still works without a warm cache. */ }
    }
    document.addEventListener('pointerover', warm, {passive: true});
    document.addEventListener('pointerdown', warm, {passive: true});
    document.addEventListener('focusin', warm);
    document.addEventListener('click', navigate, true);
    // The server installs this bridge before the router's history listeners.
    // A listener installed only after hydration is too late: the router may
    // synchronously replace the product before we can capture its image.
    if (window.__wwHistoryBridgeInstalled) window.__wwHandlePopstate = traverse;
    else window.addEventListener('popstate', traverse, true);
    session.detach = () => {
      document.removeEventListener('pointerover', warm);
      document.removeEventListener('pointerdown', warm);
      document.removeEventListener('focusin', warm);
      document.removeEventListener('click', navigate, true);
      window.removeEventListener('popstate', traverse, true);
      if (window.__wwHandlePopstate === traverse) delete window.__wwHandlePopstate;
      pending.current?.skip();
      // The bounded, document-scoped scroll guard survives a layout handoff.
      // A subsequent navigation or user input cancels it immediately.
      window.history.scrollRestoration = scrollRestoration;
    };
    return release;
  }, [session, routerRef, previous, pending, returnTargets, displayedProduct]);
  return null;
}
