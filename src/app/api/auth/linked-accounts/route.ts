/**
 * GET /api/auth/linked-accounts — which OAuth providers are connected to the
 * signed-in ZERO account.
 *
 * A thin server-side proxy to zos-api: the session's zos token (httpOnly cookie,
 * never exposed to the browser) authenticates the call, and zos-api returns only
 * that user's own authorizations.
 *
 * This exists so the post-purchase "Connect Epic account" prompt can be skipped
 * for the buyers who don't need it — an account created through Epic is linked at
 * creation, so prompting them would be asking for something they already have.
 */
import { NextResponse } from 'next/server';
import { getSessionToken } from '@/features/auth/session';
import { authErrorResponse } from '@/features/auth/http';
import { linkedAccounts } from '@/features/auth/zos';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const token = getSessionToken(request);
    if (!token) return NextResponse.json({ error: 'Sign in to view linked accounts' }, { status: 401 });

    return NextResponse.json({ accounts: await linkedAccounts(token) });
  } catch (err) {
    return authErrorResponse(err);
  }
}
