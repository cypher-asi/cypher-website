'use client';

import { useState } from 'react';
import { Moon, Sun, Sunset } from 'lucide-react';
import styles from './CityShowcase.module.css';

const BACKDROPS = [
  { id: 'day', label: 'Day', Icon: Sun, src: '/videos/midday.mp4' },
  { id: 'sunset', label: 'Sunset', Icon: Sunset, src: '/videos/sunset.mp4' },
  { id: 'night', label: 'Night', Icon: Moon, src: '/videos/night.mp4' },
] as const;

type BackdropId = (typeof BACKDROPS)[number]['id'];

export default function CityShowcase() {
  const [active, setActive] = useState<BackdropId>('day');
  const activeBackdrop = BACKDROPS.find((b) => b.id === active) ?? BACKDROPS[0];

  return (
    <div className={styles.showcase}>
      <video
        key={activeBackdrop.id}
        className={styles.video}
        src={activeBackdrop.src}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden
      />
      <div className={styles.timeControls}>
        {BACKDROPS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`${styles.timeButton} ${
              id === active ? styles.timeButtonActive : ''
            }`}
            onClick={() => setActive(id)}
            aria-label={label}
            aria-pressed={id === active}
            title={label}
          >
            <Icon size={20} />
          </button>
        ))}
      </div>
    </div>
  );
}
