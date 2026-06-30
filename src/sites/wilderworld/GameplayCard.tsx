'use client';

import { useRef } from 'react';
import styles from './Landing.module.css';

export type GameplayCardProps = {
  title: string;
  description: string;
  video?: string;
  image?: string;
};

export default function GameplayCard({
  title,
  description,
  video,
  image,
}: GameplayCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

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

  return (
    <article
      className={styles.gameplayCard}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {video ? (
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
        <img className={styles.gameplayVideo} src={image} alt="" aria-hidden />
      ) : null}
      <h3 className={styles.gameplayTitle}>{title}</h3>
      <div className={styles.gameplayDescWrap}>
        <p className={styles.gameplayDesc}>{description}</p>
      </div>
    </article>
  );
}
