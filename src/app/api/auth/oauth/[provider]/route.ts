import { NextResponse } from 'next/server';
import { zosApiUrl } from '@/features/auth/zos';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/oauth/:provider — start a social-login OAuth flow.
 *
 * Redirects to zos-api's provider login, passing our own /oauth/callback as the
 * returnUrl. Keeps ZOS_API_URL server-side (the browser only ever hits this
 * internal route). zos-api brokers the whole provider handshake and redirects
 * back to /oauth/callback with a sessionEstablishmentToken.
 */
const ALLOWED_PROVIDERS = new Set(['epic-games']);

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!ALLOWED_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: 'Unsupported provider' }, { status: 404 });
  }

  // Build the app-origin callback from the request host (behind Render the
  // forwarded proto is authoritative; default to https, http only for localhost).
  const host = request.headers.get('host');
  if (!host) return NextResponse.json({ error: 'Missing host' }, { status: 400 });
  const proto = request.headers.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
  const returnUrl = `${proto}://${host}/oauth/callback`;

  let base: string;
  try {
    base = zosApiUrl();
  } catch {
    return NextResponse.json({ error: 'Auth service not configured' }, { status: 500 });
  }

  const target = `${base}/api/oauth/${provider}/login?returnUrl=${encodeURIComponent(returnUrl)}`;
  return NextResponse.redirect(target);
}
