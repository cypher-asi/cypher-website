/**
 * GET /api/vehicles/payment-methods — what the checkout can prefill for the
 * signed-in buyer: their saved cards, so they need not re-enter one, and a receipt
 * email if we hold one. A thin server-side proxy to zero-payments-server: the
 * session's zos token (httpOnly cookie, never exposed to the browser)
 * authenticates the call, and the payments service returns only that user's
 * cards. Read-only; no card is attached here.
 *
 * The email prefers the Stripe customer (the address that has actually received
 * receipts) and falls back to the ZERO account. Either can be absent — accounts
 * created through a social provider carry no email, and a Stripe customer only
 * gets one via the subscription or autobuy paths — in which case the buyer simply
 * types it.
 */
import { NextResponse } from 'next/server';
import { getSessionToken } from '@/features/auth/session';
import { authErrorResponse } from '@/features/auth/http';
import { currentUserEmail } from '@/features/auth/zos';
import { listCheckoutPrefill } from '@/features/vehicles/customer';
import { VehicleCheckoutError } from '@/features/vehicles/config';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const token = getSessionToken(request);
    if (!token) return NextResponse.json({ error: 'Sign in to view your cards' }, { status: 401 });

    const { cards, stripeEmail } = await listCheckoutPrefill(token);
    const email = stripeEmail ?? (await currentUserEmail(token));
    return NextResponse.json({ cards, email });
  } catch (err) {
    if (err instanceof VehicleCheckoutError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return authErrorResponse(err);
  }
}
