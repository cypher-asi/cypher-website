import { bootstrapAndRedirect } from '@/features/marketplace/hosted-link-bootstrap';

export const dynamic = 'force-dynamic';

/**
 * GET /api/link-wallet/manage/start — entry point for the hosted wallet-manage
 * flow (viewing and removing linked wallets). Same hand-off as the link entry:
 * the host injects the `zero_link_handoff` cookie, then loads this URL. We
 * promote the token into the session cookie and forward to the manage page. No
 * hand-off bounces to the callback with an error.
 */
export async function GET(request: Request) {
  return bootstrapAndRedirect(request, '/link-wallet/manage');
}
