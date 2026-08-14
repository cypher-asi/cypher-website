/**
 * GET /api/vehicles/payment-methods — the signed-in buyer's saved cards, so the
 * checkout can prefill their most-recent card instead of re-entering it. A thin
 * server-side proxy to zero-payments-server: the session's zos token (httpOnly
 * cookie, never exposed to the browser) authenticates the call, and the payments
 * service returns only that user's cards. Read-only; no card is attached here.
 */
import { NextResponse } from 'next/server';
import { getSessionToken } from '@/features/auth/session';
import { authErrorResponse } from '@/features/auth/http';
import { listSavedCards } from '@/features/vehicles/customer';
import { VehicleCheckoutError } from '@/features/vehicles/config';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const token = getSessionToken(request);
    if (!token) return NextResponse.json({ error: 'Sign in to view your cards' }, { status: 401 });

    const cards = await listSavedCards(token);
    return NextResponse.json({ cards });
  } catch (err) {
    if (err instanceof VehicleCheckoutError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return authErrorResponse(err);
  }
}
