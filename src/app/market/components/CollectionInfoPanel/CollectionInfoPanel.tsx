import { ArrowUpRight } from 'lucide-react';
import { formatUsd, formatEth } from '@/lib/price';
import styles from '../../market.module.css';

type Props = {
  name: string;
  launched: string | null;
  floorPrice: number | null;
  topOfferEth: number | null;
  totalVolume: number | null;
  listedCount: number | null;
  owners: number | null;
  ethUsd: number | null;
  openseaSlug?: string;
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  );
}

const money = (value: number | null, ethUsd: number | null): string =>
  formatUsd(value, ethUsd) ?? formatEth(value) ?? '—';

export function CollectionInfoPanel({
  name,
  launched,
  floorPrice,
  topOfferEth,
  totalVolume,
  listedCount,
  owners,
  ethUsd,
  openseaSlug,
}: Props) {
  return (
    <>
      <p className={styles.railHeading}>{name}</p>
      <div className={styles.info}>
        <InfoRow label="Launched" value={launched ?? '—'} />
        <InfoRow label="Floor Price" value={money(floorPrice, ethUsd)} />
        <InfoRow label="Top Offer" value={money(topOfferEth, ethUsd)} />
        <InfoRow label="Total Volume" value={money(totalVolume, ethUsd)} />
        <InfoRow label="Listed" value={listedCount != null ? String(listedCount) : '—'} />
        <InfoRow
          label="Owners (Unique)"
          value={owners != null ? owners.toLocaleString() : '—'}
        />
      </div>
      {openseaSlug && (
        <a
          className={styles.railOpensea}
          href={`https://opensea.io/collection/${openseaSlug}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          View on OpenSea
          <ArrowUpRight size={12} />
        </a>
      )}
    </>
  );
}
