'use client';

import { useEpicLinkStatus } from './useEpicLinkStatus';
import styles from './EpicCheckoutNotice.module.css';

/**
 * Shown before paying, to a buyer whose ZERO account has no Epic Games account
 * connected.
 *
 * This is the last cheap moment to catch the wrong-account case. The sign-up
 * warning only fires while an account is being created, so it misses anyone who
 * signs into an email account they already had — they reach checkout with
 * nothing having mentioned it. Once the vehicle has been delivered every
 * remaining option costs something: connect Epic and lose the account they play
 * on, or transfer the vehicle across. Beforehand, the fix is free — sign in with
 * Epic instead and it arrives on the right account first time.
 *
 * Passive by design: no button, no step, nothing to dismiss. It must not stand
 * between anyone and paying.
 */
export function EpicCheckoutNotice() {
  const { status } = useEpicLinkStatus();

  // Silent unless we know the account has no Epic connected — including when the
  // check failed. Raising this with someone it does not apply to, mid-purchase,
  // is worse than not raising it at all.
  if (status.kind !== 'unlinked') return null;

  return (
    <p className={styles.checkoutNotice}>
      Already play Wilder World? Sign out and sign back in with Epic Games first, so your vehicle
      arrives on the account you play on.
    </p>
  );
}
