'use client';

import { useState, type FormEvent } from 'react';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import type { MarketNft } from '@/lib/opensea';
import { formatWild, parseWildToWei } from '@/lib/price';
import { zscanTxUrl } from '@/lib/explorer';
import { MARKETPLACE_FEE_PERCENT, sellerProceedsWild } from '@/features/marketplace/fee';
import { useAuthStore } from '@/features/auth/store';
import { useTradeStore } from '@/features/marketplace/tradeStore';
import styles from '../../ItemModal.module.css';

type Props = {
  nft: MarketNft;
  name: string;
  /** Closes the modal. On a successful buy/cancel, ItemModal removes the settled
   *  listing from the grid as it unmounts. */
  onClose: () => void;
};

/** Same underlying item — matches a listing by listingId, an owned item by token. */
function sameItem(a: MarketNft | null, b: MarketNft): boolean {
  return (
    a != null &&
    a.contract === b.contract &&
    a.identifier === b.identifier &&
    a.listingId === b.listingId
  );
}

/**
 * Buy / Cancel / List flow for a Z-Chain item, rendered inside the item modal:
 * action → confirm → pending → success/error. List collects a price (+ quantity
 * for 1155) in the confirm step and spells out the fee and escrow in plain words.
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

  const [priceInput, setPriceInput] = useState('');
  const [qtyInput, setQtyInput] = useState('1');

  const listable = nft.owned === true;
  // Only a listing (Buy/Cancel) or an owned item (List) can be acted on.
  if (!nft.listingId && !listable) return null;

  const isOwn =
    !!user?.zeroWalletAddress &&
    !!nft.sellerAddress &&
    user.zeroWalletAddress.toLowerCase() === nft.sellerAddress.toLowerCase();
  const price = nft.priceWild ? formatWild(nft.priceWild.formatted) : null;
  const priceLabel = price ?? 'the listed price';
  const qty = nft.amount != null && nft.amount > 1 ? ` ×${nft.amount}` : '';

  const isActive = phase !== 'idle' && sameItem(activeNft, nft);

  const onConfirm = () => {
    void execute();
  };

  // ---- idle: the action button ----
  if (!isActive) {
    const onAction = () => {
      if (!user) {
        openLogin();
        return;
      }
      start(listable ? 'list' : isOwn ? 'cancel' : 'buy', nft);
    };
    const label = listable
      ? 'List'
      : isOwn
        ? 'Cancel listing'
        : `Buy${qty}${price ? ` — ${price}` : ''}`;
    return (
      <button className={styles.tradeAction} onClick={onAction}>
        {label}
      </button>
    );
  }

  // ---- pending ----
  if (phase === 'pending') {
    const verb =
      action === 'list'
        ? 'Listing your item'
        : action === 'buy'
          ? 'Completing your purchase'
          : 'Cancelling your listing';
    return (
      <div className={styles.tradePanel}>
        <Loader2 size={22} className={styles.tradeSpinner} />
        <p className={styles.tradeText}>{verb}… This can take a few seconds.</p>
      </div>
    );
  }

  // ---- success ----
  if (phase === 'success') {
    const heading =
      action === 'list' ? 'Item listed' : action === 'buy' ? 'Purchase complete' : 'Listing cancelled';
    const body =
      action === 'list'
        ? `${name} is now listed — you'll find it under the Listed tab.`
        : action === 'buy'
          ? `${name}${qty} is now in your wallet.`
          : `${name}${qty} has been returned to your wallet.`;
    return (
      <div className={styles.tradePanel}>
        <p className={styles.tradeHeading}>{heading}</p>
        <p className={styles.tradeText}>{body}</p>
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

  // ---- error ----
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

  // ---- confirm: List ----
  if (action === 'list') {
    const maxQty = nft.balance && nft.balance > 0 ? nft.balance : 1;
    const showQty = maxQty > 1;
    const priceWei = parseWildToWei(priceInput);
    const qtyNum = Math.floor(Number(qtyInput));
    const validQty = Number.isFinite(qtyNum) && qtyNum >= 1 && qtyNum <= maxQty;
    const canList = priceWei != null && validQty;
    const proceeds = priceWei != null ? sellerProceedsWild(Number(priceInput)) : null;

    const onList = (e: FormEvent) => {
      e.preventDefault();
      if (!priceWei || !validQty) return;
      void execute({ priceWei, amount: String(qtyNum) });
    };

    return (
      <form className={styles.tradePanel} onSubmit={onList}>
        <p className={styles.tradeHeading}>List {name} for sale</p>
        <div className={styles.tradeField}>
          <label className={styles.tradeLabel}>Price (WILD - Z Chain)</label>
          <input
            className={styles.tradeInput}
            inputMode="decimal"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            placeholder="0.00"
            autoFocus
          />
        </div>
        {showQty && (
          <div className={styles.tradeField}>
            <label className={styles.tradeLabel}>Quantity ({maxQty} available)</label>
            <input
              className={styles.tradeInput}
              inputMode="numeric"
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value)}
            />
          </div>
        )}
        {qtyNum > 1 && (
          <p className={styles.tradeText}>
            You&apos;re listing {qtyNum} together as one bundle — a buyer gets all {qtyNum} for your
            price, not each.
          </p>
        )}
        <p className={styles.tradeText}>
          {proceeds != null ? (
            <>
              You&apos;ll receive{' '}
              <strong>
                {proceeds.toLocaleString(undefined, { maximumFractionDigits: 4 })} WILD
              </strong>{' '}
              when it sells, after the {MARKETPLACE_FEE_PERCENT}% marketplace fee.
            </>
          ) : (
            <>A {MARKETPLACE_FEE_PERCENT}% marketplace fee applies when it sells.</>
          )}
        </p>
        <p className={styles.tradeText}>
          While it&apos;s listed, this item leaves your wallet and is held by the marketplace.
          You&apos;ll get it back if you cancel, and it goes to the buyer when it sells.
        </p>
        <div className={styles.tradeButtons}>
          <button className={styles.tradeAction} type="submit" disabled={!canList}>
            {priceWei != null ? `List for ${priceInput.trim()} WILD` : 'List'}
          </button>
          <button className={styles.tradeSecondary} type="button" onClick={back}>
            Back
          </button>
        </div>
      </form>
    );
  }

  // ---- confirm: Buy / Cancel ----
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
