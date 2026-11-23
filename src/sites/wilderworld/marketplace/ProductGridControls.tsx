'use client';

import { useSyncExternalStore } from 'react';
import { List } from 'lucide-react';
import styles from './ProductGridControls.module.css';

type Density = 'large' | 'standard' | 'compact';
const key = 'ww-product-grid-density';
const changeEvent = 'ww-product-grid-density-change';
let sessionDensity: Density = 'standard';

// Match the responsive column rules in ProductGridControls.module.css.
const viewportQueries = ['(max-width: 640px)', '(max-width: 1100px)'];
const columnsByViewport = {
  mobile: { large: 1, standard: 2, compact: 3 },
  tablet: { large: 2, standard: 3, compact: 4 },
  desktop: { large: 2, standard: 4, compact: 6 },
} as const;

function readViewport() {
  if (window.matchMedia?.(viewportQueries[0]).matches) return 'mobile';
  if (window.matchMedia?.(viewportQueries[1]).matches) return 'tablet';
  return 'desktop';
}

function subscribeViewport(callback: () => void) {
  const queries = viewportQueries.map(query => window.matchMedia?.(query));
  queries.forEach(query => query?.addEventListener('change', callback));
  return () => queries.forEach(query => query?.removeEventListener('change', callback));
}

function readDensity(): Density {
  try {
    const value = window.localStorage.getItem(key);
    return value === 'large' || value === 'compact' || value === 'standard' ? value : 'standard';
  } catch { return sessionDensity; }
}

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => { if (event.key === key || event.key === null) callback(); };
  window.addEventListener('storage', onStorage);
  window.addEventListener(changeEvent, callback);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(changeEvent, callback);
  };
}

export function useProductGridDensity() {
  return useSyncExternalStore(subscribe, readDensity, () => 'standard' as Density);
}

function selectDensity(value: Density) {
  sessionDensity = value;
  try { window.localStorage.setItem(key, value); } catch { /* Keep the control usable when storage is unavailable. */ }
  window.dispatchEvent(new Event(changeEvent));
}

type ViewProps = { view?: string; onViewChange?: (view: 'grid' | 'list') => void };

export function ProductListControl({ view = 'grid', onViewChange }: ViewProps) {
  return <button className={styles.listControl} type="button" title="List view" aria-label="List view" aria-pressed={view === 'list'} onClick={() => onViewChange?.('list')}><List size={20} aria-hidden="true" /></button>;
}

export function ProductGridControls({ view = 'grid', onViewChange, showList = true }: ViewProps & { showList?: boolean }) {
  const density = useProductGridDensity();
  const viewport = useSyncExternalStore(subscribeViewport, readViewport, () => 'desktop' as const);
  return <div className={styles.controls} role="group" aria-label="Product layout">
    {(['large', 'standard', 'compact'] as const).map(value => {
      const columns = columnsByViewport[viewport][value];
      const label = `${columns} ${columns === 1 ? 'column' : 'columns'}`;
      return <button
      key={value} type="button" title={label}
      aria-label={label}
      data-columns={columns}
      aria-pressed={view === 'grid' && density === value}
      onClick={() => { selectDensity(value); onViewChange?.('grid'); }}
    ><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      {Array.from({ length: columns }, (_, column) => <rect key={column} x={2 + column * (21 / columns)} y="4" width={21 / columns - 2} height="16" rx=".5" />)}
    </svg></button>;})}
    {onViewChange && showList && <ProductListControl view={view} onViewChange={onViewChange}/>}
  </div>;
}
