'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { FadeInImage } from '@/components/FadeInImage';
import { useMobileMedia, mobileSrc } from './useMobileMedia';
import styles from './Landing.module.css';

export type GameplayCardProps = {
  title: string;
  description: string;
  video?: string;
  image?: string;
  /** Basename of the mobile poster (e.g. "race") under /mobile/. */
  poster?: string;
  href?: string;
};

export default function GameplayCard({
  title,
  description,
  video,
  image,
  poster,
  href,
}: GameplayCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isMobile, format } = useMobileMedia();

  const handleEnter = () => {
    const el = videoRef.current;
    if (!el) return;
    void el.play().catch(() => {});
  };

  const handleLeave = () => {
    const el = videoRef.current;
    if (!el) return;
    el.pause();
  };

  // On phones there is no hover, so never fetch the video: show the optimized
  // first-frame still instead (WebP, or JPEG on slow / save-data connections).
  const showImageOnly = isMobile && (poster || image);

  const inner = (
    <>
      {showImageOnly ? (
        <FadeInImage
          className={styles.gameplayVideo}
          src={poster ? mobileSrc(poster, format) : image}
          alt=""
          aria-hidden
        />
      ) : video ? (
        <video
          ref={videoRef}
          className={styles.gameplayVideo}
          src={video}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
        />
      ) : image ? (
        <FadeInImage className={styles.gameplayVideo} src={image} alt="" aria-hidden />
      ) : null}
      <h3 className={styles.gameplayTitle}>{title}</h3>
      <div className={styles.gameplayDescWrap}>
        <p className={styles.gameplayDesc}>{description}</p>
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={styles.gameplayCard}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        {inner}
      </Link>
    );
  }

  return (
    <article
      className={styles.gameplayCard}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {inner}
    </article>
  );
}
