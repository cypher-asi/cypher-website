import { NextResponse } from 'next/server';
import { revokeSession } from '@/features/auth/zos';
import { getSessionToken, clearSessionCookie } from '@/features/auth/session';
import { crossOriginRejection } from '@/features/auth/http';

/**
 * POST /api/auth/logout — full disconnect. Revokes the token's zos-api session
 * and clears our cookie, so a different user can sign in with no lingering
 * session. Always succeeds locally (the cookie is cleared regardless).
 */
export async function POST(request: Request) {
  const rejected = crossOriginRejection(request);
  if (rejected) return rejected;

  const token = getSessionToken(request);
  if (token) await revokeSession(token);
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
