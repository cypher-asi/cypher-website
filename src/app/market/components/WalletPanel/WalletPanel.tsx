'use client';

import { useWildBalanceQuery } from '../../hooks/useWildBalanceQuery';
import styles from '../../market.module.css';

type Props = {
  /** The connected ZERO wallet (Z-Chain). */
  address: string;
};

/**
 * Left-rail wallet summary, shown on Z-Chain collections when connected — the
 * wallet's WILD balance (the settlement token) up front so a trader can see their
 * spending power without leaving the market. Reuses the same balance read that
 * gates Buy, and the shared info-row styling so it sits naturally above the
 * filters alongside the collection stats.
 *
 * Titled "Wallets" and scoped to a labelled ZERO-wallet section: this balance is
 * Z-Chain WILD specifically. When users can later link an Ethereum wallet, it
 * slots in as a second section below without restructuring.
 */
export function WalletPanel({ address }: Props) {
  const { data, isLoading } = useWildBalanceQuery(address);
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
  const balance = isLoading
    ? '…'
    : data
      ? `${data.wild.toLocaleString(undefined, { maximumFractionDigits: 4 })} WILD`
      : '—';

  return (
    <>
      <p className={styles.railHeading}>Wallets</p>

      <div className={styles.walletSection}>
        <p className={styles.walletSectionLabel}>ZERO (Z Chain)</p>
        <div className={styles.info}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>WILD Balance</span>
            <span className={styles.infoValue}>{balance}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Address</span>
            <span className={styles.infoValue}>{short}</span>
          </div>
        </div>
      </div>

      <div className={styles.walletSection}>
        <p className={styles.walletSectionLabel}>Self Custody (Ethereum)</p>
        <div className={styles.walletEmpty}>
          Link an external Ethereum wallet to your ZERO account. Coming soon.
        </div>
      </div>
    </>
  );
}
