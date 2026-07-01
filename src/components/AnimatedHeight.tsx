'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import styles from './AnimatedHeight.module.css';

type Props = {
  children: ReactNode;
  className?: string;
  /** Class applied to the measured inner wrapper (e.g. for flex layout). */
  innerClassName?: string;
  /**
   * When this value changes, the current content fades out, the new content is
   * swapped in and fades back while the container height tweens between the two
   * sizes. Leave undefined to only animate height on resize (no crossfade).
   */
  motionKey?: string | number;
};

type Rendered = { key: Props['motionKey']; node: ReactNode };

// Kept in sync with the transition durations in AnimatedHeight.module.css.
const FADE_MS = 140;
const HEIGHT_MS = 280;

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Wraps content and animates the container's height. Every resize explicitly
 * starts from the currently painted height, force-commits that value, then
 * writes the new measured height. That gives the browser a concrete "from" and
 * "to" for the CSS transition even on initial async load or fast content swaps.
 *
 * When `motionKey` changes the old content fades out, the new content is
 * swapped in, and then the height tweens to the new size while the new content
 * fades in - so the resize is visible rather than happening on a blank box.
 *
 * Reduced motion collapses everything to an instant, un-animated swap/resize
 * (the transitions are also disabled in the CSS module).
 */
export function AnimatedHeight({ children, className, innerClassName, motionKey }: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState<Rendered>({ key: motionKey, node: children });
  // 'idle' = at rest, 'out' = old content fading away, 'in' = new content
  // fading up while the height tweens.
  const [phase, setPhase] = useState<'idle' | 'out' | 'in'>('idle');
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const fromHeightRef = useRef(0);
  const heightAnimationRef = useRef<Animation | null>(null);

  const measureInner = () => innerRef.current?.scrollHeight ?? 0;

  const setHeightInstantly = (height: number) => {
    const outer = outerRef.current;
    if (!outer) return;
    const previousTransition = outer.style.transition;
    outer.style.transition = 'none';
    outer.style.height = `${height}px`;
    // Force the browser to commit the non-transitioned "from" height before a
    // subsequent animated write. Without this, the two writes can coalesce.
    void outer.offsetHeight;
    outer.style.transition = previousTransition;
  };

  const animateHeight = (from: number, to: number) => {
    const outer = outerRef.current;
    if (!outer) return;
    heightAnimationRef.current?.cancel();
    heightAnimationRef.current = null;
    if (prefersReducedMotion()) {
      setHeightInstantly(to);
      return;
    }
    if (Math.abs(from - to) < 0.5) {
      setHeightInstantly(to);
      return;
    }

    setHeightInstantly(from);
    const animation = outer.animate(
      [{ height: `${from}px` }, { height: `${to}px` }],
      {
        duration: HEIGHT_MS,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      }
    );
    heightAnimationRef.current = animation;
    // Keep the underlying style at the final value so the element does not snap
    // back when the Web Animation finishes.
    outer.style.height = `${to}px`;
    animation.onfinish = () => {
      if (heightAnimationRef.current === animation) {
        outer.style.height = `${to}px`;
        heightAnimationRef.current = null;
      }
    };
    animation.oncancel = () => {
      if (heightAnimationRef.current === animation) {
        heightAnimationRef.current = null;
      }
    };
  };

  // Pin the initial height before paint. If the initial render is empty, this
  // pins to 0 so the first async content load has a real height to grow from.
  useLayoutEffect(() => {
    const inner = innerRef.current;
    const outer = outerRef.current;
    if (!inner || !outer) return;
    setHeightInstantly(inner.scrollHeight);
  }, []);

  // Keep height synced to idle content changes (accordions, async loads). The
  // inner node is stable (never remounted), so a single observer suffices.
  useEffect(() => {
    const inner = innerRef.current;
    const outer = outerRef.current;
    if (!inner || !outer) return;
    const ro = new ResizeObserver(() => {
      if (phaseRef.current !== 'idle') return;
      const from = outer.getBoundingClientRect().height;
      animateHeight(from, measureInner());
    });
    ro.observe(inner);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // While nothing is switching, let normal content updates pass straight
  // through (checkbox toggles, stats loading in) without a crossfade.
  useEffect(() => {
    if (phase === 'idle' && motionKey === rendered.key) {
      setRendered({ key: motionKey, node: children });
    }
  }, [children, motionKey, phase, rendered.key]);

  // motionKey changed: fade the old content out first.
  useEffect(() => {
    if (motionKey === rendered.key) return;

    if (prefersReducedMotion()) {
      setRendered({ key: motionKey, node: children });
      setPhase('idle');
      return;
    }

    const outer = outerRef.current;
    const inner = innerRef.current;
    fromHeightRef.current = outer?.getBoundingClientRect().height ?? inner?.scrollHeight ?? 0;
    setHeightInstantly(fromHeightRef.current);
    setPhase('out');
    const t = setTimeout(() => {
      setRendered({ key: motionKey, node: children });
      setPhase('in');
    }, FADE_MS);
    return () => clearTimeout(t);
  }, [motionKey, children, rendered.key]);

  // After the swap: tween height to the new content (runs synchronously before
  // paint so the fade-in and resize start together), then return to idle.
  useLayoutEffect(() => {
    if (phase !== 'in') return;
    animateHeight(fromHeightRef.current, measureInner());
    const t = setTimeout(() => setPhase('idle'), HEIGHT_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, rendered]);

  const fadeClass = motionKey === undefined ? '' : phase === 'out' ? styles.out : '';
  const innerClass =
    `${innerClassName ?? ''} ${styles.inner} ${fadeClass}`.trim() || undefined;

  return (
    <div ref={outerRef} className={`${styles.outer} ${className ?? ''}`}>
      <div ref={innerRef} className={innerClass}>
        {rendered.node}
      </div>
    </div>
  );
}
