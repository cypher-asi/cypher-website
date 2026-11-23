/**
 * Launch flags for the clothing store v1.
 *
 * The secondary product-page panels (market activity chart and order book,
 * star ratings, ratings and reviews, and the trading summary card) render
 * sample data and are not wired to a live backend yet, so they stay hidden
 * until each one is connected to real data. The flag is read at the page call
 * sites, not inside the components, so the components and their unit tests are
 * untouched. Flip to true to bring the whole secondary layer back at once.
 */
export const STORE_SECONDARY_PANELS_ENABLED = false;
