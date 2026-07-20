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

/** How often to re-invalidate (poll) the grids while a trade is settling. A single
 *  invalidate can't converge: the indexed state lands a beat after the tx settles,
 *  so the first refetch races ahead of it. We re-invalidate until the marker is
 *  satisfied or times out. Paired with the no-store live reads so each poll is fresh. */
const POLL_INTERVAL_MS = 2_000;

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
  const cache = queryClient.getQueryCache();
  // The item's own collection grid, plus the cross-collection holdings view (a
  // list from Holdings has to satisfy against the holdings query, not a per-slug
  // one). The holdings count query carries a number, not pages, so it's skipped.
  const queries = [
    ...cache.findAll({ queryKey: ['market', 'nfts', collectionSlug] }),
    ...cache.findAll({ queryKey: ['market', 'holdings'] }),
  ];
  let refetched = false;
  const items: MarketNft[] = [];
  for (const query of queries) {
    if (query.state.dataUpdatedAt <= since) continue;
    const data = query.state.data as InfiniteData<NftsPage> | undefined;
    if (!data?.pages) continue;
    refetched = true;
    for (const page of data.pages) {
      if (Array.isArray(page.items)) items.push(...page.items);
    }
  }
  return { refetched, items };
}

/** Whether the freshly-indexed state now reflects the trade.
 *  Note: `items` is scoped to the marker's own collection but not to a specific
 *  availability tab. That's safe today because only one grid is mounted at a time,
 *  so only that tab's query refetches (its `dataUpdatedAt` moves past `since`);
 *  inactive tabs are excluded by the freshness gate in collectFreshItems. If the
 *  UI ever mounts multiple grids of one collection at once, scope this per tab. */
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
 *   1. invalidate those reads on the settled transaction (deduped by txHash) and
 *      then poll them (re-invalidate every POLL_INTERVAL_MS) until the indexed
 *      state — which lands a beat behind chain head — reflects the trade, and
 *   2. drop a per-item "processing" marker so the acted card shows a spinner over
 *      that gap, cleared the moment the refetched state reflects the trade — or,
 *      failing that, flipped to a fail-loud "refresh" hint at PROCESSING_TIMEOUT_MS.
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
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    // Markers still waiting on the indexer (a timed-out marker stops driving polls).
    const activeMarkers = () =>
      Object.values(useProcessingStore.getState().markers).filter((m) => !m.timedOut);

    const invalidateCollection = (slug: string) => {
      void queryClient.invalidateQueries({ queryKey: ['market', 'nfts', slug] });
    };

    // Run a poll while any marker is still waiting; stop once all are satisfied or
    // timed out. Each tick re-invalidates the collections that still have a marker,
    // so their (no-store) reads refetch the freshly-indexed state.
    const managePoll = () => {
      const markers = activeMarkers();
      if (markers.length === 0) {
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
        return;
      }
      if (pollTimer) return;
      pollTimer = setInterval(() => {
        const slugs = new Set(activeMarkers().map((m) => m.collectionSlug));
        for (const slug of slugs) invalidateCollection(slug);
        if (slugs.size > 0) {
          void queryClient.invalidateQueries({ queryKey: ['market', 'collections'] });
          void queryClient.invalidateQueries({ queryKey: ['market', 'holdings'] });
        }
      }, POLL_INTERVAL_MS);
    };

    const clearMarker = (id: string) => {
      const timer = timers.get(id);
      if (timer) {
        clearTimeout(timer);
        timers.delete(id);
      }
      useProcessingStore.getState().clear(id);
      managePoll();
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
      invalidateCollection(nft.collectionSlug);
      // Floor / listed count / volume.
      void queryClient.invalidateQueries({ queryKey: ['market', 'collections'] });
      // The consolidated holdings view + its count (a listed item leaves holdings).
      void queryClient.invalidateQueries({ queryKey: ['market', 'holdings'] });
      // WILD balance moves on a buy (paid) or a sale of your listing (received);
      // it's a live chain read, so one refresh after settle is enough (no poll).
      void queryClient.invalidateQueries({ queryKey: ['market', 'wildBalance'] });

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
          // A timed-out marker no longer drives polling — stop if it was the last.
          managePoll();
        }, PROCESSING_TIMEOUT_MS)
      );
      // Start polling until the indexed state reflects this trade.
      managePoll();
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
      if (pollTimer) clearInterval(pollTimer);
      // Leaving the market abandons any in-flight spinner. Clear the markers so a
      // remount (a cold load that already shows the true state) doesn't strand a
      // marker whose timeout timer was just torn down.
      const { markers, clear } = useProcessingStore.getState();
      for (const id of Object.keys(markers)) clear(id);
    };
  }, [queryClient]);
}
