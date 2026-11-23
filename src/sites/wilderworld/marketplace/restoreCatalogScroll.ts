export type CatalogPosition = {x: number; y: number; width: number; cardTop: number};

/** Restore independently of motion/image loading. A returning infinite grid can
 * initially be shorter than its saved position; the router may also restore
 * scroll on a later frame. Retry without delaying or hiding the page. */
export function restoreCatalogScroll(
  position: CatalogPosition,
  findCard: () => Element | null,
  isCurrent: () => boolean,
) {
  const started = performance.now();
  let frame = 0;
  let stopped = false;
  let stableSince: number | undefined;
  let resizedTop: number | undefined;
  const stop = () => {
    stopped = true;
    cancelAnimationFrame(frame);
    window.removeEventListener('wheel', stop);
    window.removeEventListener('touchstart', stop);
    window.removeEventListener('pointerdown', stop);
    window.removeEventListener('keydown', stop);
  };
  const restore = () => {
    if (stopped || !isCurrent()) { stop(); return; }
    const now = performance.now();
    const card = findCard();
    if (position.width !== window.innerWidth && card && resizedTop === undefined) {
      resizedTop = window.scrollY + card.getBoundingClientRect().top - Math.min(position.cardTop, window.innerHeight / 3);
    }
    const top = Math.max(0, resizedTop ?? position.y);
    if (Math.abs(window.scrollY - top) > 1 || Math.abs(window.scrollX - position.x) > 1) {
      window.scrollTo({left: position.x, top, behavior: 'instant'});
      stableSince = undefined;
    }
    const reached = Math.abs(window.scrollY - top) <= 1;
    if (reached && card) stableSince ??= now;
    else stableSince = undefined;
    // Keep a short guard after success for late router/layout scroll effects.
    if ((stableSince !== undefined && now - stableSince >= 250) || now - started >= 2000) { stop(); return; }
    frame = requestAnimationFrame(restore);
  };
  window.addEventListener('wheel', stop, {passive: true});
  window.addEventListener('touchstart', stop, {passive: true});
  window.addEventListener('pointerdown', stop, {passive: true});
  window.addEventListener('keydown', stop);
  restore();
  return stop;
}
