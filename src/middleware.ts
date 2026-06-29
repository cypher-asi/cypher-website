import { NextResponse, type NextRequest } from 'next/server';
import { resolveCompanyKey } from './lib/companies/resolve';

/**
 * Resolves the company from the request host and attaches it as an
 * `x-company` request header. No path rewrite: every domain's homepage stays
 * at `/`, and server components read the header to render the right company.
 *
 * Dev override: `?company=zode` forces a company without changing DNS.
 */
export function middleware(req: NextRequest) {
  const override = req.nextUrl.searchParams.get('company');
  const company = override ?? resolveCompanyKey(req.headers.get('host'));

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-company', company);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Run on all paths except Next internals, the favicon/icon, public images,
  // and any file with an extension (static assets).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|.*\\..*).*)'],
};
