'use client';

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styles from './Lightbox.module.css';

interface LightboxProps {
  src: string;
  alt: string;
  originRect: DOMRect;
  onClose: () => void;
}

const WHEEL_DISMISS_THRESHOLD = 150;
const TOUCH_DISMISS_THRESHOLD = 100;
const SNAP_BACK_DELAY = 300;

export function Lightbox({ src, alt, originRect, onClose }: LightboxProps) {
  const [phase, setPhase] = useState<'enter' | 'open' | 'exit'>('enter');
  const imgRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragY = useRef(0);
  const dismissing = useRef(false);
  const savedScrollY = useRef(0);
  const snapBackTimer = useRef<ReturnType<typeof setTimeout>>();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const close = useCallback(() => {
    if (phase === 'exit' || dismissing.current) return;
    dragY.current = 0;
    setPhase('exit');
  }, [phase]);

  useEffect(() => {
    if (phase === 'enter') {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPhase('open'));
      });
    }
  }, [phase]);

  // When entering exit phase, clear any gesture-applied inline styles
  // so the CSS class-based transitions can animate cleanly to origin
  useLayoutEffect(() => {
    if (phase === 'exit') {
      const img = imgRef.current;
      const overlay = overlayRef.current;
      if (img) {
        img.style.transition = '';
        img.style.transform = '';
        img.style.opacity = '';
      }
      if (overlay) {
        overlay.style.transition = '';
        overlay.style.background = '';
      }
    }
  }, [phase]);

  useEffect(() => {
    savedScrollY.current = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY.current}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.removeProperty('position');
      document.body.style.removeProperty('top');
      document.body.style.removeProperty('width');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('overflow-x');
      document.body.style.removeProperty('overflow-y');
      document.documentElement.style.removeProperty('overflow');
      window.scrollTo(0, savedScrollY.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  useEffect(() => {
    if (phase === 'exit') {
      const timer = setTimeout(() => onCloseRef.current(), 500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const gestureDismiss = useCallback((direction: number) => {
    dismissing.current = true;
    clearTimeout(snapBackTimer.current);

    const img = imgRef.current;
    const overlay = overlayRef.current;
    if (!img || !overlay) {
      onCloseRef.current();
      return;
    }

    img.style.transition = 'transform 250ms ease-out, opacity 250ms ease-out';
    overlay.style.transition = 'background 250ms ease-out';

    requestAnimationFrame(() => {
      img.style.transform = `translateY(${direction * window.innerHeight * 0.5}px) scale(0.75)`;
      img.style.opacity = '0';
      overlay.style.background = 'rgba(0, 0, 0, 0)';
    });

    setTimeout(() => onCloseRef.current(), 300);
  }, []);

  const snapBack = useCallback(() => {
    if (dismissing.current) return;
    const img = imgRef.current;
    const overlay = overlayRef.current;
    if (!img || !overlay) return;

    img.style.transition = 'transform 300ms cubic-bezier(0.25, 1, 0.5, 1)';
    overlay.style.transition = 'background 300ms cubic-bezier(0.25, 1, 0.5, 1)';
    img.style.transform = '';
    overlay.style.background = '';

    const cleanup = () => {
      img.style.transition = '';
      overlay.style.transition = '';
    };
    img.addEventListener('transitionend', cleanup, { once: true });
    dragY.current = 0;
  }, []);

  useEffect(() => {
    if (phase !== 'open') return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (dismissing.current) return;

      clearTimeout(snapBackTimer.current);
      dragY.current += e.deltaY;

      const img = imgRef.current;
      const overlay = overlayRef.current;
      if (!img || !overlay) return;

      img.style.transition = 'none';
      overlay.style.transition = 'none';

      const absDrag = Math.abs(dragY.current);
      const progress = Math.min(absDrag / WHEEL_DISMISS_THRESHOLD, 1);
      const scale = 1 - progress * 0.12;
      const bgOpacity = 0.92 * (1 - progress * 0.5);

      img.style.transform = `translateY(${dragY.current}px) scale(${scale})`;
      overlay.style.background = `rgba(0, 0, 0, ${bgOpacity})`;

      if (absDrag > WHEEL_DISMISS_THRESHOLD) {
        gestureDismiss(dragY.current > 0 ? 1 : -1);
      } else {
        snapBackTimer.current = setTimeout(snapBack, SNAP_BACK_DELAY);
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', onWheel);
      clearTimeout(snapBackTimer.current);
    };
  }, [phase, gestureDismiss, snapBack]);

  useEffect(() => {
    if (phase !== 'open') return;

    let touchStartY = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (dismissing.current) return;
      touchStartY = e.touches[0].clientY;
      dragY.current = 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (dismissing.current) return;
      e.preventDefault();
      dragY.current = e.touches[0].clientY - touchStartY;

      const img = imgRef.current;
      const overlay = overlayRef.current;
      if (!img || !overlay) return;

      img.style.transition = 'none';
      overlay.style.transition = 'none';

      const absDrag = Math.abs(dragY.current);
      const progress = Math.min(absDrag / TOUCH_DISMISS_THRESHOLD, 1);
      const scale = 1 - progress * 0.12;
      const bgOpacity = 0.92 * (1 - progress * 0.5);

      img.style.transform = `translateY(${dragY.current}px) scale(${scale})`;
      overlay.style.background = `rgba(0, 0, 0, ${bgOpacity})`;
    };

    const onTouchEnd = () => {
      if (dismissing.current) return;

      if (Math.abs(dragY.current) > TOUCH_DISMISS_THRESHOLD) {
        gestureDismiss(dragY.current > 0 ? 1 : -1);
      } else {
        snapBack();
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [phase, gestureDismiss, snapBack]);

  const handleTransitionEnd = (e: React.TransitionEvent) => {
    if (phase === 'exit' && e.target === overlayRef.current) {
      onClose();
    }
  };

  const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0;

  const originStyle = {
    left: originRect.left,
    top: originRect.top,
    width: originRect.width,
    height: originRect.height,
  };

  const padding = 40;
  const maxW = vw - padding * 2;
  const maxH = vh - padding * 2;

  const imgAspect = originRect.width / originRect.height;
  let finalW: number;
  let finalH: number;
  if (maxW / maxH > imgAspect) {
    finalH = maxH;
    finalW = finalH * imgAspect;
  } else {
    finalW = maxW;
    finalH = finalW / imgAspect;
  }

  const openStyle = {
    left: (vw - finalW) / 2,
    top: (vh - finalH) / 2,
    width: finalW,
    height: finalH,
  };

  const imgStyle = phase === 'enter' || phase === 'exit' ? originStyle : openStyle;

  return createPortal(
    <div
      ref={overlayRef}
      className={`${styles.overlay} ${phase === 'open' ? styles.overlayVisible : ''}`}
      onClick={close}
      onTransitionEnd={handleTransitionEnd}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={styles.image}
        style={{
          left: imgStyle.left,
          top: imgStyle.top,
          width: imgStyle.width,
          height: imgStyle.height,
        }}
        onClick={(e) => {
          e.stopPropagation();
          close();
        }}
      />
    </div>,
    document.body,
  );
}
