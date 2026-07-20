'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTradeStore } from '@/features/marketplace/tradeStore';

/**
 * Reconciles the market UI with the chain after a settled trade.
 *
 * The marketplace is escrow-based, so every tab (Listed, Unlisted, Yours) and the
 * stats panel derive from authoritative, disjoint indexer reads. Rather than
 * hand-mirroring where an item should move after a buy/list/cancel, we simply
 * invalidate those reads once per settled transaction and let them refetch the
 * real indexed state (which is ~1-2s behind chain head). This is the single place
 * that responds to a trade settling.
 *
 * Mounted once at the market level (not in the modal), so it observes the
 * success transition regardless of how the modal is dismissed — Done, X, Escape,
 * backdrop, or arrow-navigating to another item mid-flow.
 */
export function useTradeReconciler(): void {
  const queryClient = useQueryClient();
  // Dedupe by txHash so re-renders / multiple store notifications invalidate a
  // given trade exactly once.
  const handledRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const reconcile = (state: ReturnType<typeof useTradeStore.getState>) => {
      if (state.phase !== 'success') return;
      const { txHash, nft } = state;
      if (!txHash || !nft) return;
      if (handledRef.current.has(txHash)) return;
      handledRef.current.add(txHash);

      // Prefix match: invalidates every availability / filter / owner permutation
      // for this collection, so Listed, Unlisted and Yours all refetch.
      void queryClient.invalidateQueries({
        queryKey: ['market', 'nfts', nft.collectionSlug],
      });
      // Floor / listed count / volume.
      void queryClient.invalidateQueries({ queryKey: ['market', 'collections'] });
    };

    // Catch a trade that settled before this subscribed (e.g. a remount).
    reconcile(useTradeStore.getState());
    return useTradeStore.subscribe(reconcile);
  }, [queryClient]);
}
