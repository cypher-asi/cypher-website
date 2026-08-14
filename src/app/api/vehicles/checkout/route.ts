/**
 * POST /api/vehicles/checkout — buy a vehicle by card. Charges the card and
 * delivers the NFT synchronously (the packs pattern): confirm a Stripe
 * PaymentIntent, then mint via ww-tx-server; refund on a mint failure.
 *
 * Body: { passId, paymentMethodId, savedCard? }. savedCard=true reuses an
 * already-saved card as-is (no re-attach); otherwise the card is attached. The
 * recipient wallet, user id, and Stripe
 * customer are all derived from the signed-in session (never the request body), so a
 * caller cannot mint to an arbitrary wallet, charge another user's customer, or spoof
 * identity. Price is resolved server-side from the pass id.
 */
import { NextResponse } from 'next/server';
import { getSessionToken } from '@/features/auth/session';
import { currentUser } from '@/features/auth/zos';
import { authErrorResponse, crossOriginRejection, readJson } from '@/features/auth/http';
import { processVehicleCheckout } from '@/features/vehicles/checkout';
import { VehicleCheckoutError } from '@/features/vehicles/config';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  const forged = crossOriginRejection(request);
  if (forged) return forged;

  try {
    const token = getSessionToken(request);
    if (!token) return NextResponse.json({ error: 'Sign in to buy a vehicle' }, { status: 401 });

    const user = await currentUser(token);
    if (!user) return NextResponse.json({ error: 'Sign in to buy a vehicle' }, { status: 401 });
    if (!user.zeroWalletAddress) {
      return NextResponse.json(
        { error: 'This account has no wallet yet, so it cannot receive the vehicle.' },
        { status: 409 },
      );
    }

    const { passId, paymentMethodId, savedCard } = await readJson(request);
    if (typeof passId !== 'string' || typeof paymentMethodId !== 'string') {
      return NextResponse.json({ error: 'passId and paymentMethodId are required' }, { status: 400 });
    }

    const result = await processVehicleCheckout({
      passId,
      paymentMethodId,
      // Reuse only when the client explicitly flags a saved card; anything else attaches.
      savedCard: savedCard === true,
      walletAddress: user.zeroWalletAddress, // server-resolved, never from the client
      userId: user.id,
      sessionToken: token, // server-side, to resolve the Stripe customer for this user
    });

    return NextResponse.json(result, { status: result.status === 'pending' ? 202 : 200 });
  } catch (err) {
    if (err instanceof VehicleCheckoutError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return authErrorResponse(err);
  }
}
