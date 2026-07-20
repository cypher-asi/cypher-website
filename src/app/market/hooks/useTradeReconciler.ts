'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient, type QueryClient, type InfiniteData } from '@tanstack/react-query';
import type { MarketNft } from '@/lib/opensea';
import { useTradeStore } from '@/features/marketplace/tradeStore';
import {
  useProcessingStore,
  type ProcessingMarker,
} from '@/features/marketplace/processingStore';
import type { NftsPage } from '../api/fetchers';

/** How long to spin before flipping a card to the fail-loud "refresh" hint.
 *  Generous vs the real ~1-2s indexer freshness, but short enough that a genuinely
 *  stuck trade doesn't spin indefinitely. */
const PROCESSING_TIMEOUT_MS = 20_000;

function sameToken(item: MarketNft, marker: ProcessingMarker): boolean {
  return (
    item.contract.toLowerCase() === marker.contract.toLowerCase() &&
    item.identifier === marker.tokenId
  );
}

/** Items from this collection's grid queries that have refetched since `since`,
 *  plus whether any such refetch has landed at all (so an empty result reads as
 *  "refetched and empty", not "not yet refetched"). */
function collectFreshItems(
  queryClient: QueryClient,
  collectionSlug: string,
  since: number
): { refetched: boolean; items: MarketNft[] } {
  const queries = queryClient
    .getQueryCache()
    .findAll({ queryKey: ['market', 'nfts', collectionSlug] });
  let refetched = false;
  const items: MarketNft[] = [];
  for (const query of queries) {
    if (query.state.dataUpdatedAt <= since) continue;
    refetched = true;
    const data = query.state.data as InfiniteData<NftsPage> | undefined;
    if (!data?.pages) continue;
    for (const page of data.pages) {
      if (Array.isArray(page.items)) items.push(...page.items);
    }
  }
  return { refetched, items };
}

/** Whether the freshly-indexed state now reflects the trade. */
function isSatisfied(marker: ProcessingMarker, items: MarketNft[]): boolean {
  if (marker.action === 'list') {
    // The listed item is escrowed, so it leaves the held/unlisted set; or, where
    // the Listed/Yours grid is loaded, a listing for the token now exists.
    const heldGone = !items.some((i) => sameToken(i, marker) && i.listingId == null);
    const listingAppeared = items.some((i) => sameToken(i, marker) && i.listingId != null);
    return heldGone || listingAppeared;
  }
  // buy / cancel: the specific listing is no longer active.
  return !items.some((i) => i.listingId === marker.listingId);
}

/**
 * Reconciles the market UI with the chain after a settled trade.
 *
 * The marketplace is escrow-based, so every tab (Listed, Unlisted, Yours) and the
 * stats panel derive from authoritative, disjoint indexer reads. Rather than
 * hand-mirroring where an item should move after a buy/list/cancel, we:
 *   1. invalidate those reads once per settled transaction (deduped by txHash),
 *      so they refetch the real indexed state (~1-2s behind chain head), and
 *   2. drop a per-item "processing" marker so the acted card shows a spinner over
 *      that gap, cleared the moment the refetched state reflects the trade — or,
 *      failing that, flipped to a fail-loud "refresh" hint at a timeout.
 *
 * Mounted once at the market level (not in the modal), so it observes the success
 * transition regardless of how the modal is dismissed — Done, X, Escape, backdrop,
 * or arrow-navigating to another item mid-flow.
 */
export function useTradeReconciler(): void {
  const queryClient = useQueryClient();
  // Dedupe by txHash so re-renders / repeated store notifications invalidate a
  // given trade exactly once.
  const handledRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();

    const clearMarker = (id: string) => {
      const timer = timers.get(id);
      if (timer) {
        clearTimeout(timer);
        timers.delete(id);
      }
      useProcessingStore.getState().clear(id);
    };

    // Clear any marker whose collection has refetched to the settled state.
    const trySatisfy = () => {
      const { markers } = useProcessingStore.getState();
      for (const marker of Object.values(markers)) {
        const { refetched, items } = collectFreshItems(
          queryClient,
          marker.collectionSlug,
          marker.createdAt
        );
        if (!refetched) continue;
        if (isSatisfied(marker, items)) clearMarker(marker.markerId);
      }
    };

    const reconcileTrade = (state: ReturnType<typeof useTradeStore.getState>) => {
      if (state.phase !== 'success') return;
      const { txHash, nft, action } = state;
      if (!txHash || !nft || !action) return;
      if (handledRef.current.has(txHash)) return;
      handledRef.current.add(txHash);

      // Prefix match: invalidates every availability / filter / owner permutation
      // for this collection, so Listed, Unlisted and Yours all refetch.
      void queryClient.invalidateQueries({
        queryKey: ['market', 'nfts', nft.collectionSlug],
      });
      // Floor / listed count / volume.
      void queryClient.invalidateQueries({ queryKey: ['market', 'collections'] });

      const now = Date.now();
      const id = useProcessingStore.getState().mark({
        contract: nft.contract,
        tokenId: nft.identifier,
        // A list acts on the held card (no listingId); buy/cancel act on a listing.
        listingId: action === 'list' ? undefined : nft.listingId ?? undefined,
        collectionSlug: nft.collectionSlug,
        action,
        txHash,
        createdAt: now,
        expiresAt: now + PROCESSING_TIMEOUT_MS,
      });
      timers.set(
        id,
        setTimeout(() => {
          timers.delete(id);
          useProcessingStore.getState().markTimedOut(id);
        }, PROCESSING_TIMEOUT_MS)
      );
    };

    // Catch a trade that settled before this subscribed (e.g. a remount).
    reconcileTrade(useTradeStore.getState());
    const unsubTrade = useTradeStore.subscribe(reconcileTrade);
    // Clear markers as the invalidated grids refetch.
    const unsubCache = queryClient.getQueryCache().subscribe(trySatisfy);

    return () => {
      unsubTrade();
      unsubCache();
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, [queryClient]);
}
