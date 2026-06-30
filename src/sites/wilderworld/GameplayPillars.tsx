'use client';

import { useCallback, useState } from 'react';
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

function PillarPanel({
  pillar,
  isActive,
  onActivate,
}: {
  pillar: Pillar;
  isActive: boolean;
  onActivate: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  // Mark as loaded if the image is already cached when the node mounts,
  // otherwise the onLoad handler covers the network case.
  const imgRef = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <div
      className={`${styles.panel} ${isActive ? styles.panelActive : ''}`}
      onMouseEnter={onActivate}
      onFocus={onActivate}
    >
      <img
        ref={imgRef}
        className={`${styles.bg} ${loaded ? styles.bgLoaded : ''}`}
        src={pillar.image}
        alt=""
        aria-hidden
        onLoad={() => setLoaded(true)}
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
}

export default function GameplayPillars() {
  const [activeId, setActiveId] = useState<string>(PILLARS[0].id);

  return (
    <div className={styles.row}>
      {PILLARS.map((pillar) => (
        <PillarPanel
          key={pillar.id}
          pillar={pillar}
          isActive={pillar.id === activeId}
          onActivate={() => setActiveId(pillar.id)}
        />
      ))}
    </div>
  );
}
