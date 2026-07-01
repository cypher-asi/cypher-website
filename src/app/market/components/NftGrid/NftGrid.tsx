import type { MarketNft } from '@/lib/opensea';
import type { GridSize } from '../../types';
import { itemKey } from '../../lib/items';
import { NftCard } from '../NftCard';
import styles from '../../market.module.css';

type Props = {
  items: readonly MarketNft[];
  gridSize: GridSize;
  ethUsd: number | null;
  batchBase: number;
  onOpen: (id: string) => void;
};

export function NftGrid({ items, gridSize, ethUsd, batchBase, onOpen }: Props) {
  const gridClass = `${styles.grid} ${
    gridSize === 'lg' ? styles.gridLg : gridSize === 'sm' ? styles.gridSm : ''
  }`;
  return (
    <div className={gridClass}>
      {items.map((nft, i) => {
        // One-at-a-time reveal within the current batch; capped so a large page
        // never leaves off-screen cards waiting too long.
        const within = Math.max(0, i - batchBase);
        const delayMs = Math.min(within, 40) * 45;
        return (
          <NftCard
            key={itemKey(nft)}
            nft={nft}
            ethUsd={ethUsd}
            animationDelayMs={delayMs}
            onOpen={onOpen}
          />
        );
      })}
    </div>
  );
}
