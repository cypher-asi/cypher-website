'use client';

import { type MouseEvent } from 'react';
import type { MarketNft } from '@/lib/opensea';
import { useAuthStore } from '@/features/auth/store';
import { useTradeStore } from '@/features/marketplace/tradeStore';
import { itemKey } from '../../lib/items';

type Props = {
  nft: MarketNft;
  /** Opens the item modal — the trade flow renders there. */
  onOpen: (id: string) => void;
  className: string;
};

/**
 * Buy / Cancel / Connect on a grid card or row. Not signed in → opens the login
 * modal; otherwise primes the trade (Cancel if it's your listing, else Buy) and
 * opens the item modal straight to the confirm step. Renders nothing for an
 * unlisted item (no listing to act on).
 */
export function CardActionButton({ nft, onOpen, className }: Props) {
  const user = useAuthStore((s) => s.user);
  const openLogin = useAuthStore((s) => s.openLogin);
  const start = useTradeStore((s) => s.start);

  if (!nft.listingId) return null;

  const isOwn =
    !!user?.zeroWalletAddress &&
    !!nft.sellerAddress &&
    user.zeroWalletAddress.toLowerCase() === nft.sellerAddress.toLowerCase();
  // Always Buy/Cancel — never "Connect". If not signed in, the click opens login
  // (they press Buy again once connected).
  const label = isOwn ? 'Cancel' : 'Buy';

  const onClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      openLogin();
      return;
    }
    start(isOwn ? 'cancel' : 'buy', nft);
    onOpen(itemKey(nft));
  };

  return (
    <button type="button" className={className} onClick={onClick}>
      {label}
    </button>
  );
}
