'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Lock } from 'lucide-react';
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { CheckoutIdentity } from '@/features/auth/CheckoutIdentity';
import type { CartLine, SavedCard, StoreOrderStatus } from './types';
import styles from './StorePaymentForm.module.css';

const CARD_OPTIONS = {
  style: {
    base: {
      color: '#e6e8eb',
      fontSize: '15px',
      '::placeholder': { color: 'rgba(230,232,235,0.3)' },
    },
  },
} as const;

function formatPrice(priceCents: number): string {
  return `$${(priceCents / 100).toFixed(priceCents % 100 ? 2 : 0)}`;
}

function formatCard(card: SavedCard): string {
  const brand = card.brand ? card.brand.charAt(0).toUpperCase() + card.brand.slice(1) : 'Card';
  return `${brand} •••• ${card.last4}`;
}

type PayState =
  | { kind: 'idle' }
  | { kind: 'processing' }
  | { kind: 'error'; message: string };

/**
 * The payment elements of the store checkout: a Stripe Elements card field that
 * tokenizes the card in Stripe's iframe (never touching our servers) and posts the
 * whole bag to /api/store/checkout, which charges it in one PaymentIntent. On a
 * successful charge it calls onPaid and renders nothing further — the surrounding
 * flow (the bag's confirmation step) owns what the buyer sees next. Renders the
 * error outcome inline. Must be rendered inside <Elements>.
 *
 * The one shared piece is CheckoutIdentity, the site's product-agnostic pre-pay
 * "who is this going to" check (it only takes a wallet address).
 */
export default function StorePaymentForm({
  lines,
  totalCents,
  walletAddress,
  onPaid,
  onCancel,
}: {
  /** The bag being charged. Sent as-is; prices are resolved server-side. */
  lines: CartLine[];
  /** The bag total in USD cents, for the Pay button only (the charge amount is server-side). */
  totalCents: number;
  walletAddress: string;
  /**
   * Called once the charge succeeds, with the fulfilment outcome, so the surrounding
   * flow can show an honest confirmation (delivered, still arriving, or refunded).
   */
  onPaid: (delivery: StoreOrderStatus) => void;
  /**
   * Back out before paying. Offered only at the safe points (nothing in flight,
   * nothing settled): a buyer must not be able to collapse the panel mid-charge and
   * lose sight of the outcome of a payment that is already running.
   */
  onCancel?: () => void;
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
    fetch('/api/store/payment-methods')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return;
        setCards(Array.isArray(data?.cards) ? data.cards : []);
        // Prefill the receipt email when we hold one, without overwriting anything
        // the buyer has already typed while this was in flight.
        if (typeof data?.email === 'string' && data.email) {
          setEmail((current) => current || data.email);
        }
      })
      .catch(() => {
        // A failure to load saved cards is non-fatal — fall back to a new card.
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
      const res = await fetch('/api/store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines, paymentMethodId, savedCard: usingSaved, email: email.trim() }),
      });
      const body = (await res.json().catch(() => null)) as {
        status?: string;
        delivery?: StoreOrderStatus;
        error?: string;
      } | null;

      if (res.ok && body?.status === 'paid') {
        // Delivery ran server-side, so default to the safe still-arriving state if the
        // response somehow omits it, which is never wrong for an order already paid.
        onPaid(body.delivery ?? 'undelivered');
      } else {
        // The charge either succeeded (above) or nothing was taken, so every other
        // outcome is safe to try again.
        setState({ kind: 'error', message: body?.error ?? 'Payment failed. Please try again.' });
      }
    } catch {
      setState({ kind: 'error', message: 'Something went wrong. Please try again.' });
    }
  }

  const processing = state.kind === 'processing';
  // Until the prefill lands we don't yet know the buyer's email or saved card, so
  // the whole form is held: entering an email that is about to be overwritten, or
  // pressing a Pay button that is already disabled, both read as broken.
  const loading = cards === null;
  const busy = loading || processing;

  return (
    <section className={styles.form} aria-label="Payment">
      {/* Each row here is something a buyer can verify before paying — the last
          point where landing on the wrong account is still free to avoid. */}
      <CheckoutIdentity walletAddress={walletAddress} />

      <label className={styles.field}>
        <span>Email</span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
        />
      </label>
      <p className={styles.hint}>Where your payment receipt is sent, not your on-chain confirmation.</p>

      {cards === null ? (
        <p className={styles.loadingNote}>Loading payment options…</p>
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
        <div className={styles.field}>
          {/* A div rather than a label: the card field is a Stripe iframe, so the
              association was only cosmetic, and the way back to the saved card
              sits in this header row where a label would claim its clicks. */}
          <div className={styles.fieldHeader}>
            <span>Card details</span>
            {savedCard && (
              <button
                type="button"
                className={styles.fieldAction}
                onClick={() => setUseNewCard(false)}
                disabled={processing}
              >
                {'‹'} Use your saved card
              </button>
            )}
          </div>
          <div className={styles.cardElement}>
            <CardElement options={CARD_OPTIONS} />
          </div>
        </div>
      )}

      {state.kind === 'error' && (
        <p className={styles.payError} role="alert">
          {state.message}
        </p>
      )}

      <button
        type="button"
        className={`sci-btn sci-btn-primary ${busy ? styles.btnBusy : ''}`}
        onClick={() => void pay()}
        disabled={busy || (!showSaved && !stripe)}
      >
        {processing ? (
          'Processing…'
        ) : (
          <>
            Pay {formatPrice(totalCents)} <ArrowUpRight size={16} strokeWidth={2.4} />
          </>
        )}
      </button>
      {processing && (
        <p className={styles.waitNote} role="status">
          Taking payment. Please do not close this page.
        </p>
      )}

      {/* Only idle or after a safe (retryable) error, never while processing and
          never on a terminal state, which has its own screen. */}
      {onCancel && (state.kind === 'idle' || state.kind === 'error') && (
        <button type="button" className={styles.backLink} onClick={onCancel}>
          Cancel
        </button>
      )}

      <p className={styles.secureLine}>
        <Lock size={12} aria-hidden /> Secured by Stripe. Your card details never touch our servers.
      </p>
    </section>
  );
}
