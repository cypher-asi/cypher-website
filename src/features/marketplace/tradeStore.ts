'use client';

import { create } from 'zustand';
import type { MarketNft } from '@/lib/opensea';
import { buyListing, cancelListing, listItem } from './client';

export type TradeAction = 'buy' | 'cancel' | 'list';
type Phase = 'idle' | 'confirm' | 'pending' | 'success' | 'error';

/** Price (WILD wei) + amount collected in the list confirm step. */
export type ListParams = { priceWei: string; amount: string };

interface TradeState {
  phase: Phase;
  action: TradeAction | null;
  /** The item being acted on — set for the whole flow. Carries the collection
   *  slug + token identity the reconciler needs to invalidate the right grids. */
  nft: MarketNft | null;
  /** The settled transaction hash — the zscan link, and the reconciler's key for
   *  invalidating exactly once per trade. */
  txHash: string | null;
  error: string | null;

  /** Enter the confirm step for an action on a listing (from a card or the modal). */
  start: (action: TradeAction, nft: MarketNft) => void;
  /** Confirm → return to the item detail. */
  back: () => void;
  /** Clear the flow entirely (on modal close). */
  reset: () => void;
  /**
   * Run the confirmed trade. `list` requires the price/amount collected in the
   * confirm step; buy/cancel ignore it. On success the phase advances to
   * 'success' with the settled txHash, which the trade reconciler observes to
   * refetch the authoritative grids + stats; on failure the phase carries the
   * error. The grids are never mutated here.
   */
  execute: (listParams?: ListParams) => Promise<void>;
}

function message(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Something went wrong';
}

export const useTradeStore = create<TradeState>((set, get) => ({
  phase: 'idle',
  action: null,
  nft: null,
  txHash: null,
  error: null,

  start: (action, nft) =>
    set({ phase: 'confirm', action, nft, txHash: null, error: null }),
  back: () => set({ phase: 'idle', error: null }),
  reset: () =>
    set({ phase: 'idle', action: null, nft: null, txHash: null, error: null }),

  execute: async (listParams) => {
    const { action, nft, phase } = get();
    // Idempotency: ignore a second confirm while a trade is already in flight.
    if (phase === 'pending') return;
    if (!action || !nft) return;
    // list needs the confirm-step inputs; buy/cancel need an existing listingId.
    if (action === 'list' ? !listParams : !nft.listingId) return;
    set({ phase: 'pending', error: null });
    try {
      let txHash: string;
      if (action === 'list') {
        const res = await listItem({
          nftContract: nft.contract,
          tokenId: nft.identifier,
          amount: listParams!.amount,
          price: listParams!.priceWei,
        });
        txHash = res.transactionHash;
      } else if (action === 'buy') {
        txHash = await buyListing(nft.listingId!);
      } else {
        txHash = await cancelListing(nft.listingId!);
      }
      set({ phase: 'success', txHash });
    } catch (error) {
      set({ phase: 'error', error: message(error) });
    }
  },
}));
