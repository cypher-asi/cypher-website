import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/features/auth/session';
import {
  callbackUrl,
  clearHandoffCookie,
  parseOutcome,
  sanitizeCode,
} from '@/features/marketplace/hosted-link';

export const dynamic = 'force-dynamic';

/**
 * GET /api/link-wallet/complete — terminal step. The page navigates here once
 * the link flow settles (success, cancelled, or error). We clear the session
 * (the token was only needed for the linking session) and redirect to the fixed
 * callback path the host intercepts, carrying the outcome. The status is coerced
 * to a known value and any code is sanitized, so the callback query is entirely
 * our own values, never raw caller input.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const outcome = parseOutcome(searchParams.get('status'));
  const code = sanitizeCode(searchParams.get('code'));

  const response = NextResponse.redirect(callbackUrl(request, outcome, code));
  clearSessionCookie(response);
  clearHandoffCookie(response);
  return response;
}
