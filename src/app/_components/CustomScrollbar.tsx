'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './CustomScrollbar.module.css';

const MIN_THUMB = 32;
const IDLE_HIDE_MS = 1000;

export function CustomScrollbar() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [thumbHeight, setThumbHeight] = useState(0);
  const [thumbTop, setThumbTop] = useState(0);
  const [scrollable, setScrollable] = useState(false);
  const [active, setActive] = useState(false);
  const [dragging, setDragging] = useState(false);

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Captured at drag start: pointer Y and the scrollTop it maps to.
  const dragOrigin = useRef({ pointerY: 0, scrollTop: 0 });

  const showThenIdle = useCallback(() => {
    setActive(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setActive(false), IDLE_HIDE_MS);
  }, []);

  const measure = useCallback(() => {
    const doc = document.documentElement;
    const { scrollHeight, clientHeight, scrollTop } = doc;
    const trackHeight = trackRef.current?.clientHeight ?? clientHeight;
    const canScroll = scrollHeight - clientHeight > 1;

    setScrollable(canScroll);
    if (!canScroll) return;

    const ratio = clientHeight / scrollHeight;
    const nextThumb = Math.max(ratio * trackHeight, MIN_THUMB);
    const maxScroll = scrollHeight - clientHeight;
    const maxThumbTop = trackHeight - nextThumb;
    const nextTop = maxScroll > 0 ? (scrollTop / maxScroll) * maxThumbTop : 0;

    setThumbHeight(nextThumb);
    setThumbTop(nextTop);
  }, []);

  useEffect(() => {
    measure();

    const onScroll = () => {
      measure();
      showThenIdle();
    };
    const onResize = () => measure();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    // Catch content-height changes from route/section transitions.
    const ro = new ResizeObserver(() => measure());
    ro.observe(document.body);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      ro.disconnect();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [measure, showThenIdle]);

  // Drag the thumb -> map pointer delta to window scroll.
  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => {
      const doc = document.documentElement;
      const trackHeight = trackRef.current?.clientHeight ?? doc.clientHeight;
      const maxScroll = doc.scrollHeight - doc.clientHeight;
      const maxThumbTop = trackHeight - thumbHeight;
      if (maxThumbTop <= 0) return;

      const deltaY = e.clientY - dragOrigin.current.pointerY;
      const scrollPerPx = maxScroll / maxThumbTop;
      window.scrollTo({ top: dragOrigin.current.scrollTop + deltaY * scrollPerPx });
    };

    const onUp = () => setDragging(false);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, thumbHeight]);

  const onThumbPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    dragOrigin.current = {
      pointerY: e.clientY,
      scrollTop: document.documentElement.scrollTop,
    };
    setDragging(true);
    setActive(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
  };

  // Click on the track (outside the thumb) -> page jump toward the click.
  const onTrackPointerDown = (e: React.PointerEvent) => {
    if (e.target !== trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const doc = document.documentElement;
    const page = doc.clientHeight * 0.9;
    const direction = clickY < thumbTop ? -1 : 1;
    window.scrollTo({ top: doc.scrollTop + direction * page, behavior: 'smooth' });
  };

  if (!scrollable) return null;

  const visible = active || dragging;

  return (
    <div
      ref={trackRef}
      className={`${styles.track} ${visible ? styles.visible : ''}`}
      onPointerDown={onTrackPointerDown}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => !dragging && showThenIdle()}
      aria-hidden="true"
    >
      <div
        className={`${styles.thumb} ${dragging ? styles.thumbDragging : ''}`}
        style={{ height: `${thumbHeight}px`, transform: `translateY(${thumbTop}px)` }}
        onPointerDown={onThumbPointerDown}
      />
    </div>
  );
}
