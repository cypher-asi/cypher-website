'use client';

import { useEffect, useRef, useState } from 'react';
import { FadeInImage } from '@/components/FadeInImage';
import { useMobileMedia, mobileSrc } from './useMobileMedia';
import MobileVideo from './MobileVideo';
import styles from './Landing.module.css';

/**
 * Framed video with an optimized still poster.
 *
 * - Desktop: lazily attaches and autoplays the video once it scrolls near the
 *   viewport, fading it in over the poster.
 * - Mobile: shows the poster with a tap-to-play button (see MobileVideo); the
 *   video is only fetched on tap and plays one at a time.
 */
export default function LazyVideo({
  src,
  poster,
  className = styles.cityMap,
  mediaClassName = styles.cityMapVideo,
}: {
  /** Video source path. */
  src: string;
  /** Basename of the mobile poster (e.g. "token") under /mobile/. */
  poster: string;
  /** Class for the framed container. */
  className?: string;
  /** Class for the poster + video (absolute fill, object-fit cover). */
  mediaClassName?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isMobile, format } = useMobileMedia();
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isMobile) return;
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
  }, [isMobile]);

  useEffect(() => {
    if (inView) void videoRef.current?.play().catch(() => {});
  }, [inView]);

  return (
    <div ref={containerRef} className={className}>
      {isMobile ? (
        <MobileVideo src={src} poster={poster} mediaClassName={mediaClassName} />
      ) : (
        <>
          <FadeInImage
            className={mediaClassName}
            src={mobileSrc(poster, format)}
            alt=""
            aria-hidden
          />
          {inView && (
            <video
              ref={videoRef}
              className={`${mediaClassName} ${styles.lazyVideo} ${ready ? styles.lazyVideoReady : ''}`}
              src={src}
              muted
              loop
              playsInline
              preload="none"
              aria-hidden
              onCanPlay={() => setReady(true)}
            />
          )}
        </>
      )}
    </div>
  );
}
