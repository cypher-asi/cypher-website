'use client';

import { useState } from 'react';
import { ArrowUpRight, Check, Lock } from 'lucide-react';
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { GhostlinePass } from './ghostline';
import styles from './GhostlineCheckout.module.css';

function shortWallet(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

type PayState =
  | { kind: 'idle' }
  | { kind: 'processing' }
  | { kind: 'delivered' }
  | { kind: 'pending'; message: string }
  | { kind: 'error'; message: string };

const CARD_OPTIONS = {
  style: {
    base: {
      color: '#e6e8eb',
      fontSize: '15px',
      '::placeholder': { color: 'rgba(230,232,235,0.3)' },
    },
  },
} as const;

/**
 * Step 2 of the vehicle checkout: a Stripe Elements card field that tokenizes the
 * card in Stripe's iframe (never touching our servers) and posts to
 * /api/vehicles/checkout, which charges and delivers the NFT synchronously. Renders
 * the delivered / pending / error outcomes. Must be rendered inside <Elements>.
 */
export default function VehiclePaymentForm({
  pass,
  walletAddress,
  onBack,
}: {
  pass: GhostlinePass;
  walletAddress: string | null;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [state, setState] = useState<PayState>({ kind: 'idle' });

  async function pay() {
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;

    setState({ kind: 'processing' });

    const { error, paymentMethod } = await stripe.createPaymentMethod({ type: 'card', card });
    if (error || !paymentMethod) {
      setState({ kind: 'error', message: error?.message ?? 'Could not read your card. Please try again.' });
      return;
    }

    try {
      const res = await fetch('/api/vehicles/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passId: pass.id, paymentMethodId: paymentMethod.id }),
      });
      const body = (await res.json().catch(() => null)) as {
        status?: string;
        message?: string;
        error?: string;
      } | null;

      if (res.ok && body?.status === 'delivered') {
        setState({ kind: 'delivered' });
      } else if (res.status === 202 && body?.status === 'pending') {
        setState({
          kind: 'pending',
          message: body.message ?? 'Payment received. Your vehicle is on its way.',
        });
      } else {
        setState({ kind: 'error', message: body?.error ?? 'Payment failed. Please try again.' });
      }
    } catch {
      setState({ kind: 'error', message: 'Something went wrong. Please try again.' });
    }
  }

  if (state.kind === 'delivered') {
    return (
      <section className={styles.panel} aria-label="Payment complete">
        <h1 className={styles.panelTitle}>You&apos;re in.</h1>
        <p className={styles.panelSub}>
          <Check size={14} strokeWidth={3} aria-hidden /> Your {pass.name} is on its way to your wallet.
        </p>
      </section>
    );
  }

  if (state.kind === 'pending') {
    return (
      <section className={styles.panel} aria-label="Payment received">
        <h1 className={styles.panelTitle}>Payment received</h1>
        <p className={styles.panelSub}>{state.message}</p>
      </section>
    );
  }

  const processing = state.kind === 'processing';

  return (
    <section className={styles.panel} aria-label="Payment">
      <h1 className={styles.panelTitle}>Payment</h1>
      <p className={styles.panelSub}>
        {walletAddress ? `Delivering to ${shortWallet(walletAddress)}.` : 'Delivering to your account.'}
      </p>

      <label className={styles.field}>
        <span>Card details</span>
        <div className={styles.cardElement}>
          <CardElement options={CARD_OPTIONS} />
        </div>
      </label>

      {state.kind === 'error' && (
        <p className={styles.payError} role="alert">
          {state.message}
        </p>
      )}

      <button
        type="button"
        className="sci-btn sci-btn-primary"
        onClick={() => void pay()}
        disabled={!stripe || processing}
      >
        {processing ? (
          'Processing…'
        ) : (
          <>
            Pay {pass.price} <ArrowUpRight size={16} strokeWidth={2.4} />
          </>
        )}
      </button>
      <p className={styles.secureLine}>
        <Lock size={12} aria-hidden /> Secured by Stripe. Your card details never touch our servers.
      </p>
      <button type="button" className={styles.backLink} onClick={onBack} disabled={processing}>
        {'‹'} Back to account
      </button>
    </section>
  );
}
