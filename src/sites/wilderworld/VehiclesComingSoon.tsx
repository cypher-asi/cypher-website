import styles from './VehiclesComingSoon.module.css';

/**
 * Coming-soon teaser shown for the whole /vehicles funnel until it goes live.
 *
 * The store, detail, and checkout are gated behind this by the vehicles layout,
 * so the unfinished purchase flow is never publicly usable while payment and the
 * on-chain mint are still being wired up. Keeps the Store nav as a teaser rather
 * than exposing a half-built funnel.
 */
export function VehiclesComingSoon() {
  return (
    <section className={styles.wrap}>
      <video
        className={styles.bg}
        src="/videos/radeon-ghostline-showcase.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden
      />
      <div className={styles.scrim} aria-hidden />
      <div className={styles.content}>
        <p className={styles.kicker}>
          <span className={styles.dot} aria-hidden /> Wilder World Vehicles
        </p>
        <h1 className={styles.title}>Coming Soon</h1>
        <p className={styles.sub}>The garage is almost open. Your ride into Wiami is on its way.</p>
      </div>
    </section>
  );
}

export default VehiclesComingSoon;
