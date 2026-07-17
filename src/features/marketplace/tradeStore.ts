'use client';

import { create } from 'zustand';
import type { MarketNft } from '@/lib/opensea';
import { buyListing, cancelListing } from './client';

export type TradeAction = 'buy' | 'cancel';
type Phase = 'idle' | 'confirm' | 'pending' | 'success' | 'error';

interface TradeState {
  phase: Phase;
  action: TradeAction | null;
  /** The listing being acted on — set for the whole flow. */
  nft: MarketNft | null;
  txHash: string | null;
  error: string | null;

  /** Enter the confirm step for an action on a listing (from a card or the modal). */
  start: (action: TradeAction, nft: MarketNft) => void;
  /** Confirm → return to the item detail. */
  back: () => void;
  /** Clear the flow entirely (on modal close). */
  reset: () => void;
  /**
   * Run the confirmed trade. Resolves to the settled listing on success (for the
   * caller to remove from the grid), or null on failure — the phase carries the
   * outcome either way.
   */
  execute: () => Promise<MarketNft | null>;
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

  start: (action, nft) => set({ phase: 'confirm', action, nft, txHash: null, error: null }),
  back: () => set({ phase: 'idle', error: null }),
  reset: () => set({ phase: 'idle', action: null, nft: null, txHash: null, error: null }),

  execute: async () => {
    const { action, nft, phase } = get();
    // Idempotency: ignore a second confirm while a trade is already in flight.
    if (phase === 'pending') return null;
    if (!action || !nft?.listingId) return null;
    set({ phase: 'pending', error: null });
    try {
      const txHash =
        action === 'buy'
          ? await buyListing(nft.listingId)
          : await cancelListing(nft.listingId);
      set({ phase: 'success', txHash });
      return nft;
    } catch (error) {
      set({ phase: 'error', error: message(error) });
      return null;
    }
  },
}));
