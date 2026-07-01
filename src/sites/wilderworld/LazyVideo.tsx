'use client';

import { useEffect, useRef, useState } from 'react';
import { FadeInImage } from '@/components/FadeInImage';
import { useMobileMedia, mobileSrc } from './useMobileMedia';
import styles from './Landing.module.css';

/**
 * Shows an optimized still poster immediately, then lazily attaches and plays
 * the video once it scrolls near the viewport. Keeps heavy video off the
 * critical path (especially on mobile) while still animating in view.
 */
export default function LazyVideo({
  src,
  poster,
}: {
  /** Video source path. */
  src: string;
  /** Basename of the mobile poster (e.g. "token") under /mobile/. */
  poster: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { format } = useMobileMedia();
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (inView) void videoRef.current?.play().catch(() => {});
  }, [inView]);

  return (
    <div ref={containerRef} className={styles.cityMap}>
      <FadeInImage
        className={styles.cityMapVideo}
        src={mobileSrc(poster, format)}
        alt=""
        aria-hidden
      />
      {inView && (
        <video
          ref={videoRef}
          className={`${styles.cityMapVideo} ${styles.lazyVideo} ${ready ? styles.lazyVideoReady : ''}`}
          src={src}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden
          onCanPlay={() => setReady(true)}
        />
      )}
    </div>
  );
}
