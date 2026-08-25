/**
 * GET /api/auth/epic-link/start — begin linking an Epic account to the
 * signed-in ZERO account.
 *
 * This is opened directly as the popup's URL rather than called from script,
 * which matters twice over. A popup must be opened synchronously inside the
 * click that asked for it or the browser blocks it, and minting the link token
 * takes a round trip — so doing it here keeps the open synchronous. It also
 * means the link token never reaches browser JavaScript: it is minted, spent on
 * the redirect, and gone.
 *
 * `returnUrl` is deliberately NOT read from the query. zos-api sends the buyer
 * back to wherever it is told, so accepting one from the caller would be an open
 * redirect out of a flow the buyer is trusting. We build it from our own host.
 *
 * `confirm=1` re-runs a link the buyer has been warned about — when the Epic
 * account is attached to another ZERO account that would be left with no way to
 * sign in. zos-api rejects the first attempt and reports back; this is how the
 * buyer proceeds anyway.
 */
import { NextResponse } from 'next/server';
import { getSessionToken } from '@/features/auth/session';
import { generateLinkToken, zosApiUrl, AuthError } from '@/features/auth/zos';
import { LINK_RETURN_PATH } from '@/features/auth/epicPopup';

export const dynamic = 'force-dynamic';

const CONNECTOR = 'epic-games';

export async function GET(request: Request): Promise<NextResponse> {
  // Built from the Host header, not request.url — in a route handler request.url
  // reports the server bind host, which would drop the brand subdomain the
  // browser is actually on.
  const host = request.headers.get('host') ?? new URL(request.url).host;
  const proto =
    request.headers.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
  const origin = `${proto}://${host}`;

  // Failures land on the same page a completed handshake does, so the popup
  // always reports something back and closes rather than stranding the buyer on
  // a dead window.
  const failed = (reason: string) =>
    NextResponse.redirect(`${origin}${LINK_RETURN_PATH}?error=${encodeURIComponent(reason)}`);

  const token = getSessionToken(request);
  if (!token) return failed('not_signed_in');

  try {
    const linkToken = await generateLinkToken(token);
    const returnUrl = `${origin}${LINK_RETURN_PATH}`;
    const confirm = new URL(request.url).searchParams.get('confirm') === '1';

    const target = new URL(`${zosApiUrl()}/api/oauth/link/${CONNECTOR}/initiate`);
    target.searchParams.set('linkToken', linkToken);
    target.searchParams.set('returnUrl', returnUrl);
    if (confirm) target.searchParams.set('confirm', 'true');

    const res = NextResponse.redirect(target.toString());
    // This Location carries a single-use credential. A 307 is not cacheable
    // without explicit headers, but say so outright rather than rely on that.
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (err) {
    const signedOut = err instanceof AuthError && err.statusCode === 401;
    return failed(signedOut ? 'not_signed_in' : 'link_failed');
  }
}
