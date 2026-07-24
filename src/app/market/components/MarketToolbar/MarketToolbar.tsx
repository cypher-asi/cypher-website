import {
  BarChart3,
  Grid2x2,
  Grid3x3,
  LayoutGrid,
  List,
  SlidersHorizontal,
  User,
} from 'lucide-react';
import type { MarketDrawer } from '../../store/marketStore';
import type { GridSize, ViewMode } from '../../types';
import styles from '../../market.module.css';

type Props = {
  gridSize: GridSize;
  viewMode: ViewMode;
  selectedCount: number;
  /** Whether to offer the wallet (Profile) drawer — shown whenever signed in. */
  showWallet: boolean;
  activeDrawer: MarketDrawer | null;
  onOpenDrawer: (drawer: MarketDrawer) => void;
  onGridSize: (size: GridSize) => void;
  onShowList: () => void;
};

export function MarketToolbar({
  gridSize,
  viewMode,
  selectedCount,
  showWallet,
  activeDrawer,
  onOpenDrawer,
  onGridSize,
  onShowList,
}: Props) {
  const isGrid = (size: GridSize) => viewMode === 'grid' && gridSize === size;
  return (
    <div className={styles.toolbar}>
      {/* Mobile-only drawer triggers (the rail panels move here on small screens):
          Profile → Your Wallets, sliders → Filters, chart → collection stats. */}
      <div className={styles.toolbarActions}>
        {showWallet && (
          <button
            type="button"
            className={styles.toolbarIconBtn}
            onClick={() => onOpenDrawer('wallet')}
            aria-label="Your wallets"
            aria-haspopup="dialog"
            aria-expanded={activeDrawer === 'wallet'}
          >
            <User size={16} />
          </button>
        )}
        <button
          type="button"
          className={styles.toolbarIconBtn}
          onClick={() => onOpenDrawer('filters')}
          aria-label="Filters"
          aria-haspopup="dialog"
          aria-expanded={activeDrawer === 'filters'}
        >
          <SlidersHorizontal size={16} />
          {selectedCount > 0 && <span className={styles.filterBadge}>{selectedCount}</span>}
        </button>
        <button
          type="button"
          className={styles.toolbarIconBtn}
          onClick={() => onOpenDrawer('collection')}
          aria-label="Collection info"
          aria-haspopup="dialog"
          aria-expanded={activeDrawer === 'collection'}
        >
          <BarChart3 size={16} />
        </button>
      </div>
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
