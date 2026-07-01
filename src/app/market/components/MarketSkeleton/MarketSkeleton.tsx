import type { GridSize, ViewMode } from '../../types';
import styles from '../../market.module.css';

type Props = {
  viewMode: ViewMode;
  gridSize: GridSize;
  count?: number;
};

export function MarketSkeleton({ viewMode, gridSize, count = 12 }: Props) {
  if (viewMode === 'list') {
    return (
      <div className={styles.listView}>
        <div className={styles.listHeader}>
          <span>Item</span>
          <span className={styles.colToken}>Token</span>
          <span className={styles.colTraits}>Traits</span>
          <span className={styles.colPrice}>Buy Now</span>
          <span className={styles.colAction} />
        </div>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={styles.rowSkeleton} aria-hidden>
            <div className={styles.rowSkeletonThumb} />
            <div className={styles.rowSkeletonBar} />
          </div>
        ))}
      </div>
    );
  }

  const gridClass = `${styles.grid} ${
    gridSize === 'lg' ? styles.gridLg : gridSize === 'sm' ? styles.gridSm : ''
  }`;
  return (
    <div className={gridClass}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.skeleton} aria-hidden />
      ))}
    </div>
  );
}
