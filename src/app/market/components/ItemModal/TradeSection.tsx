'use client';

import { ArrowUpRight, Loader2 } from 'lucide-react';
import type { MarketNft } from '@/lib/opensea';
import { formatWild } from '@/lib/price';
import { zscanTxUrl } from '@/lib/explorer';
import { useAuthStore } from '@/features/auth/store';
import { useTradeStore } from '@/features/marketplace/tradeStore';
import styles from '../../ItemModal.module.css';

type Props = {
  nft: MarketNft;
  name: string;
  /** Closes the modal. On a successful trade, ItemModal removes the settled
   *  listing from the grid as it unmounts — so every dismissal path is covered. */
  onClose: () => void;
};

/**
 * Buy / Cancel flow for a Z-Chain listing, rendered inside the item modal:
 * action button → confirm → pending → success/error. Card actions enter the same
 * flow (the trade store is shared), opening the modal straight to confirm.
 */
export function TradeSection({ nft, name, onClose }: Props) {
  const user = useAuthStore((s) => s.user);
  const openLogin = useAuthStore((s) => s.openLogin);

  const phase = useTradeStore((s) => s.phase);
  const activeNft = useTradeStore((s) => s.nft);
  const action = useTradeStore((s) => s.action);
  const txHash = useTradeStore((s) => s.txHash);
  const error = useTradeStore((s) => s.error);
  const start = useTradeStore((s) => s.start);
  const back = useTradeStore((s) => s.back);
  const execute = useTradeStore((s) => s.execute);

  // Only a listing can be traded; an unlisted browse tile has no listingId.
  if (!nft.listingId) return null;

  const isOwn =
    !!user?.zeroWalletAddress &&
    !!nft.sellerAddress &&
    user.zeroWalletAddress.toLowerCase() === nft.sellerAddress.toLowerCase();
  const price = nft.priceWild ? formatWild(nft.priceWild.formatted) : null;
  const priceLabel = price ?? 'the listed price';
  const qty = nft.amount != null && nft.amount > 1 ? ` ×${nft.amount}` : '';

  // This section drives the flow only for the listing the trade store is on.
  const isActive = phase !== 'idle' && activeNft?.listingId === nft.listingId;

  const onConfirm = () => {
    void execute();
  };

  if (!isActive) {
    // Label is always Buy/Cancel; if not signed in, the click opens login first
    // (they can then press Buy again to confirm).
    const onAction = () => {
      if (!user) {
        openLogin();
        return;
      }
      start(isOwn ? 'cancel' : 'buy', nft);
    };
    return (
      <button className={styles.tradeAction} onClick={onAction}>
        {isOwn ? 'Cancel listing' : `Buy${qty}${price ? ` — ${price}` : ''}`}
      </button>
    );
  }

  if (phase === 'pending') {
    return (
      <div className={styles.tradePanel}>
        <Loader2 size={22} className={styles.tradeSpinner} />
        <p className={styles.tradeText}>
          {action === 'buy' ? 'Completing your purchase…' : 'Cancelling your listing…'} This can
          take a few seconds.
        </p>
      </div>
    );
  }

  if (phase === 'success') {
    return (
      <div className={styles.tradePanel}>
        <p className={styles.tradeHeading}>
          {action === 'buy' ? 'Purchase complete' : 'Listing cancelled'}
        </p>
        <p className={styles.tradeText}>
          {action === 'buy'
            ? `${name}${qty} is now in your wallet.`
            : `${name}${qty} has been returned to your wallet.`}
        </p>
        {txHash && (
          <a
            className={styles.tradeLink}
            href={zscanTxUrl(txHash)}
            target="_blank"
            rel="noopener noreferrer"
          >
            View transaction on zscan
            <ArrowUpRight size={13} />
          </a>
        )}
        <button className={styles.tradeAction} onClick={onClose}>
          Done
        </button>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className={styles.tradePanel}>
        <p className={styles.tradeHeading}>Something went wrong</p>
        <p className={styles.tradeText}>{error}</p>
        <div className={styles.tradeButtons}>
          <button className={styles.tradeAction} onClick={onConfirm}>
            Try again
          </button>
          <button className={styles.tradeSecondary} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  // confirm
  return (
    <div className={styles.tradePanel}>
      <p className={styles.tradeText}>
        {action === 'buy' ? (
          <>
            Buy <strong>{name}</strong>
            {qty} for <strong>{priceLabel}</strong>? You&apos;ll pay {priceLabel} from your ZERO
            wallet.
          </>
        ) : (
          <>
            Cancel your listing of <strong>{name}</strong>
            {qty}?
          </>
        )}
      </p>
      <div className={styles.tradeButtons}>
        <button className={styles.tradeAction} onClick={onConfirm}>
          {action === 'buy' ? 'Confirm purchase' : 'Cancel listing'}
        </button>
        <button className={styles.tradeSecondary} onClick={back}>
          Back
        </button>
      </div>
    </div>
  );
}
