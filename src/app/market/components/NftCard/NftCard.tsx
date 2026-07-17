import type { MarketNft } from '@/lib/opensea';
import { formatUsd, formatWild } from '@/lib/price';
import { FadeInImage } from '@/components/FadeInImage';
import { itemKey } from '../../lib/items';
import { CardActionButton } from '../CardActionButton/CardActionButton';
import styles from '../../market.module.css';

type Props = {
  nft: MarketNft;
  ethUsd: number | null;
  animationDelayMs: number;
  onOpen: (id: string) => void;
};

export function NftCard({ nft, ethUsd, animationDelayMs, onOpen }: Props) {
  // Z-Chain listings settle in WILD (no USD feed); ETH listings show USD.
  const price = nft.priceWild ? formatWild(nft.priceWild.formatted) : formatUsd(nft.priceEth, ethUsd);
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
        {nft.fungible && nft.amount != null && (
          <span
            className={styles.cardQty}
            title={nft.amount > 1 ? `Bundle of ${nft.amount}` : 'Single unit'}
          >
            ×{nft.amount}
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
      </div>
      <div className={styles.cardBody}>
        <span className={styles.cardName}>{nft.name}</span>
        {price && <span className={styles.cardPrice}>{price}</span>}
        <CardActionButton nft={nft} onOpen={onOpen} className={styles.cardAction} />
      </div>
    </div>
  );
}
