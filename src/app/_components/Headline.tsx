'use client';

import styles from '../page.module.css';

export function Headline() {
  return (
    <div className={styles.headlineWrap}>
      <h1 className={`${styles.headline} ${styles.fadeIn}`}>
        Tools for the <span className={styles.headlineMuted}>Machine Age.</span>
      </h1>
    </div>
  );
}
