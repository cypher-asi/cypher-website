'use client';

import Link from 'next/link';
import { ArrowUpRight, Check } from 'lucide-react';
import { Elements } from '@stripe/react-stripe-js';
import { useAuthStore } from '@/features/auth/store';
import { getStripePromise } from '@/features/vehicles/stripe-client';
import type { VehiclePass } from './vehicles';
import VehiclePaymentForm from './VehiclePaymentForm';
import styles from './VehicleCheckout.module.css';

/** Single-panel buy flow. What the panel shows follows the session rather than a
 *  step the buyer has to advance: without a usable account it asks for one, and
 *  with a usable account it goes straight to payment, so there is no interstitial
 *  "continue" click between signing in and paying. Auth reuses the shared ZERO
 *  modal (mounted by AuthProvider on Wilder World): Create account / Log in open
 *  it, and we react to the resulting session, delivering the pass to the signed-in
 *  account's zero wallet. Payment is a Stripe Elements card field
 *  (VehiclePaymentForm) that charges and delivers via /api/vehicles/checkout. */
export default function VehicleCheckout({ pass }: { pass: VehiclePass }) {
  const user = useAuthStore((s) => s.user);
  const openLogin = useAuthStore((s) => s.openLogin);
  const openCreate = useAuthStore((s) => s.openCreate);
  const disconnect = useAuthStore((s) => s.disconnect);

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        {/* ── Order summary ── */}
        <aside className={styles.summary}>
          <div className={styles.summaryMedia}>
            <video src={pass.video} autoPlay loop muted playsInline preload="metadata" />
          </div>
          <div className={styles.summaryBody}>
            <p className={styles.summaryTier}>{pass.tier} Pass</p>
            <p className={styles.summaryName}>{pass.name}</p>
            <ul className={styles.summaryList}>
              {pass.contents.map((line) => (
                <li key={line}>
                  <Check size={13} strokeWidth={3} aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
            <div className={styles.summaryTotal}>
              <span>Total</span>
              <span>{pass.price}</span>
            </div>
          </div>
        </aside>

        {/* ── Account, or payment once the account can receive the vehicle ── */}
        <div className={styles.flow}>
          <Link href="/vehicles" className={styles.backToStore}>
            {'‹'} Back to store
          </Link>

          {user?.zeroWalletAddress ? (
            <Elements stripe={getStripePromise()}>
              <VehiclePaymentForm pass={pass} walletAddress={user.zeroWalletAddress} />
            </Elements>
          ) : user ? (
            <section className={styles.panel} aria-label="Account">
              <h1 className={styles.panelTitle}>Your account</h1>
              <p className={styles.panelSub}>
                Your pass and everything in it gets delivered to this account.
              </p>
              <div className={styles.connected}>
                <span className={styles.connectedId} title={user.handle ?? undefined}>
                  {user.handle ?? 'Account'}
                </span>
                <button
                  type="button"
                  className={styles.disconnectBtn}
                  onClick={() => void disconnect()}
                >
                  Disconnect
                </button>
              </div>
              <p className={styles.panelSub}>
                This ZERO account has no wallet yet, so it can&apos;t receive the vehicle. Disconnect
                and use an account with a wallet.
              </p>
            </section>
          ) : (
            <section className={styles.panel} aria-label="Account">
              <h1 className={styles.panelTitle}>Sign in to checkout</h1>
              <p className={styles.panelSub}>
                Your Wilder World account is powered by ZERO. Your pass and everything in it gets
                delivered to your account&apos;s wallet.
              </p>

              {/* Signing in leads. Most buyers already have an account from the game,
                  so making "create" the loud option would hand them a second one and
                  deliver the vehicle to a wallet the game does not know about. */}
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
          )}
        </div>
      </div>
    </div>
  );
}
