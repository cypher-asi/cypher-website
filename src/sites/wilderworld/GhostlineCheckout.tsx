'use client';

import { useState } from 'react';
import { ArrowUpRight, Check, Lock, Mail } from 'lucide-react';
import { useAuthStore } from '@/features/auth/store';
import type { GhostlinePass } from './ghostline';
import styles from './GhostlineCheckout.module.css';

function shortWallet(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Two-step buy flow: (1) account, (2) card payment. Auth reuses the shared ZERO
 *  login: the Log in link opens the global modal (mounted by AuthProvider on Wilder
 *  World) and we react to the resulting session, so the pass is delivered to the
 *  signed-in account's zero wallet. The create-account buttons and the card fieldset
 *  (shaped for a Stripe Payment Element) are the remaining integration points. */
export default function GhostlineCheckout({ pass }: { pass: GhostlinePass }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [account, setAccount] = useState<string | null>(null);

  const user = useAuthStore((s) => s.user);
  const openLogin = useAuthStore((s) => s.openLogin);
  const disconnect = useAuthStore((s) => s.disconnect);

  const chooseProvider = (provider: string) => {
    // INTEGRATION POINT: replace with real auth.
    //  - 'epic'  -> OAuth redirect to Epic Games (accounts.epicgames.com)
    //  - 'zero'  -> OAuth redirect to ZERO
    //  - 'email' -> create account / magic link for `email`
    setAccount(provider === 'email' ? email : provider);
    setStep(2);
  };

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

        {/* ── Steps ── */}
        <div className={styles.flow}>
          <div className={styles.stepsHead}>
            <span className={`${styles.stepTag} ${styles.stepTagActive}`}>1 &middot; Account</span>
            <span className={`${styles.stepTag} ${step === 2 ? styles.stepTagActive : ''}`}>
              2 &middot; Payment
            </span>
          </div>

          {step === 1 &&
            (user ? (
              <section className={styles.panel} aria-label="Account">
                <h1 className={styles.panelTitle}>Your account</h1>
                <p className={styles.panelSub}>
                  Your pass and everything in it gets delivered to this account.
                </p>
                <div className={styles.connected}>
                  <span className={styles.connectedId} title={user.handle ?? undefined}>
                    {user.zeroWalletAddress
                      ? shortWallet(user.zeroWalletAddress)
                      : (user.handle ?? 'Account')}
                  </span>
                  <button
                    type="button"
                    className={styles.disconnectBtn}
                    onClick={() => void disconnect()}
                  >
                    Disconnect
                  </button>
                </div>
                <button
                  type="button"
                  className="sci-btn sci-btn-primary"
                  onClick={() => setStep(2)}
                >
                  Continue to payment <ArrowUpRight size={16} strokeWidth={2.4} />
                </button>
              </section>
            ) : (
              <section className={styles.panel} aria-label="Create your account">
                <h1 className={styles.panelTitle}>Create your account</h1>
                <p className={styles.panelSub}>
                  Your pass and everything in it gets delivered to this account.
                </p>
                <button
                  type="button"
                  className={styles.providerBtn}
                  onClick={() => chooseProvider('epic')}
                >
                  Continue with Epic Games
                </button>
                <button
                  type="button"
                  className={styles.providerBtn}
                  onClick={() => chooseProvider('zero')}
                >
                  Continue with ZERO
                </button>
                <div className={styles.divider}>
                  <span>or</span>
                </div>
                <label className={styles.field}>
                  <span>Email</span>
                  <div className={styles.emailRow}>
                    <Mail size={15} aria-hidden />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@wiami.city"
                      autoComplete="email"
                    />
                  </div>
                </label>
                <button
                  type="button"
                  className="sci-btn sci-btn-primary"
                  disabled={!email.includes('@')}
                  onClick={() => chooseProvider('email')}
                >
                  Continue with Email <ArrowUpRight size={16} strokeWidth={2.4} />
                </button>
                <p className={styles.loginLine}>
                  Already a Wilder?{' '}
                  <button type="button" onClick={openLogin}>
                    Log in
                  </button>
                </p>
              </section>
            ))}

          {step === 2 && (
            <section className={styles.panel} aria-label="Payment">
              <h1 className={styles.panelTitle}>Payment</h1>
              <p className={styles.panelSub}>
                {user?.zeroWalletAddress
                  ? `Delivering to ${shortWallet(user.zeroWalletAddress)}.`
                  : account && account !== 'login'
                    ? `Delivering to ${account === 'epic' ? 'your Epic Games account' : account === 'zero' ? 'your ZERO account' : account}.`
                    : 'Delivering to your account.'}
              </p>

              {/* INTEGRATION POINT: this fieldset is replaced 1:1 by a Stripe
                  Payment Element (or the processor of choice). Markup mirrors
                  its layout so the swap is invisible. */}
              <label className={styles.field}>
                <span>Card number</span>
                <input inputMode="numeric" placeholder="1234 1234 1234 1234" autoComplete="cc-number" />
              </label>
              <div className={styles.fieldRow}>
                <label className={styles.field}>
                  <span>Expiry</span>
                  <input inputMode="numeric" placeholder="MM / YY" autoComplete="cc-exp" />
                </label>
                <label className={styles.field}>
                  <span>CVC</span>
                  <input inputMode="numeric" placeholder="CVC" autoComplete="cc-csc" />
                </label>
              </div>
              <label className={styles.field}>
                <span>Name on card</span>
                <input placeholder="Name on card" autoComplete="cc-name" />
              </label>

              <button type="button" className="sci-btn sci-btn-primary" disabled>
                Payment unavailable <ArrowUpRight size={16} strokeWidth={2.4} />
              </button>
              <p className={styles.secureLine}>
                <Lock size={12} aria-hidden /> Payment processing will be enabled after the
                production integration is complete.
              </p>
              <button type="button" className={styles.backLink} onClick={() => setStep(1)}>
                {'\u2039'} Back to account
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
