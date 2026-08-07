import { NextResponse } from 'next/server';
import { register } from '@/features/auth/zos';
import { setSessionCookie } from '@/features/auth/session';
import { authErrorResponse, crossOriginRejection, readJson } from '@/features/auth/http';

/**
 * POST /api/auth/register — create a new ZERO account from email + password and
 * start a session. Body: { email, password, name? }. zos-api creates + authorizes
 * the account in one call (returning a token); we finalize best-effort, set the
 * token in an httpOnly cookie, and return only the user.
 */
export async function POST(request: Request) {
  const rejected = crossOriginRejection(request);
  if (rejected) return rejected;

  const { email, password, name } = await readJson(request);
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  try {
    const { token, user } = await register(email, password, typeof name === 'string' ? name : undefined);
    const response = NextResponse.json({ user });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}
