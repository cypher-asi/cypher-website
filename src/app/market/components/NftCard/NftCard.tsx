'use client';

import { Loader2 } from 'lucide-react';
import type { MarketNft } from '@/lib/opensea';
import { formatUsd, formatWild } from '@/lib/price';
import { FadeInImage } from '@/components/FadeInImage';
import { useProcessing, PROCESSING_VERB } from '@/features/marketplace/processingStore';
import { itemKey } from '../../lib/items';
import { CardActionButton } from '../CardActionButton/CardActionButton';
import styles from '../../market.module.css';

type Props = {
  nft: MarketNft;
  ethUsd: number | null;
  animationDelayMs: number;
  onOpen: (id: string) => void;
  /** On Yours, flag the wallet's own listings so held vs listed reads at a glance. */
  showListedBadge?: boolean;
};

export function NftCard({ nft, ethUsd, animationDelayMs, onOpen, showListedBadge = false }: Props) {
  // Z-Chain listings settle in WILD (no USD feed); ETH listings show USD.
  const price = nft.priceWild ? formatWild(nft.priceWild.formatted) : formatUsd(nft.priceEth, ethUsd);
  // A settling trade on this card shows a spinner over the image until the grids
  // refetch it away (or a timeout flips it to a fail-loud "refresh" hint).
  const processing = useProcessing(nft);
  // A div (not a button) so the action button below can nest without invalid
  // markup; the card keeps button semantics via role + keyboard handling.
  return (
    <div
      role="button"
      tabIndex={0}
      className={styles.card}
      style={{ animationDelay: `${animationDelayMs}ms` }}
      onClick={() => onOpen(itemKey(nft))}
      onKeyDown={(e) => {
        // Only the card itself — let a nested action button handle its own keys.
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(itemKey(nft));
        }
      }}
    >
      <div className={styles.cardImageWrap}>
        {showListedBadge && nft.listingId && nft.owned !== true && (
          <span className={styles.cardListedBadge}>Listed</span>
        )}
        {nft.fungible && nft.amount != null && (
          <span
            className={styles.cardQty}
            title={
              nft.owned
                ? `${nft.amount} held`
                : nft.amount > 1
                  ? `Bundle of ${nft.amount}`
                  : 'Single unit'
            }
          >
            {/* Held stacks show a plain count; "Single/Bundle" is reserved for a
                listing (a bundle is a for-sale concept). */}
            {nft.owned
              ? `×${nft.amount}`
              : nft.amount > 1
                ? `Bundle ×${nft.amount}`
                : `Single ×${nft.amount}`}
          </span>
        )}
        {nft.image ? (
          <FadeInImage
            className={styles.cardImage}
            src={nft.image}
            alt={nft.name}
            loading="lazy"
          />
        ) : (
          <div className={styles.cardImageFallback} aria-hidden />
        )}
        {processing && (
          <div className={styles.cardProcessing} aria-live="polite">
            {processing.timedOut ? (
              <span className={styles.cardProcessingText}>
                Taking longer than expected. Refresh to check.
              </span>
            ) : (
              <>
                <Loader2 size={20} className={styles.cardProcessingSpin} aria-hidden />
                <span className={styles.cardProcessingText}>
                  {PROCESSING_VERB[processing.action]}
                </span>
              </>
            )}
          </div>
        )}
      </div>
      <div className={styles.cardBody}>
        <span className={styles.cardName}>{nft.name}</span>
        {price && <span className={styles.cardPrice}>{price}</span>}
        <CardActionButton nft={nft} onOpen={onOpen} className={styles.cardAction} />
      </div>
    </div>
  );
}
