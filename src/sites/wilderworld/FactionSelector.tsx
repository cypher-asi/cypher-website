'use client';

import { useState } from 'react';
import { FadeInImage } from '@/components/FadeInImage';
import { useMobileMedia, mobileSrc } from './useMobileMedia';
import styles from './Landing.module.css';

// `mobile` is the basename of the optimized asset under /mobile/.
type Faction = { name: string; image: string; mobile: string };
type FactionGroup = { side: string; factions: Faction[] };

const FACTION_GROUPS: FactionGroup[] = [
  {
    side: 'Rebel',
    factions: [
      { name: 'Auric', image: '/images/wilder-world/auric.png', mobile: 'auric' },
      { name: 'Nova', image: '/images/wilder-world/nova_switch.png', mobile: 'nova_switch' },
      { name: 'Trinity', image: '/images/wilder-world/trinity.png', mobile: 'trinity' },
    ],
  },
  {
    side: 'Forum',
    factions: [
      { name: 'Ant', image: '/images/wilder-world/ant.png', mobile: 'ant' },
      { name: 'Agent', image: '/images/wilder-world/agents.png', mobile: 'agents' },
      { name: 'Spartan', image: '/images/wilder-world/spartans.png', mobile: 'spartans' },
      { name: 'Wape', image: '/images/wilder-world/wape.jpeg', mobile: 'wape' },
    ],
  },
];

export default function FactionSelector() {
  const [selected, setSelected] = useState<Faction>(
    FACTION_GROUPS[0].factions[0]
  );
  const { isMobile, format } = useMobileMedia();

  return (
    <div className={styles.frame}>
      <FadeInImage
        className={`${styles.bg} ${
          selected.name === 'Auric' ? styles.mediaRight : ''
        }`}
        src={isMobile ? mobileSrc(selected.mobile, format) : selected.image}
        alt=""
        aria-hidden
      />
      <div className={styles.scrimDiagonal} aria-hidden />
      <div className={styles.overlay}>
        <div className={styles.factionGroups}>
          {FACTION_GROUPS.map((group) => (
            <div key={group.side} className={styles.factionGroup}>
              <p className={styles.factionSide}>{group.side}</p>
              <div className={styles.factionList}>
                {group.factions.map((faction) => (
                  <button
                    key={faction.name}
                    type="button"
                    aria-pressed={selected.name === faction.name}
                    className={`${styles.factionItem} ${
                      selected.name === faction.name
                        ? styles.factionItemActive
                        : ''
                    }`}
                    onClick={() => setSelected(faction)}
                  >
                    {faction.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
