import { AsciiCube } from './_components/AsciiCube';
import { Headline } from './_components/Headline';
import { InvertTheme } from './_components/InvertTheme';
import styles from './page.module.css';

export default function Home() {
  return (
    <>
      <InvertTheme />
      <Headline />
      <div className={styles.page}>
        <div className={styles.stage}>
          <div className={styles.frame}>
            <span className={`${styles.corner} ${styles.cornerTL}`} />
            <span className={`${styles.corner} ${styles.cornerTR}`} />
            <span className={`${styles.corner} ${styles.cornerBL}`} />
            <span className={`${styles.corner} ${styles.cornerBR}`} />
            <AsciiCube className={styles.asciiPanel} invert />
          </div>
        </div>
        <div className={styles.bottomSpacer} />
      </div>
    </>
  );
}
