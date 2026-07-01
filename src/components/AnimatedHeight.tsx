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
   * swapped in and faded back while the container height tweens between the two.
   * Leave undefined to only animate height (no content crossfade).
   */
  motionKey?: string | number;
};

type Rendered = { key: Props['motionKey']; node: ReactNode };

const OUT_MS = 150;

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Wraps content and animates the container's height whenever the content's
 * measured height changes (an accordion opening, values loading in). When
 * `motionKey` changes it runs a crossfade: the old content fades out, the new
 * content fades in, and the height tweens between them so panel swaps flow
 * smoothly (e.g. switching market collections).
 *
 * Reduced motion collapses this to an instant, un-animated swap/resize (both
 * the height transition and opacity transition are disabled in the CSS module).
 */
export function AnimatedHeight({ children, className, innerClassName, motionKey }: Props) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | 'auto'>('auto');
  const [rendered, setRendered] = useState<Rendered>({ key: motionKey, node: children });
  // 'show' = fully visible, 'out' = fading old out, 'hidden' = new content
  // parked at opacity 0 just before it fades in.
  const [phase, setPhase] = useState<'show' | 'out' | 'hidden'>('show');

  // Keep height in sync with the shown content (accordions, async loads). The
  // inner node is stable (never remounted), so a single observer suffices.
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => setHeight(el.scrollHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Measure synchronously right after a swap so height tweens old -> new.
  useLayoutEffect(() => {
    if (innerRef.current) setHeight(innerRef.current.scrollHeight);
  }, [rendered]);

  // While nothing is switching, let normal content updates pass straight
  // through (checkbox toggles, stats loading in) without a crossfade.
  useEffect(() => {
    if (phase === 'show' && motionKey === rendered.key) {
      setRendered({ key: motionKey, node: children });
    }
  }, [children, motionKey, phase, rendered.key]);

  // Drive the crossfade when motionKey changes.
  useEffect(() => {
    if (motionKey === rendered.key) return;

    if (prefersReducedMotion()) {
      setRendered({ key: motionKey, node: children });
      setPhase('show');
      return;
    }

    setPhase('out');
    const t = setTimeout(() => {
      setRendered({ key: motionKey, node: children });
      setPhase('hidden');
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setPhase('show'))
      );
    }, OUT_MS);
    return () => clearTimeout(t);
  }, [motionKey, children, rendered.key]);

  const phaseClass =
    motionKey === undefined
      ? ''
      : phase === 'out'
        ? styles.out
        : phase === 'hidden'
          ? styles.hidden
          : '';

  const innerClass =
    `${innerClassName ?? ''} ${styles.inner} ${phaseClass}`.trim() || undefined;

  return (
    <div className={`${styles.outer} ${className ?? ''}`} style={{ height }}>
      <div ref={innerRef} className={innerClass}>
        {rendered.node}
      </div>
    </div>
  );
}
