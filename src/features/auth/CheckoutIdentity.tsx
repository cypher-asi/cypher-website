'use client';

import { ArrowUpRight, Check } from 'lucide-react';
import { useAuthStore } from './store';
import { useEpicLinkStatus } from './useEpicLinkStatus';
import { zscanAddressUrl } from '@/lib/explorer';
import styles from './CheckoutIdentity.module.css';

function shortWallet(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Who is buying, and where the vehicle is going, stated plainly before payment.
 *
 * The panel used to say only "Delivering to 0x89c1…57c3", which is easy to skim
 * past and impossible to actually check: nobody has memorised their wallet
 * address. So a buyer who had accidentally signed up a second time had nothing
 * to notice.
 *
 * Each row here is something a person can verify. The handle is the strongest of
 * them, because an account created by email carries the email as its handle
 * while one created through Epic carries the Epic username, so the two are
 * obviously different at a glance. The wallet links through to its holdings, and
 * the wrong account is visibly near empty next to the one they play on.
 */
export function CheckoutIdentity({ walletAddress }: { walletAddress: string | null }) {
  const user = useAuthStore((s) => s.user);
  const { status } = useEpicLinkStatus();

  return (
    <section className={styles.identity} aria-label="Account this purchase is delivered to">
      {/* Falls back to the handle when the account has never been named. Without
          either this row is dropped rather than repeating the wallet below it. */}
      {(user?.displayName || user?.handle) && (
        <div className={styles.row}>
          <span className={styles.label}>Signed in as ZERO/Wilder World user:</span>
          <span className={styles.value}>{user.displayName || user.handle}</span>
        </div>
      )}

      <div className={styles.row}>
        <span className={styles.label}>Delivering to Z Chain wallet address:</span>
        {walletAddress ? (
          <a
            className={styles.walletLink}
            href={zscanAddressUrl(walletAddress)}
            target="_blank"
            rel="noopener noreferrer"
            title="View this wallet's holdings on zscan"
          >
            {shortWallet(walletAddress)}
            <ArrowUpRight size={12} strokeWidth={2.4} aria-hidden />
          </a>
        ) : (
          <span className={styles.value}>Your ZERO wallet</span>
        )}
      </div>

      {/* Silent while the check is in flight or if it failed. Guessing "not
          connected" would tell someone they have a problem they do not have,
          mid-purchase, which is worse than saying nothing. */}
      {(status.kind === 'linked' || status.kind === 'unlinked') && (
        <div className={styles.row}>
          <span className={styles.label}>Linked Epic Games account:</span>
          {status.kind === 'linked' ? (
            <span className={styles.connected}>
              <Check size={13} strokeWidth={3} aria-hidden />
              {status.handle ?? 'Connected'}
            </span>
          ) : (
            <span className={styles.notConnected}>Not connected</span>
          )}
        </div>
      )}
    </section>
  );
}
