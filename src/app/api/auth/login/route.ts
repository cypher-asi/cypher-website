import { NextResponse } from 'next/server';
import { emailLogin, currentUser } from '@/features/auth/zos';
import { setSessionCookie } from '@/features/auth/session';
import { authErrorResponse, crossOriginRejection, readJson } from '@/features/auth/http';

/**
 * POST /api/auth/login — exchange an email + password for a session.
 * Body: { email, password }. On success the token is set in an httpOnly cookie
 * and only the user is returned to the client.
 */
export async function POST(request: Request) {
  const rejected = crossOriginRejection(request);
  if (rejected) return rejected;

  const { email, password } = await readJson(request);
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }
  try {
    const token = await emailLogin(email, password);
    const user = await currentUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Could not resolve the signed-in user' }, { status: 401 });
    }
    const response = NextResponse.json({ user });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}
