import { WILDER_INDUSTRIES } from '@/lib/wilderCollections';
import MarketBrowser from './MarketBrowser';
import { MarketWeb3Provider } from './MarketWeb3Provider';
import styles from './market.module.css';

export default function MarketPage() {
  return (
    <div className={styles.page}>
      <MarketWeb3Provider>
        <MarketBrowser industries={WILDER_INDUSTRIES} />
      </MarketWeb3Provider>
    </div>
  );
}
