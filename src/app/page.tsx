import { AsciiPanel } from './_components/AsciiBackground';
import { Headline } from './_components/Headline';
import styles from './page.module.css';

export default function Home() {
  return (
    <>
      <Headline />
      <div className={styles.page}>
        <AsciiPanel className={styles.asciiPanel} />
        <div className={styles.bottomSpacer} />
      </div>
    </>
  );
}
