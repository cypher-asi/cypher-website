import type { RefObject } from 'react';
import styles from '../../market.module.css';

type Props = {
  sentinelRef: RefObject<HTMLDivElement | null>;
  loadingMore: boolean;
  onLoadMore: () => void;
};

export function LoadMoreSentinel({ sentinelRef, loadingMore, onLoadMore }: Props) {
  return (
    <div ref={sentinelRef} className={styles.loadMoreRow}>
      <button
        type="button"
        className={styles.loadMore}
        onClick={onLoadMore}
        disabled={loadingMore}
      >
        {loadingMore ? 'Loading…' : 'Load more'}
      </button>
    </div>
  );
}
