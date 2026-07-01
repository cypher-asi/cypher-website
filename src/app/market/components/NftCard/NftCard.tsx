import type { MarketNft } from '@/lib/opensea';
import { formatUsd } from '@/lib/price';
import { FadeInImage } from '@/components/FadeInImage';
import styles from '../../market.module.css';

type Props = {
  nft: MarketNft;
  ethUsd: number | null;
  animationDelayMs: number;
  onOpen: (id: string) => void;
};

export function NftCard({ nft, ethUsd, animationDelayMs, onOpen }: Props) {
  const priceUsd = formatUsd(nft.priceEth, ethUsd);
  return (
    <button
      type="button"
      className={styles.card}
      style={{ animationDelay: `${animationDelayMs}ms` }}
      onClick={() => onOpen(nft.identifier)}
    >
      <div className={styles.cardImageWrap}>
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
        {priceUsd && <span className={styles.cardPrice}>{priceUsd}</span>}
      </div>
    </button>
  );
}
