import { NextResponse } from 'next/server';
import { requestOrigin } from '@/features/marketplace/hosted-link';
import { isPreviewToken, setPreviewCookie, clearPreviewCookie } from '@/features/vehicles/preview';

/**
 * Preview entry point for the vehicles funnel.
 *
 * `GET /api/vehicles/preview?token=<secret>` grants this browser private access
 * to the store while it stays gated for everyone else, then lands the visitor on
 * the store itself. `?clear=1` gives the access back.
 *
 * Every outcome redirects to /vehicles and nothing is echoed back, so a bad or
 * missing token is indistinguishable from the funnel simply being closed — there
 * is no oracle telling a prober that a preview exists or that a guess was close.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const store = `${requestOrigin(request)}/vehicles`;

  if (searchParams.get('clear')) {
    const response = NextResponse.redirect(store);
    clearPreviewCookie(response);
    return response;
  }

  const response = NextResponse.redirect(store);
  const token = searchParams.get('token');
  if (token && isPreviewToken(token)) {
    setPreviewCookie(response, token);
  }
  return response;
}
