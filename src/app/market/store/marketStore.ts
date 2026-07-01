import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Availability, GridSize, SelectedTraits, ViewMode } from '../types';

type MarketUiState = {
  activeSlug: string;
  availability: Availability;
  selectedTraits: SelectedTraits;
  openTraitGroups: Record<string, boolean>;
  gridSize: GridSize;
  viewMode: ViewMode;
  modalId: string | null;
  filtersOpen: boolean;
  collectionMenuOpen: boolean;
  openNavGroup: string | null;
};

type MarketUiActions = {
  setActiveSlug: (slug: string) => void;
  selectCollection: (slug: string) => void;
  setAvailability: (value: Availability) => void;
  toggleTrait: (type: string, value: string) => void;
  clearTraits: () => void;
  toggleTraitGroup: (type: string) => void;
  setGridSize: (size: GridSize) => void;
  setViewMode: (mode: ViewMode) => void;
  setModalId: (id: string | null) => void;
  setFiltersOpen: (open: boolean) => void;
  setCollectionMenuOpen: (open: boolean) => void;
  setOpenNavGroup: (id: string | null) => void;
};

export type MarketStore = MarketUiState & MarketUiActions;

const initialState: MarketUiState = {
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
};

export const useMarketStore = create<MarketStore>()(
  persist(
    (set) => ({
      ...initialState,

      setActiveSlug: (slug) => set({ activeSlug: slug }),

      // Switching collection also clears trait selection and open groups, which
      // belong to the collection being left.
      selectCollection: (slug) =>
        set((state) =>
          slug === state.activeSlug
            ? { collectionMenuOpen: false, openNavGroup: null }
            : {
                activeSlug: slug,
                selectedTraits: {},
                openTraitGroups: {},
                collectionMenuOpen: false,
                openNavGroup: null,
              }
        ),

      setAvailability: (value) => set({ availability: value }),

      toggleTrait: (type, value) =>
        set((state) => {
          const current = state.selectedTraits[type] ?? [];
          const nextValues = current.includes(value)
            ? current.filter((v) => v !== value)
            : [...current, value];
          return { selectedTraits: { ...state.selectedTraits, [type]: nextValues } };
        }),

      clearTraits: () => set({ selectedTraits: {} }),

      toggleTraitGroup: (type) =>
        set((state) => ({
          openTraitGroups: {
            ...state.openTraitGroups,
            [type]: !state.openTraitGroups[type],
          },
        })),

      // Choosing a grid density implies grid (not list) view.
      setGridSize: (size) => set({ gridSize: size, viewMode: 'grid' }),

      setViewMode: (mode) => set({ viewMode: mode }),

      setModalId: (id) => set({ modalId: id }),

      setFiltersOpen: (open) => set({ filtersOpen: open }),

      setCollectionMenuOpen: (open) => set({ collectionMenuOpen: open }),

      setOpenNavGroup: (id) => set({ openNavGroup: id }),
    }),
    {
      name: 'market-ui',
      storage: createJSONStorage(() => localStorage),
      // Only durable view preferences are persisted; transient UI (open menus,
      // modal, trait selection) always starts fresh.
      partialize: (state) => ({
        gridSize: state.gridSize,
        viewMode: state.viewMode,
        availability: state.availability,
      }),
      // Rehydrate manually after mount so SSR/first client render use defaults
      // and stay hydration-consistent.
      skipHydration: true,
    }
  )
);
