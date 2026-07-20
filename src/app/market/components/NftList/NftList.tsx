import type { MarketNft } from '@/lib/opensea';
import { itemKey } from '../../lib/items';
import { NftRow } from '../NftRow';
import styles from '../../market.module.css';

type Props = {
  items: readonly MarketNft[];
  ethUsd: number | null;
  onOpen: (id: string) => void;
  /** Badge the wallet's own listings as "Listed" — only meaningful on Yours. */
  showListedBadge?: boolean;
};

export function NftList({ items, ethUsd, onOpen, showListedBadge = false }: Props) {
  return (
    <div className={styles.listView}>
      <div className={styles.listHeader}>
        <span>Item</span>
        <span className={styles.colToken}>Token</span>
        <span className={styles.colTraits}>Traits</span>
        <span className={styles.colPrice}>Buy Now</span>
        <span className={styles.colAction} />
      </div>
      {items.map((nft) => (
        <NftRow
          key={itemKey(nft)}
          nft={nft}
          ethUsd={ethUsd}
          onOpen={onOpen}
          showListedBadge={showListedBadge}
        />
      ))}
    </div>
  );
}
