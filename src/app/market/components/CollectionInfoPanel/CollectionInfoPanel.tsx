import { ArrowUpRight } from 'lucide-react';
import { formatUsd, formatEth } from '@/lib/price';
import styles from '../../market.module.css';

type Props = {
  launched: string | null;
  floorPrice: number | null;
  topOfferEth: number | null;
  totalVolume: number | null;
  listedCount: number | null;
  owners: number | null;
  ethUsd: number | null;
  /** Z-Chain collections settle in WILD; show "N WILD" instead of USD. */
  wildDenominated?: boolean;
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

/** Floor / volume: WILD amount for Z-Chain collections, else USD/ETH. */
const price = (value: number | null, ethUsd: number | null, wild: boolean): string => {
  if (!wild) return money(value, ethUsd);
  return value != null
    ? `${value.toLocaleString(undefined, { maximumFractionDigits: 4 })} WILD`
    : '—';
};

export function CollectionInfoPanel({
  launched,
  floorPrice,
  topOfferEth,
  totalVolume,
  listedCount,
  owners,
  ethUsd,
  wildDenominated = false,
  openseaSlug,
}: Props) {
  return (
    <>
      <div className={styles.info}>
        <InfoRow label="Launched" value={launched ?? '—'} />
        <InfoRow label="Floor Price" value={price(floorPrice, ethUsd, wildDenominated)} />
        <InfoRow label="Top Offer" value={money(topOfferEth, ethUsd)} />
        <InfoRow label="Total Volume" value={price(totalVolume, ethUsd, wildDenominated)} />
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
