'use client';

import { ThirdwebProvider } from 'thirdweb/react';
import type { ReactNode } from 'react';

/**
 * Client-side thirdweb context for the marketplace. Scoped to the market route
 * (mounted in market/page.tsx) so the wallet-connect state and its bundle stay
 * out of the other brand sites, which have no wallet UI.
 *
 * `ThirdwebProvider` takes no config — the browser thirdweb client is passed to
 * the connect components/hooks directly. This exists purely to provide the
 * context those hooks require.
 */
export function MarketWeb3Provider({ children }: { children: ReactNode }) {
  return <ThirdwebProvider>{children}</ThirdwebProvider>;
}
