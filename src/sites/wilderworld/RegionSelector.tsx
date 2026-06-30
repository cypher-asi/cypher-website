'use client';

import { useState } from 'react';
import styles from './RegionSelector.module.css';

type Region = { name: string; image: string; pos: number; blurb: string };

const REGIONS: Region[] = [
  {
    name: 'The Island',
    image: '/images/wilder-world/map-island.webp',
    pos: 57,
    blurb:
      'The dense, circular heart of Wiami, where neighborhoods, landmarks, and 27 bridges span its rivers and streams.',
  },
  {
    name: 'The Mainland',
    image: '/images/wilder-world/map-mainland.webp',
    pos: 43,
    blurb:
      'A resource-rich frontier of 40,000 onchain Land parcels, fueling the mining that powers the $WILD economy.',
  },
  {
    name: "No Man's Land",
    image: '/images/wilder-world/map-no-mans-land.webp',
    pos: 28,
    blurb:
      'A wild, untamed frontier of volcanic regions and towering mountains, reserved for stories still to be revealed.',
  },
];

export default function RegionSelector() {
  const [selected, setSelected] = useState<Region>(REGIONS[0]);
  const objectPosition = `${selected.pos}% 50%`;

  return (
    <div className={styles.mapFrame}>
      {/* Dim base map of the whole world, always visible. Pans with the
          selection so the active territory stays centered in the tall frame. */}
      <img
        className={styles.base}
        src="/images/wilder-world/map-base.webp"
        alt=""
        aria-hidden
        style={{ objectPosition }}
      />
      {/* Selected territory lights up on top of the base. */}
      <img
        key={selected.name}
        className={styles.highlight}
        src={selected.image}
        alt=""
        aria-hidden
        style={{ objectPosition }}
      />
      <div className={styles.scrim} aria-hidden />
      <div className={styles.overlay}>
        <div className={styles.list}>
          {REGIONS.map((region) => (
            <button
              key={region.name}
              type="button"
              aria-pressed={selected.name === region.name}
              className={`${styles.item} ${
                selected.name === region.name ? styles.itemActive : ''
              }`}
              onClick={() => setSelected(region)}
            >
              {region.name}
            </button>
          ))}
        </div>
        <p className={styles.blurb}>{selected.blurb}</p>
      </div>
    </div>
  );
}
