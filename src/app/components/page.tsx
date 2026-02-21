import { ZuiDemo } from '../_components/ZuiDemo';
import styles from './page.module.css';

export default function ComponentsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>ZUI Showcase</h1>
        <p className={styles.subtitle}>
          Interactive demo of ZUI components imported from{' '}
          <code className={styles.code}>@cypher-asi/zui</code>.
        </p>
      </header>
      <ZuiDemo />
    </div>
  );
}
