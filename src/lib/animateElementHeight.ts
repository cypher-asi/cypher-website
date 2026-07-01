export const HEIGHT_MS = 280;

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function setHeightInstant(el: HTMLElement, height: number) {
  el.style.transition = 'none';
  el.style.height = `${height}px`;
  void el.offsetHeight;
  el.style.transition = '';
}

export type HeightAnimation = {
  cancel: () => void;
};

export function animateElementHeight(
  el: HTMLElement,
  to: number,
  {
    from,
    duration = HEIGHT_MS,
  }: {
    from?: number;
    duration?: number;
  } = {}
): HeightAnimation | null {
  if (prefersReducedMotion()) {
    setHeightInstant(el, to);
    return null;
  }

  const start = from ?? el.getBoundingClientRect().height;
  if (Math.abs(start - to) < 0.5) {
    setHeightInstant(el, to);
    return null;
  }

  setHeightInstant(el, start);

  const t0 = performance.now();
  let frame = 0;
  let cancelled = false;

  const tick = (now: number) => {
    if (cancelled) return;
    const progress = Math.min(1, (now - t0) / duration);
    const height = start + (to - start) * easeOutCubic(progress);
    el.style.height = `${height}px`;
    if (progress < 1) {
      frame = requestAnimationFrame(tick);
    } else {
      setHeightInstant(el, to);
    }
  };

  frame = requestAnimationFrame(tick);

  return {
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      cancelAnimationFrame(frame);
      setHeightInstant(el, el.getBoundingClientRect().height);
    },
  };
}

export function cancelHeightAnimation(el: HTMLElement, animation: HeightAnimation | null) {
  animation?.cancel();
}
