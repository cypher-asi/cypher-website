'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import styles from './AnimatedHeight.module.css';

type Props = {
  children: ReactNode;
  className?: string;
  /** Class applied to the measured inner wrapper (e.g. for flex layout). */
  innerClassName?: string;
  /**
   * When this value changes, the inner content remounts and crossfades in
   * while the container height tweens between the old and new content. Leave
   * undefined to only animate height (no content crossfade).
   */
  motionKey?: string | number;
};

/**
 * Wraps content and animates the container's height whenever the content's
 * measured height changes (e.g. an accordion opening, values loading in). The
 * first measurement is applied without animation; subsequent changes tween via
 * the CSS transition.
 *
 * When `motionKey` changes the inner node is remounted, which restarts a short
 * fade/slide-in and lets the height transition to the new content in the same
 * beat — used to swap panel contents smoothly (e.g. changing collections).
 *
 * Users who prefer reduced motion get an instant resize and an instant swap
 * (both animations are disabled in the companion CSS module).
 */
export function AnimatedHeight({ children, className, innerClassName, motionKey }: Props) {
  const roRef = useRef<ResizeObserver | null>(null);
  const [height, setHeight] = useState<number | 'auto'>('auto');

  // Callback ref so observation survives the inner node remounting on a
  // `motionKey` change: the old node disconnects, the new one re-measures.
  const setInner = useCallback((el: HTMLDivElement | null) => {
    roRef.current?.disconnect();
    if (!el) return;
    const update = () => setHeight(el.scrollHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    roRef.current = ro;
  }, []);

  const innerClass = `${innerClassName ?? ''} ${
    motionKey !== undefined ? styles.swap : ''
  }`.trim();

  return (
    <div className={`${styles.outer} ${className ?? ''}`} style={{ height }}>
      <div key={motionKey} ref={setInner} className={innerClass || undefined}>
        {children}
      </div>
    </div>
  );
}
