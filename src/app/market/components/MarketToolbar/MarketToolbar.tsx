import { Grid2x2, Grid3x3, LayoutGrid, List, SlidersHorizontal } from 'lucide-react';
import type { GridSize, ViewMode } from '../../types';
import styles from '../../market.module.css';

type Props = {
  gridSize: GridSize;
  viewMode: ViewMode;
  selectedCount: number;
  filtersOpen: boolean;
  onOpenFilters: () => void;
  onGridSize: (size: GridSize) => void;
  onShowList: () => void;
};

export function MarketToolbar({
  gridSize,
  viewMode,
  selectedCount,
  filtersOpen,
  onOpenFilters,
  onGridSize,
  onShowList,
}: Props) {
  const isGrid = (size: GridSize) => viewMode === 'grid' && gridSize === size;
  return (
    <div className={styles.toolbar}>
      <button
        type="button"
        className={styles.filterIconBtn}
        onClick={onOpenFilters}
        aria-label="Filters"
        aria-haspopup="dialog"
        aria-expanded={filtersOpen}
      >
        <SlidersHorizontal size={16} />
        {selectedCount > 0 && <span className={styles.filterBadge}>{selectedCount}</span>}
      </button>
      <div className={styles.sizeToggle} role="group" aria-label="View mode">
        <button
          type="button"
          className={`${styles.sizeBtn} ${isGrid('lg') ? styles.sizeBtnActive : ''}`}
          onClick={() => onGridSize('lg')}
          aria-label="Large grid"
          aria-pressed={isGrid('lg')}
        >
          <Grid2x2 size={16} />
        </button>
        <button
          type="button"
          className={`${styles.sizeBtn} ${isGrid('md') ? styles.sizeBtnActive : ''}`}
          onClick={() => onGridSize('md')}
          aria-label="Medium grid"
          aria-pressed={isGrid('md')}
        >
          <LayoutGrid size={16} />
        </button>
        <button
          type="button"
          className={`${styles.sizeBtn} ${isGrid('sm') ? styles.sizeBtnActive : ''}`}
          onClick={() => onGridSize('sm')}
          aria-label="Small grid"
          aria-pressed={isGrid('sm')}
        >
          <Grid3x3 size={16} />
        </button>
        <button
          type="button"
          className={`${styles.sizeBtn} ${viewMode === 'list' ? styles.sizeBtnActive : ''}`}
          onClick={onShowList}
          aria-label="List view"
          aria-pressed={viewMode === 'list'}
        >
          <List size={16} />
        </button>
      </div>
    </div>
  );
}
