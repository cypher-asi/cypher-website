'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { FadeInImage } from '@/components/FadeInImage';
import { useMobileMedia, mobileSrc } from './useMobileMedia';
import { playSingle, release } from './videoCoordinator';
import styles from './Landing.module.css';

/**
 * Mobile media layer: an optimized first-frame poster with a centered play
 * button. The video is only fetched on the first tap, plays muted + looping,
 * and pauses any other Wilder World video that was playing (one at a time).
 * Renders absolutely-positioned elements meant to fill a positioned parent.
 */
export default function MobileVideo({
  src,
  poster,
  mediaClassName,
}: {
  src: string;
  /** Basename of the mobile poster (e.g. "token") under /mobile/. */
  poster: string;
  /** Class applied to the poster + video (absolute fill, object-fit cover). */
  mediaClassName: string;
}) {
  const { format } = useMobileMedia();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);

  // Once the video is mounted (first tap), register it as the single active
  // player and start it. Release the slot on unmount.
  useEffect(() => {
    if (!started) return;
    const v = videoRef.current;
    if (!v) return;
    playSingle(v);
    void v.play().catch(() => {});
    return () => release(v);
  }, [started]);

  const toggle = () => {
    if (!started) {
      setStarted(true);
      return;
    }
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      playSingle(v);
      void v.play().catch(() => {});
    } else {
      v.pause();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // Keep taps from triggering an enclosing link (e.g. gameplay cards).
    e.preventDefault();
    e.stopPropagation();
    toggle();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    }
  };

  return (
    <>
      <FadeInImage className={mediaClassName} src={mobileSrc(poster, format)} alt="" aria-hidden />
      {started && (
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
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
      )}
      {/* role="button" span (not <button>) so it stays valid when nested in an
          enclosing link, e.g. the landing gameplay cards. */}
      <span
        role="button"
        tabIndex={0}
        className={`${styles.playButton} ${playing ? styles.playButtonPlaying : ''}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={playing ? 'Pause video' : 'Play video'}
      >
        {playing ? <Pause size={22} /> : <Play size={22} />}
      </span>
    </>
  );
}
