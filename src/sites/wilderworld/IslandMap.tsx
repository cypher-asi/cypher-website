'use client';

import { useState } from 'react';
import { useMobileMedia, mobileImageFromPath } from './useMobileMedia';
import styles from './IslandMap.module.css';

const VIEWS = [
  {
    id: 'neighborhoods',
    label: 'Neighborhoods',
    src: '/images/wilder-world/island-landplots.webp',
  },
  {
    id: 'plots',
    label: 'Plots',
    src: '/images/wilder-world/neighborhoods_by_plot.avif',
  },
] as const;

type ViewId = (typeof VIEWS)[number]['id'];

export default function IslandMap() {
  const [active, setActive] = useState<ViewId>('neighborhoods');
  const { isMobile, format } = useMobileMedia();

  return (
    <div className={styles.frame}>
      {VIEWS.map((v) => (
        <img
          key={v.id}
          className={`${styles.img} ${v.id === active ? styles.imgActive : ''}`}
          src={isMobile ? mobileImageFromPath(v.src, format) : v.src}
          alt={v.id === active ? 'Map of the Island' : ''}
          aria-hidden={v.id !== active}
        />
      ))}
      <div className={styles.controls}>
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            aria-pressed={v.id === active}
            className={`${styles.control} ${
              v.id === active ? styles.controlActive : ''
            }`}
            onClick={() => setActive(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}
