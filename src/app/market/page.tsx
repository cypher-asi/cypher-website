import { WILDER_INDUSTRIES } from '@/lib/wilderCollections';
import MarketBrowser from './MarketBrowser';
import styles from './market.module.css';

export default function MarketPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>Wilder Market</h1>
        <span className={styles.headerSub}>Live, onchain Wilder World NFTs</span>
      </div>

      <MarketBrowser industries={WILDER_INDUSTRIES} />
    </div>
  );
}
