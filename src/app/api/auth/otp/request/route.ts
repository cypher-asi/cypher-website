import { NextResponse } from 'next/server';
import { requestOtp } from '@/features/auth/zos';
import { authErrorResponse, crossOriginRejection, readJson } from '@/features/auth/http';

/** POST /api/auth/otp/request — email a one-time login code. Body: { email }. */
export async function POST(request: Request) {
  const rejected = crossOriginRejection(request);
  if (rejected) return rejected;

  const { email } = await readJson(request);
  if (typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
  }
  try {
    await requestOtp(email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
