import type { Metadata } from 'next';
import { MarketHeader } from '@/sites/wilderworld/marketplace/MarketHeader';
import typography from '@/components/SectionHeader.module.css';
import styles from '@/sites/wilderworld/marketplace/Marketplace.module.css';

export const metadata: Metadata = {
  title: 'Markets — Wilder World',
  description: 'Wilder World product markets.',
  robots: { index: false, follow: false },
};

export default function MarketsPage() {
  return <main className={styles.page}>
    <MarketHeader marketsActive />
    <section className={styles.browseContent}>
      <h1 className={typography.title}>Markets</h1>
      <p>Market rankings, price history and trading are coming soon.</p>
    </section>
  </main>;
}
