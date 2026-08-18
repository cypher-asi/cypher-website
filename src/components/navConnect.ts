/**
 * The top-nav Connect button is only shown on the Market and Store experiences
 * for now. Returns which one the current path belongs to, or null to hide the
 * button. 'store' disconnects the user back to the store home; 'market' leaves
 * them in place.
 */
export function navConnectContext(
  pathname: string | null,
): 'store' | 'market' | null {
  if (!pathname) return null;
  if (pathname === '/vehicles' || pathname.startsWith('/vehicles/')) return 'store';
  if (pathname === '/market' || pathname.startsWith('/market/')) return 'market';
  return null;
}
