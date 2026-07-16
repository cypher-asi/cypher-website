import type { MarketNft } from '@/lib/opensea';
import { formatUsd, formatWild } from '@/lib/price';
import { FadeInImage } from '@/components/FadeInImage';
import { itemKey } from '../../lib/items';
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
  return (
    <button
      type="button"
      className={styles.card}
      style={{ animationDelay: `${animationDelayMs}ms` }}
      onClick={() => onOpen(itemKey(nft))}
    >
      <div className={styles.cardImageWrap}>
        {nft.amount != null && nft.amount > 1 && (
          <span className={styles.cardQty} title={`Bundle of ${nft.amount}`}>
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
      </div>
    </button>
  );
}
