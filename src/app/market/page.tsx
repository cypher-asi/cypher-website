import { WILDER_INDUSTRIES } from '@/lib/wilderCollections';
import MarketBrowser from './MarketBrowser';
import styles from './market.module.css';

export default function MarketPage() {
  return (
    <div className={styles.page}>
      <MarketBrowser industries={WILDER_INDUSTRIES} />
    </div>
  );
}
