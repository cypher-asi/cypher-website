'use client';

import { useState } from 'react';
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
  const view = VIEWS.find((v) => v.id === active) ?? VIEWS[0];

  return (
    <div className={styles.frame}>
      <img
        key={view.id}
        className={styles.img}
        src={view.src}
        alt="Map of the Island"
      />
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
