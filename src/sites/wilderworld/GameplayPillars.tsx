'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import styles from './GameplayPillars.module.css';

type Pillar = {
  id: string;
  title: string;
  description: string;
  image: string;
  href: string;
};

const PILLARS: Pillar[] = [
  {
    id: 'fight',
    title: 'Fight',
    description:
      'Drop into PvPvE city runs, clear Breaches, and fight your way to extraction.',
    image: '/images/wilder-world/fight_moonboots_encouter.png',
    href: '#fight',
  },
  {
    id: 'race',
    title: 'Race',
    description:
      "Tear through Wiami's streets in high-speed, high-stakes races.",
    image: '/images/wilder-world/race_gameplay.png',
    href: '#race',
  },
  {
    id: 'explore',
    title: 'Explore',
    description:
      'Roam a massive open world of RPG missions and discovery.',
    image: '/images/wilder-world/explore.png',
    href: '#explore',
  },
  {
    id: 'build',
    title: 'Build',
    description: 'Own and build everything from land to vehicles.',
    image: '/images/wilder-world/mining.png',
    href: '#build',
  },
];

export default function GameplayPillars() {
  const [activeId, setActiveId] = useState<string>(PILLARS[0].id);

  return (
    <div className={styles.row}>
      {PILLARS.map((pillar) => {
        const isActive = pillar.id === activeId;
        return (
          <div
            key={pillar.id}
            className={`${styles.panel} ${isActive ? styles.panelActive : ''}`}
            onMouseEnter={() => setActiveId(pillar.id)}
            onFocus={() => setActiveId(pillar.id)}
          >
            <img
              className={styles.bg}
              src={pillar.image}
              alt=""
              aria-hidden
            />
            <div className={styles.scrim} aria-hidden />

            <span className={styles.label}>{pillar.title}</span>

            <div className={styles.content}>
              <h3 className={styles.contentTitle}>{pillar.title}</h3>
              <p className={styles.contentDesc}>{pillar.description}</p>
              <Link href={pillar.href} className={`sci-btn sci-btn-primary ${styles.contentButton}`}>
                Enter {pillar.title}
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
