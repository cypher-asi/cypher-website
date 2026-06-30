'use client';

import { useState } from 'react';
import { ArrowUpRight, Moon, Play, Sun, Sunset } from 'lucide-react';
import { SectionHeader } from '@/components/SectionHeader';
import GameplayCard, { type GameplayCardProps } from './GameplayCard';
import FactionSelector from './FactionSelector';
import styles from './Landing.module.css';

const EARLY_ACCESS_URL =
  'https://store.epicgames.com/p/wilder-world-wilder-world-alpha-b4ccf8?lang=en-US';
const TRAILER_URL = 'https://www.youtube.com/watch?v=7G8SwYp6gPo';

const BACKDROPS = [
  { id: 'day', label: 'Day', Icon: Sun, src: '/videos/midday.mp4' },
  { id: 'sunset', label: 'Sunset', Icon: Sunset, src: '/videos/sunset.mp4' },
  { id: 'night', label: 'Night', Icon: Moon, src: '/videos/night.mp4' },
] as const;

type BackdropId = (typeof BACKDROPS)[number]['id'];

const GAMEPLAY_MODES: GameplayCardProps[] = [
  {
    title: 'Race',
    description: 'Tear through the streets in high-speed races across Wiami.',
    video: '/videos/wiami-race.mp4',
  },
  {
    title: 'Fight',
    description: 'Take the fight street-level in intense FPS battles.',
    video: '/videos/wiami-fight.mp4',
  },
  {
    title: 'Explore',
    description: 'Roam a massive open world driven by RPG missions.',
  },
  {
    title: 'Build',
    description: 'Own and build everything from land to vehicles.',
  },
];

export default function WilderworldLanding() {
  const [active, setActive] = useState<BackdropId>('sunset');
  const activeBackdrop =
    BACKDROPS.find((b) => b.id === active) ?? BACKDROPS[1];

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.frame}>
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
          <div className={styles.scrim} aria-hidden />
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
          <div className={styles.overlay}>
            <h1 className={styles.heading}>The Simulation.</h1>
            <div className={styles.actions}>
              <a
                className="sci-btn sci-btn-primary"
                href={EARLY_ACCESS_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Early Access
                <ArrowUpRight size={16} />
              </a>
              <a
                className="sci-btn sci-btn-ghost"
                href={TRAILER_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Play size={15} />
                Watch Trailer
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="gameplay" className={styles.gameplaySection}>
        <div className={styles.gameplayInner}>
          <SectionHeader
            eyebrow="Gameplay"
            title="Wire In"
            subtitle={
              <>
                A massive open-world simulation where you can race, fight,
                explore and build. Engage in high-speed street races, intense
                FPS battles, RPG-driven missions and own everything from land to
                vehicles&mdash;all within Wilder World.
              </>
            }
          />
          <div className={styles.gameplayGrid}>
            {GAMEPLAY_MODES.map((mode) => (
              <GameplayCard key={mode.title} {...mode} />
            ))}
          </div>
        </div>
      </section>

      <section className={styles.gameplaySection}>
        <SectionHeader
          eyebrow="Universe"
          title="Fight For Freedom"
          subtitle={
            <>
              Wiami was meant to stay hidden beyond The GATE. But The FORUM has
              found it, turning its full force on the city. The attack has begun,
              and only those willing to fight can keep the simulation standing.
            </>
          }
        />
      </section>

      <section className={styles.gameplaySection}>
        <SectionHeader eyebrow="Factions" title="Choose Your Mission" />
      </section>

      <section id="factions" className={styles.section}>
        <FactionSelector />
      </section>

      <section id="forum" className={styles.section}>
        <div className={styles.frame}>
          <img
            className={styles.bg}
            src="/images/wilder-world/the-forum.png"
            alt=""
            aria-hidden
          />
          <div className={styles.scrimDiagonal} aria-hidden />
          <div className={styles.overlay}>
            <h2 className={styles.heading}>The Forum.</h2>
            <p className={styles.bodyText}>
              Once built to keep Wiami safe, The FORUM now governs every street,
              transaction, and citizen through automated enforcement and
              predictive control.
            </p>
            <p className={styles.bodyText}>
              Its enforcers patrol the districts below and its sensors never
              sleep. Nothing moves through the city without its permission, and
              nothing is forgotten.
            </p>
          </div>
        </div>
      </section>

      <section id="trinity" className={styles.section}>
        <div className={styles.frame}>
          <img
            className={styles.bg}
            src="/images/wilder-world/trinity-program.png"
            alt=""
            aria-hidden
          />
          <div className={styles.scrimDiagonal} aria-hidden />
          <div className={styles.overlay}>
            <h2 className={styles.heading}>Trinity Program.</h2>
            <p className={styles.bodyText}>
              The Trinity Program forges raw recruits into something The FORUM
              never accounted for. Three disciplines &mdash; combat, code, and
              conviction &mdash; trained until they move as one.
            </p>
            <p className={styles.bodyText}>
              Master all three and you stop running from the city&rsquo;s
              systems and start turning them into weapons. This is where survivors
              become the spark of the rebellion.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
