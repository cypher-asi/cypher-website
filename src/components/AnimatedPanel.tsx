'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type DependencyList,
  type ReactNode,
} from 'react';
import { animateElementHeight, cancelHeightAnimation, setHeightInstant } from '@/lib/animateElementHeight';
import styles from './AnimatedPanel.module.css';

type Props = {
  children: ReactNode;
  className?: string;
  /** Class on the measured inner wrapper (layout/spacing). */
  bodyClassName?: string;
  /** Re-run height sync when these change (collection switch, accordion, async load). */
  measureDeps?: DependencyList;
};

/**
 * Animates the outer panel's pixel height to match its content. The outer node
 * is the visible bordered container; an inner wrapper carries natural layout and
 * is observed for size changes (async loads, accordions, collection swaps).
 */
export function AnimatedPanel({
  children,
  className,
  bodyClassName,
  measureDeps = [],
}: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<ReturnType<typeof animateElementHeight>>(null);

  const syncHeight = useCallback(
    (instant = false) => {
      const outer = outerRef.current;
      const inner = innerRef.current;
      if (!outer || !inner) return;

      const previousHeight = outer.style.height;
      outer.style.height = 'auto';
      const target = inner.scrollHeight;
      outer.style.height = previousHeight;

      cancelHeightAnimation(outer, animationRef.current);
      animationRef.current = null;

      if (instant) {
        setHeightInstant(outer, target);
        return;
      }

      animationRef.current = animateElementHeight(outer, target, {
        from: outer.getBoundingClientRect().height,
      });
    },
    []
  );

  const syncHeightAfterLayout = useCallback(() => {
    syncHeight(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => syncHeight(false));
    });
  }, [syncHeight]);

  useLayoutEffect(() => {
    syncHeight(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    syncHeightAfterLayout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...measureDeps, syncHeightAfterLayout]);

  useEffect(() => {
    const inner = innerRef.current;
    const outer = outerRef.current;
    if (!inner || !outer) return;

    const ro = new ResizeObserver(() => syncHeight(false));
    ro.observe(inner);
    return () => {
      ro.disconnect();
      cancelHeightAnimation(outer, animationRef.current);
      animationRef.current = null;
    };
  }, [syncHeight]);

  const outerClass = `${styles.outer} ${className ?? ''}`.trim();
  const bodyClass = `${styles.body} ${bodyClassName ?? ''}`.trim() || undefined;

  return (
    <div ref={outerRef} className={outerClass}>
      <div ref={innerRef} className={bodyClass}>
        {children}
      </div>
    </div>
  );
}
