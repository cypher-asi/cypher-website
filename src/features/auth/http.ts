import { NextResponse } from 'next/server';
import { AuthError } from './zos';

/** Map an AuthError (or anything unexpected) to a JSON error response. */
export function authErrorResponse(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }
  return NextResponse.json({ error: 'Unexpected authentication error' }, { status: 500 });
}

/**
 * CSRF guard for state-changing auth POSTs. A browser always sends `Origin` on a
 * cross-origin POST (including auto-submitted forms), so a mismatched Origin is a
 * forged request → reject. An absent Origin is a non-browser caller, which cannot
 * be CSRF'd, so it's allowed (keeps programmatic/testing callers working).
 * Returns a 403 response to short-circuit, or null when the request may proceed.
 */
export function crossOriginRejection(request: Request): NextResponse | null {
  const origin = request.headers.get('origin');
  if (!origin) return null;
  const host = request.headers.get('host');
  let originHost: string | null = null;
  try {
    originHost = new URL(origin).host;
  } catch {
    /* malformed Origin — reject below */
  }
  if (!originHost || originHost !== host) {
    return NextResponse.json({ error: 'Cross-origin request rejected' }, { status: 403 });
  }
  return null;
}

/** Parse a request body as an object, tolerating empty/invalid JSON. */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
