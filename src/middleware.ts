import { NextResponse, type NextRequest } from 'next/server';
import { resolveCompanyKey, normalizeCompany } from './lib/companies/resolve';
import { DEFAULT_COMPANY } from './lib/companies/registry';

const COMPANY_COOKIE = 'company';

/**
 * Resolves the active company and attaches it as an `x-company` request header.
 * No path rewrite: every domain's homepage stays at `/`, and server components
 * read the header to render the right company.
 *
 * Brand resolution precedence:
 *   1. `?company=` override (dev convenience) — also persisted to a cookie.
 *   2. The request host, when it maps to a non-default brand (real domains and
 *      `brand.localhost` subdomains).
 *   3. A previously-set `company` cookie (keeps the dev override sticky across
 *      internal navigations so links never need to carry `?company=`).
 *   4. The default company.
 *
 * Persisting the override in a cookie is the structural fix for brand "leaks":
 * navigating between pages can no longer fall back to the default brand just
 * because an internal link forgot to forward the `?company=` param.
 */
export function middleware(req: NextRequest) {
  const override = normalizeCompany(req.nextUrl.searchParams.get('company'));
  const hostKey = resolveCompanyKey(req.headers.get('host'));
  const cookieKey = normalizeCompany(req.cookies.get(COMPANY_COOKIE)?.value);

  const company =
    override ?? (hostKey !== DEFAULT_COMPANY ? hostKey : cookieKey ?? DEFAULT_COMPANY);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-company', company);

  const res = NextResponse.next({ request: { headers: requestHeaders } });

  // Keep the dev override sticky; clear it when explicitly returning to default.
  if (override) {
    if (override === DEFAULT_COMPANY) {
      res.cookies.delete(COMPANY_COOKIE);
    } else {
      res.cookies.set(COMPANY_COOKIE, override, {
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
      });
    }
  }

  return res;
}

export const config = {
  // Run on all paths except Next internals, the favicon/icon, public images,
  // and any file with an extension (static assets).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|.*\\..*).*)'],
};
