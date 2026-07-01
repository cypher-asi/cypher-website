import { beforeEach, describe, expect, it } from 'vitest';
import { useMarketStore } from './marketStore';

const reset = () =>
  useMarketStore.setState({
    activeSlug: '',
    availability: 'listed',
    selectedTraits: {},
    openTraitGroups: {},
    gridSize: 'md',
    viewMode: 'grid',
    modalId: null,
    filtersOpen: false,
    collectionMenuOpen: false,
    openNavGroup: null,
  });

describe('marketStore', () => {
  beforeEach(reset);

  it('toggles trait values (OR within a type)', () => {
    const { toggleTrait } = useMarketStore.getState();
    toggleTrait('Color', 'Red');
    toggleTrait('Color', 'Blue');
    expect(useMarketStore.getState().selectedTraits).toEqual({ Color: ['Red', 'Blue'] });
    toggleTrait('Color', 'Red');
    expect(useMarketStore.getState().selectedTraits).toEqual({ Color: ['Blue'] });
  });

  it('clears trait selection', () => {
    useMarketStore.getState().toggleTrait('Color', 'Red');
    useMarketStore.getState().clearTraits();
    expect(useMarketStore.getState().selectedTraits).toEqual({});
  });

  it('resets traits and open groups when switching collections', () => {
    const store = useMarketStore.getState();
    store.setActiveSlug('a');
    store.toggleTrait('Color', 'Red');
    store.toggleTraitGroup('Color');
    store.selectCollection('b');
    const next = useMarketStore.getState();
    expect(next.activeSlug).toBe('b');
    expect(next.selectedTraits).toEqual({});
    expect(next.openTraitGroups).toEqual({});
  });

  it('keeps traits when selecting the current collection', () => {
    const store = useMarketStore.getState();
    store.setActiveSlug('a');
    store.toggleTrait('Color', 'Red');
    store.selectCollection('a');
    expect(useMarketStore.getState().selectedTraits).toEqual({ Color: ['Red'] });
  });

  it('forces grid view when a grid size is chosen', () => {
    useMarketStore.getState().setViewMode('list');
    useMarketStore.getState().setGridSize('lg');
    const state = useMarketStore.getState();
    expect(state.gridSize).toBe('lg');
    expect(state.viewMode).toBe('grid');
  });
});
