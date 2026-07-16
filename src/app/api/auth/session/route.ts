import { NextResponse } from 'next/server';
import { currentUser } from '@/features/auth/zos';
import { getSessionToken, clearSessionCookie } from '@/features/auth/session';
import { authErrorResponse } from '@/features/auth/http';

/**
 * GET /api/auth/session — the current user for the session cookie, or null. Used
 * to restore auth on page load. A cookie whose token no longer validates is
 * cleared so the client falls back to logged-out cleanly.
 */
export async function GET(request: Request) {
  const token = getSessionToken(request);
  if (!token) return NextResponse.json({ user: null });
  try {
    const user = await currentUser(token);
    if (!user) {
      const response = NextResponse.json({ user: null });
      clearSessionCookie(response);
      return response;
    }
    return NextResponse.json({ user });
  } catch (error) {
    return authErrorResponse(error);
  }
}
