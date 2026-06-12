import { AsciiCube } from './_components/AsciiCube';
import { InvertTheme } from './_components/InvertTheme';
import styles from './page.module.css';

export default function Home() {
  return (
    <>
      <InvertTheme />
      <div className={styles.page}>
        <div className={styles.stage}>
          <div className={styles.frame}>
            <span className={`${styles.corner} ${styles.cornerTL}`} />
            <span className={`${styles.corner} ${styles.cornerTR}`} />
            <span className={`${styles.corner} ${styles.cornerBL}`} />
            <span className={`${styles.corner} ${styles.cornerBR}`} />
            <div className={styles.headlineBand}>
              <h1 className={`${styles.headline} ${styles.fadeIn}`}>
                Tools for the <span className={styles.headlineMuted}>Machine Age.</span>
              </h1>
            </div>
            <div className={styles.cubeWrap}>
              <AsciiCube className={styles.asciiPanel} invert />
            </div>
          </div>
        </div>
        <div className={styles.bottomSpacer} />
      </div>
    </>
  );
}
