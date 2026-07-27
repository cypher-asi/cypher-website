'use client';

import { ChevronRight } from 'lucide-react';
import { useWildBalanceQuery } from '../../hooks/useWildBalanceQuery';
import { useHoldingsCountQuery } from '../../hooks/useHoldingsCountQuery';
import { EthereumWalletSection } from './EthereumWalletSection';
import styles from '../../market.module.css';

type Props = {
  /** The connected ZERO wallet (Z-Chain). */
  address: string;
  /** Open the consolidated holdings grid (all tradeable Z-Chain assets). */
  onOpenHoldings: () => void;
  /** Open the consolidated ETH-mainnet holdings grid (across linked EOAs). */
  onOpenEthHoldings: () => void;
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
export function WalletPanel({ address, onOpenHoldings, onOpenEthHoldings }: Props) {
  const { data, isLoading } = useWildBalanceQuery(address);
  const { data: holdingsCount } = useHoldingsCountQuery(address);
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
  const balance = isLoading
    ? '…'
    : data
      ? `${data.wild.toLocaleString(undefined, { maximumFractionDigits: 4 })} WILD`
      : '—';

  return (
    <>
      <div className={styles.walletSection}>
        <p className={styles.walletSectionLabel}>Z Wallet (Z Chain)</p>
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
        <button type="button" className={styles.walletHoldingsBtn} onClick={onOpenHoldings}>
          <span className={styles.infoLabel}>Holdings</span>
          <span className={styles.walletHoldingsValue}>
            {holdingsCount != null ? holdingsCount.toLocaleString() : '…'}
            <ChevronRight size={14} aria-hidden />
          </span>
        </button>
      </div>

      <EthereumWalletSection onOpenHoldings={onOpenEthHoldings} />
    </>
  );
}
