import { ArrowUpRight } from 'lucide-react';
import type { MarketNft } from '@/lib/opensea';
import { formatUsd, formatEth, formatWild } from '@/lib/price';
import { FadeInImage } from '@/components/FadeInImage';
import { itemKey, shortId } from '../../lib/items';
import { CardActionButton } from '../CardActionButton/CardActionButton';
import styles from '../../market.module.css';

type Props = {
  nft: MarketNft;
  ethUsd: number | null;
  onOpen: (id: string) => void;
};

export function NftRow({ nft, ethUsd, onOpen }: Props) {
  const price =
    (nft.priceWild ? formatWild(nft.priceWild.formatted) : null) ??
    formatUsd(nft.priceEth, ethUsd) ??
    formatEth(nft.priceEth) ??
    '—';
  return (
    <div
      className={styles.row}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(itemKey(nft))}
      onKeyDown={(e) => {
        // Only the row itself — let a nested action button handle its own keys.
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(itemKey(nft));
        }
      }}
    >
      <div className={styles.rowItem}>
        <div className={styles.rowThumb}>
          {nft.image ? (
            <FadeInImage
              className={styles.rowThumbImg}
              src={nft.image}
              alt={nft.name}
              loading="lazy"
            />
          ) : (
            <div className={styles.rowThumbFallback} aria-hidden />
          )}
        </div>
        <span className={styles.rowName}>{nft.name}</span>
        {nft.fungible && nft.amount != null && (
          <span
            className={styles.rowQty}
            title={nft.amount > 1 ? `Bundle of ${nft.amount}` : 'Single unit'}
          >
            ×{nft.amount}
          </span>
        )}
      </div>
      <span className={`${styles.colToken} ${styles.rowMuted}`} title={`#${nft.identifier}`}>
        #{shortId(nft.identifier)}
      </span>
      <span className={`${styles.colTraits} ${styles.rowMuted}`}>{nft.traits.length}</span>
      <span className={`${styles.colPrice} ${styles.rowPrice}`}>{price}</span>
      <span className={styles.colAction}>
        {nft.listingId ? (
          // Z-Chain listing → real Buy/Cancel via the trade flow.
          <CardActionButton nft={nft} onOpen={onOpen} className={styles.rowActionBtn} />
        ) : nft.chain === 'zchain' ? null : (
          <a
            className={styles.buyLink}
            href={`https://opensea.io/assets/${nft.chain}/${nft.contract}/${nft.identifier}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            Buy
            <ArrowUpRight size={13} />
          </a>
        )}
      </span>
    </div>
  );
}
