'use client';

import { ArrowUpRight } from 'lucide-react';
import { Elements } from '@stripe/react-stripe-js';
import { useAuthStore } from '@/features/auth/store';
import { getStripePromise } from '@/features/store/stripe-client';
import StorePaymentForm from '@/features/store/StorePaymentForm';
import type { CartLine, StoreOrderStatus } from '@/features/store/types';
import styles from './BagCheckout.module.css';

/**
 * The checkout control inside the bag's review step: the card payment elements
 * gated by the session, shown in place of the old "Finish browsing" button. What it
 * shows follows the session rather than a step the buyer advances — a usable account
 * goes straight to the card form, an account without a wallet is told why it cannot
 * receive the items, and no account is offered the shared ZERO login/create modal.
 * The items are always delivered to the signed-in account's own Z Chain wallet,
 * resolved server-side — never anything entered here.
 */
export default function BagCheckout({
  lines,
  totalCents,
  onPaid,
}: {
  lines: CartLine[];
  totalCents: number;
  /** Called once the charge succeeds, with the fulfilment outcome, for the bag's confirmation step. */
  onPaid: (delivery: StoreOrderStatus) => void;
}) {
  const user = useAuthStore((s) => s.user);
  const openLogin = useAuthStore((s) => s.openLogin);
  const openCreate = useAuthStore((s) => s.openCreate);
  const disconnect = useAuthStore((s) => s.disconnect);

  if (user?.zeroWalletAddress) {
    return (
      <Elements stripe={getStripePromise()}>
        <StorePaymentForm
          lines={lines}
          totalCents={totalCents}
          walletAddress={user.zeroWalletAddress}
          onPaid={onPaid}
        />
      </Elements>
    );
  }

  if (user) {
    return (
      <section className={styles.account} aria-label="Account">
        <p className={styles.sub}>
          This ZERO account has no wallet yet, so it can&apos;t receive your items. Disconnect and use
          an account with a wallet.
        </p>
        <div className={styles.connected}>
          <span className={styles.connectedId} title={user.handle ?? undefined}>
            {user.handle ?? 'Account'}
          </span>
          <button type="button" className={styles.disconnectBtn} onClick={() => void disconnect()}>
            Disconnect
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.account} aria-label="Sign in to buy">
      <p className={styles.sub}>
        Your Wilder World account is powered by ZERO. Your items are delivered to your
        account&apos;s wallet.
      </p>
      {/* Signing in leads: most buyers already have an account from the game, so
          making "create" the loud option would hand them a second one and deliver
          the items to a wallet the game does not know about. */}
      <p className={styles.optionLead}>Already play Wilder World or have a ZERO account?</p>
      <button type="button" className="sci-btn sci-btn-primary" onClick={openLogin}>
        Connect <ArrowUpRight size={16} strokeWidth={2.4} />
      </button>
      <p className={styles.createPrompt}>
        New to Wilder World and ZERO?{' '}
        <button type="button" onClick={openCreate}>
          Create your account here
        </button>
      </p>
    </section>
  );
}
