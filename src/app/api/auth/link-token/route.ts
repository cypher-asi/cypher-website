/**
 * POST /api/auth/link-token — mint a short-lived token authorising one
 * account-link handshake for the signed-in buyer.
 *
 * zos-api's link `initiate` is authenticated by this token in the query string
 * rather than by a session cookie, which is what lets the browser be sent
 * straight to zos-api. So this route is the only part of linking that needs our
 * session: it trades the httpOnly cookie for a token the browser may carry.
 *
 * The token is single-use and expires in 60 seconds. Request it at the moment the
 * buyer clicks, never ahead of time — a token minted on page load will be dead
 * before it is used. It authorises linking a provider to *this* account and
 * nothing else, and it is not a session: it cannot read or change the account.
 */
import { NextResponse } from 'next/server';
import { getSessionToken } from '@/features/auth/session';
import { authErrorResponse, crossOriginRejection } from '@/features/auth/http';
import { generateLinkToken } from '@/features/auth/zos';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  const rejected = crossOriginRejection(request);
  if (rejected) return rejected;

  try {
    const token = getSessionToken(request);
    if (!token) return NextResponse.json({ error: 'Sign in to connect an account' }, { status: 401 });

    return NextResponse.json({ linkToken: await generateLinkToken(token) });
  } catch (err) {
    return authErrorResponse(err);
  }
}
