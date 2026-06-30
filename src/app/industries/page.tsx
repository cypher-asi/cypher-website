import { SectionHeader } from '@/components/SectionHeader';
import styles from './page.module.css';

export default function IndustriesPage() {
  return (
    <div className={styles.page}>
      <SectionHeader
        as="h1"
        eyebrow="Industries"
        title="Own Every Industry"
        subtitle="Wilder World is built on player-owned industries \u2014 Land, Wheels, Beasts, Moto, PALs, Crafts, Cribs and AIRWILD. Each is a living market where you create, trade and own the assets that power Wiami."
      />

      <div className={styles.hero}>
        <img
          className={styles.heroImg}
          src="/images/wilder-world/industries.avif"
          alt=""
          aria-hidden
        />
      </div>
    </div>
  );
}
