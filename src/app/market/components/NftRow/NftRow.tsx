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
  /** On Yours, flag the wallet's own listings so held vs listed reads at a glance. */
  showListedBadge?: boolean;
};

export function NftRow({ nft, ethUsd, onOpen, showListedBadge = false }: Props) {
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
        {showListedBadge && nft.listingId && nft.owned !== true && (
          <span className={styles.rowListedBadge}>Listed</span>
        )}
        {nft.fungible && nft.amount != null && (
          <span
            className={styles.rowQty}
            title={
              nft.owned
                ? `${nft.amount} held`
                : nft.amount > 1
                  ? `Bundle of ${nft.amount}`
                  : 'Single unit'
            }
          >
            {/* Held stacks show a plain count; "Single/Bundle" is for a listing. */}
            {nft.owned
              ? `×${nft.amount}`
              : nft.amount > 1
                ? `Bundle ×${nft.amount}`
                : `Single ×${nft.amount}`}
          </span>
        )}
      </div>
      <span className={`${styles.colToken} ${styles.rowMuted}`} title={`#${nft.identifier}`}>
        #{shortId(nft.identifier)}
      </span>
      <span className={`${styles.colTraits} ${styles.rowMuted}`}>{nft.traits.length}</span>
      <span className={`${styles.colPrice} ${styles.rowPrice}`}>{price}</span>
      <span className={styles.colAction}>
        {nft.listingId || nft.owned ? (
          // Z-Chain listing → Buy/Cancel; an owned held item (Yours) → List.
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
