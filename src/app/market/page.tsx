import { SectionHeader } from '@/components/SectionHeader';
import { WILDER_COLLECTIONS } from '@/lib/wilderCollections';
import MarketBrowser from './MarketBrowser';
import styles from './market.module.css';

export default function MarketPage() {
  return (
    <div className={styles.page}>
      <SectionHeader
        as="h1"
        eyebrow="Market"
        title="The Wilder Market"
        subtitle="Browse live, onchain Wilder World NFTs straight from the blockchain. Every collection is a player-owned industry — pick one, explore the assets and their metadata, then claim yours on OpenSea."
      />

      <MarketBrowser collections={WILDER_COLLECTIONS} />
    </div>
  );
}
