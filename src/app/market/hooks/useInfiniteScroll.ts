import { useEffect, type RefObject } from 'react';

type Options = {
  hasNextPage: boolean;
  isFetching: boolean;
  onLoadMore: () => void;
};

/**
 * Calls `onLoadMore` when the observed sentinel scrolls into view. The 600px
 * root margin prefetches the next page before the user reaches the bottom.
 */
export function useInfiniteScroll(
  sentinelRef: RefObject<HTMLElement | null>,
  { hasNextPage, isFetching, onLoadMore }: Options
): void {
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetching) onLoadMore();
      },
      { rootMargin: '600px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [sentinelRef, hasNextPage, isFetching, onLoadMore]);
}
