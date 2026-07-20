'use client';

import { create } from 'zustand';
import type { MarketNft } from '@/lib/opensea';
import type { TradeAction } from './tradeStore';

/**
 * A per-item "processing" marker, set the moment a trade settles and cleared once
 * the indexed state reflects it (or, failing that, on a timeout that flips the
 * card to a fail-loud "refresh" hint rather than an endless spinner).
 *
 * This is the thin per-item veneer mature marketplaces use: the grids stay
 * derived from the source of truth, and this only covers the ~1-2s gap while the
 * indexer catches up. Generic over the action, so any future on-chain op reuses it.
 */
export type ProcessingMarker = {
  markerId: string;
  contract: string;
  tokenId: string;
  /** Present for buy/cancel (acts on a listing); absent for list (acts on a held
   *  item). Distinguishes the listing card from the held card of the same token. */
  listingId?: string;
  collectionSlug: string;
  action: TradeAction;
  txHash: string;
  createdAt: number;
  expiresAt: number;
  /** Set when the indexed state hasn't caught up by expiresAt — the card shows a
   *  "taking longer, refresh" hint instead of spinning forever. */
  timedOut: boolean;
};

/** Present-tense verb shown on a card while its trade settles. */
export const PROCESSING_VERB: Record<TradeAction, string> = {
  list: 'Listing…',
  buy: 'Buying…',
  cancel: 'Cancelling…',
};

/** Stable key for a marker: a token can carry both a held card and a listing card,
 *  which must not share one marker. */
export function processingMarkerId(
  contract: string,
  tokenId: string,
  listingId?: string
): string {
  return `${contract.toLowerCase()}-${tokenId}-${listingId ?? 'held'}`;
}

type ProcessingState = {
  markers: Record<string, ProcessingMarker>;
  /** Register a marker (createdAt/expiresAt/action supplied by the caller). */
  mark: (marker: Omit<ProcessingMarker, 'markerId' | 'timedOut'>) => string;
  markTimedOut: (id: string) => void;
  clear: (id: string) => void;
};

export const useProcessingStore = create<ProcessingState>((set) => ({
  markers: {},
  mark: (marker) => {
    const markerId = processingMarkerId(marker.contract, marker.tokenId, marker.listingId);
    set((s) => ({
      markers: { ...s.markers, [markerId]: { ...marker, markerId, timedOut: false } },
    }));
    return markerId;
  },
  markTimedOut: (id) =>
    set((s) =>
      s.markers[id]
        ? { markers: { ...s.markers, [id]: { ...s.markers[id], timedOut: true } } }
        : s
    ),
  clear: (id) =>
    set((s) => {
      if (!s.markers[id]) return s;
      const next = { ...s.markers };
      delete next[id];
      return { markers: next };
    }),
}));

/**
 * The active marker for a card, or undefined. Matches on token; when the marker
 * targets a listing it also requires that listing, so a listing action doesn't
 * overlay the held card of the same token (and vice versa). Returns the stored
 * object reference unchanged, so it's safe as a zustand selector.
 */
export function selectMarkerFor(
  markers: Record<string, ProcessingMarker>,
  nft: MarketNft
): ProcessingMarker | undefined {
  for (const marker of Object.values(markers)) {
    if (marker.contract.toLowerCase() !== nft.contract.toLowerCase()) continue;
    if (marker.tokenId !== nft.identifier) continue;
    if (marker.listingId != null) {
      if (nft.listingId === marker.listingId) return marker;
    } else if (nft.listingId == null) {
      return marker;
    }
  }
  return undefined;
}

/** Card-level hook: the processing marker covering this item, if any. */
export function useProcessing(nft: MarketNft): ProcessingMarker | undefined {
  return useProcessingStore((s) => selectMarkerFor(s.markers, nft));
}
