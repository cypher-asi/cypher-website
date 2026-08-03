import { bootstrapAndRedirect } from '@/features/marketplace/hosted-link-bootstrap';

export const dynamic = 'force-dynamic';

/**
 * GET /api/link-wallet/start — entry point for the hosted wallet-link flow. The
 * host injects the `zero_link_handoff` cookie carrying a ZERO token, then loads
 * this URL. We promote the token into the session cookie and forward to the
 * link page. No hand-off bounces to the callback with an error.
 */
export async function GET(request: Request) {
  return bootstrapAndRedirect(request, '/link-wallet');
}
