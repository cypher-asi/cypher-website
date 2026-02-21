import { AsciiCube } from './_components/AsciiCube';
import { Headline } from './_components/Headline';
import styles from './page.module.css';

export default function Home() {
  return (
    <>
      <Headline />
      <div className={styles.page}>
        <AsciiCube className={styles.asciiPanel} />
        <div className={styles.bottomSpacer} />
      </div>
    </>
  );
}
