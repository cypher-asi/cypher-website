'use client';

import { create } from 'zustand';
import type { MarketNft } from '@/lib/opensea';
import { buyListing, cancelListing, listItem } from './client';

export type TradeAction = 'buy' | 'cancel' | 'list';
type Phase = 'idle' | 'confirm' | 'pending' | 'success' | 'error';

/** Price (WILD wei) + amount collected in the list confirm step. */
export type ListParams = { priceWei: string; amount: string };

/** The settled list outcome, used to sync the grids optimistically. */
export type ListResult = { listingId: string | null; priceWei: string; amount: string };

interface TradeState {
  phase: Phase;
  action: TradeAction | null;
  /** The listing being acted on — set for the whole flow. */
  nft: MarketNft | null;
  txHash: string | null;
  error: string | null;
  /** Set on a successful list — drives the optimistic add to Listed. */
  listResult: ListResult | null;

  /** Enter the confirm step for an action on a listing (from a card or the modal). */
  start: (action: TradeAction, nft: MarketNft) => void;
  /** Confirm → return to the item detail. */
  back: () => void;
  /** Clear the flow entirely (on modal close). */
  reset: () => void;
  /**
   * Run the confirmed trade. `list` requires the price/amount collected in the
   * confirm step; buy/cancel ignore it. Resolves to the settled item on success
   * (for the caller to remove from the grid), or null on failure — the phase
   * carries the outcome either way.
   */
  execute: (listParams?: ListParams) => Promise<MarketNft | null>;
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
  listResult: null,

  start: (action, nft) =>
    set({ phase: 'confirm', action, nft, txHash: null, error: null, listResult: null }),
  back: () => set({ phase: 'idle', error: null }),
  reset: () =>
    set({ phase: 'idle', action: null, nft: null, txHash: null, error: null, listResult: null }),

  execute: async (listParams) => {
    const { action, nft, phase } = get();
    // Idempotency: ignore a second confirm while a trade is already in flight.
    if (phase === 'pending') return null;
    if (!action || !nft) return null;
    // list needs the confirm-step inputs; buy/cancel need an existing listingId.
    if (action === 'list' ? !listParams : !nft.listingId) return null;
    set({ phase: 'pending', error: null });
    try {
      let txHash: string;
      let listResult: ListResult | null = null;
      if (action === 'list') {
        const res = await listItem({
          nftContract: nft.contract,
          tokenId: nft.identifier,
          amount: listParams!.amount,
          price: listParams!.priceWei,
        });
        txHash = res.transactionHash;
        listResult = {
          listingId: res.listingId,
          priceWei: listParams!.priceWei,
          amount: listParams!.amount,
        };
      } else if (action === 'buy') {
        txHash = await buyListing(nft.listingId!);
      } else {
        txHash = await cancelListing(nft.listingId!);
      }
      set({ phase: 'success', txHash, listResult });
      return nft;
    } catch (error) {
      set({ phase: 'error', error: message(error) });
      return null;
    }
  },
}));
