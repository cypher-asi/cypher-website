'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Check, Lock } from 'lucide-react';
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { VehiclePass } from './vehicles';
import type { SavedCard } from '@/features/vehicles/types';
import { zscanTxUrl } from '@/lib/explorer';
import styles from './VehicleCheckout.module.css';

function shortWallet(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatCard(card: SavedCard): string {
  const brand = card.brand ? card.brand.charAt(0).toUpperCase() + card.brand.slice(1) : 'Card';
  return `${brand} •••• ${card.last4}`;
}

type PayState =
  | { kind: 'idle' }
  | { kind: 'processing' }
  | { kind: 'delivered'; transactionHash?: string }
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
 * The payment panel of the vehicle checkout: a Stripe Elements card field that
 * tokenizes the card in Stripe's iframe (never touching our servers) and posts to
 * /api/vehicles/checkout, which charges and delivers the NFT synchronously. Renders
 * the delivered / pending / error outcomes. Must be rendered inside <Elements>.
 */
export default function VehiclePaymentForm({
  pass,
  walletAddress,
}: {
  pass: VehiclePass;
  walletAddress: string | null;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [state, setState] = useState<PayState>({ kind: 'idle' });
  const [email, setEmail] = useState('');
  // null while the saved cards are loading; then the buyer's cards ([] if none).
  const [cards, setCards] = useState<SavedCard[] | null>(null);
  const [useNewCard, setUseNewCard] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  useEffect(() => {
    let active = true;
    fetch('/api/vehicles/payment-methods')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active) setCards(Array.isArray(data?.cards) ? data.cards : []);
      })
      .catch(() => {
        // A failure to load saved cards is non-fatal — fall back to entering a new one.
        if (active) setCards([]);
      });
    return () => {
      active = false;
    };
  }, []);

  // Prefill the most-recent saved card; the toggle switches to entering a new one.
  const savedCard = cards && cards.length > 0 ? cards[0] : null;
  const showSaved = savedCard !== null && !useNewCard;

  async function pay() {
    if (!emailValid) {
      setState({ kind: 'error', message: 'Enter a valid email for your receipt.' });
      return;
    }

    let paymentMethodId: string;
    let usingSaved = false;

    if (showSaved && savedCard) {
      paymentMethodId = savedCard.id; // reuse the saved card as-is (no re-attach)
      usingSaved = true;
      setState({ kind: 'processing' });
    } else {
      if (!stripe || !elements) return;
      const card = elements.getElement(CardElement);
      if (!card) return;
      setState({ kind: 'processing' });
      const { error, paymentMethod } = await stripe.createPaymentMethod({ type: 'card', card });
      if (error || !paymentMethod) {
        setState({ kind: 'error', message: error?.message ?? 'Could not read your card. Please try again.' });
        return;
      }
      paymentMethodId = paymentMethod.id;
    }

    try {
      const res = await fetch('/api/vehicles/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passId: pass.id, paymentMethodId, savedCard: usingSaved, email: email.trim() }),
      });
      const body = (await res.json().catch(() => null)) as {
        status?: string;
        message?: string;
        error?: string;
        transactionHash?: string;
      } | null;

      if (res.ok && body?.status === 'delivered') {
        setState({ kind: 'delivered', transactionHash: body.transactionHash });
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
        {state.transactionHash && (
          <a
            className={styles.explorerLink}
            href={zscanTxUrl(state.transactionHash)}
            target="_blank"
            rel="noopener noreferrer"
          >
            View transaction on zscan
            <ArrowUpRight size={13} />
          </a>
        )}
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
        <span>Email</span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={processing}
        />
      </label>
      <p className={styles.hint}>Where your payment receipt is sent — not your on-chain confirmation.</p>

      {cards === null ? (
        <p className={styles.panelSub}>Loading payment options…</p>
      ) : showSaved && savedCard ? (
        <div className={styles.field}>
          <span>Card details</span>
          <div className={styles.savedCard}>
            <span className={styles.savedCardLabel}>{formatCard(savedCard)}</span>
            <button
              type="button"
              className={styles.backLink}
              onClick={() => setUseNewCard(true)}
              disabled={processing}
            >
              Use a different card
            </button>
          </div>
        </div>
      ) : (
        <>
          <label className={styles.field}>
            <span>Card details</span>
            <div className={styles.cardElement}>
              <CardElement options={CARD_OPTIONS} />
            </div>
          </label>
          {savedCard && (
            <button
              type="button"
              className={styles.backLink}
              onClick={() => setUseNewCard(false)}
              disabled={processing}
            >
              {'‹'} Use your saved card
            </button>
          )}
        </>
      )}

      {state.kind === 'error' && (
        <p className={styles.payError} role="alert">
          {state.message}
        </p>
      )}

      <button
        type="button"
        className="sci-btn sci-btn-primary"
        onClick={() => void pay()}
        disabled={cards === null || processing || (!showSaved && !stripe)}
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
    </section>
  );
}
