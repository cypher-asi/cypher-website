'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
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
 * Wraps content and animates the container's height. The outer element is kept
 * pinned to an explicit pixel height at all times so that whenever the content
 * changes size (an accordion opening, values loading in, or a `motionKey`
 * swap) there is a concrete "from" value for the CSS `height` transition to
 * interpolate. A forced reflow between the old and new height guarantees the
 * transition actually runs instead of the box snapping to the new size.
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

  // Tween the outer height to match the current inner content. The inner node
  // is never height-constrained (only the outer clips), so `inner.offsetHeight`
  // is always the true target height regardless of the outer's pinned value.
  const tweenHeight = () => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const target = inner.offsetHeight;
    if (prefersReducedMotion()) {
      outer.style.height = `${target}px`;
      return;
    }
    const current = outer.getBoundingClientRect().height;
    if (Math.abs(current - target) < 0.5) {
      outer.style.height = `${target}px`;
      return;
    }
    outer.style.height = `${current}px`;
    // Force a reflow so the browser commits the "from" height before we set the
    // target - without this the two writes coalesce and the box just snaps.
    void outer.offsetHeight;
    outer.style.height = `${target}px`;
  };

  // Pin an initial height on mount and keep it in sync with idle content
  // changes (accordions, async loads). The inner node is stable (never
  // remounted), so a single observer suffices.
  useEffect(() => {
    const inner = innerRef.current;
    const outer = outerRef.current;
    if (!inner || !outer) return;
    outer.style.height = `${inner.offsetHeight}px`;
    const ro = new ResizeObserver(() => {
      if (phaseRef.current === 'idle') tweenHeight();
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
    tweenHeight();
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
