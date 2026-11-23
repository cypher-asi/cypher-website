/**
 * POST /api/store/checkout — buy the bag by card. Charges the whole bag in one
 * PaymentIntent and records the order as paid; delivery (minting each line) is a
 * separate, deferred fulfillment step.
 *
 * Body: { lines: [{ productId, variantId, quantity }], paymentMethodId, email, savedCard? }.
 * email is the receipt address (validated here, sent to Stripe as receipt_email).
 * savedCard=true reuses an already-saved card as-is (no re-attach); otherwise the card
 * is attached. The recipient wallet, user id, and Stripe customer are all derived from
 * the signed-in session (never the request body), so a caller cannot charge another
 * user's customer or mint to an arbitrary wallet. Per-line prices are resolved
 * server-side from the approved pricebook, and the whole flow stays inert until
 * checkout is approved.
 */
import { NextResponse } from 'next/server';
import { getSessionToken } from '@/features/auth/session';
import { currentUser } from '@/features/auth/zos';
import { authErrorResponse, crossOriginRejection, readJson } from '@/features/auth/http';
import { processStoreCheckout } from '@/features/store/checkout';
import { StoreCheckoutError } from '@/features/store/config';
import type { CartLine } from '@/features/store/types';

export const dynamic = 'force-dynamic';

/** A pragmatic "looks like an email" check; Stripe is the real validator on receipt_email. */
function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Narrow untrusted request JSON to cart lines, rejecting anything malformed. Prices are
 * never read here — only the identity and quantity of each line — because the server
 * resolves the price itself.
 */
function parseLines(value: unknown): CartLine[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const lines: CartLine[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) return null;
    const { productId, variantId, quantity } = item as Record<string, unknown>;
    if (
      typeof productId !== 'string' ||
      typeof variantId !== 'string' ||
      typeof quantity !== 'number' ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1
    ) {
      return null;
    }
    lines.push({ productId, variantId, quantity });
  }
  return lines;
}

export async function POST(request: Request): Promise<NextResponse> {
  const forged = crossOriginRejection(request);
  if (forged) return forged;

  try {
    const token = getSessionToken(request);
    if (!token) return NextResponse.json({ error: 'Sign in to buy' }, { status: 401 });

    const user = await currentUser(token);
    if (!user) return NextResponse.json({ error: 'Sign in to buy' }, { status: 401 });
    if (!user.zeroWalletAddress) {
      return NextResponse.json(
        { error: 'This account has no wallet yet, so it cannot receive the items.' },
        { status: 409 },
      );
    }

    const { lines, paymentMethodId, savedCard, email } = await readJson(request);
    const parsedLines = parseLines(lines);
    if (!parsedLines || typeof paymentMethodId !== 'string') {
      return NextResponse.json({ error: 'lines and paymentMethodId are required' }, { status: 400 });
    }
    if (typeof email !== 'string' || !isLikelyEmail(email)) {
      return NextResponse.json({ error: 'A valid email is required for your receipt' }, { status: 400 });
    }

    const result = await processStoreCheckout({
      lines: parsedLines,
      paymentMethodId,
      // Reuse only when the client explicitly flags a saved card; anything else attaches.
      savedCard: savedCard === true,
      email: email.trim(),
      walletAddress: user.zeroWalletAddress, // server-resolved, never from the client
      userId: user.id,
      sessionToken: token, // server-side, to resolve the Stripe customer for this user
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof StoreCheckoutError) {
      // The code only exists for failures after the charge, so it is sent only when
      // set: the client treats its absence as "nothing was taken".
      return NextResponse.json(
        err.code ? { error: err.message, code: err.code } : { error: err.message },
        { status: err.status },
      );
    }
    return authErrorResponse(err);
  }
}
