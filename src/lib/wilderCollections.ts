/* ---------------------------------------------------------------------------
   Wilder World OpenSea collections, grouped by industry.

   The Market page browses live NFTs via the OpenSea API v2. Each entry maps an
   in-world industry to its OpenSea collection `slug`. Slugs verified from
   opensea.io/WilderWorld. Contract addresses are resolved at runtime from the
   OpenSea collection endpoint so we never ship stale/incorrect addresses.

   To add an industry, append an entry here — the sidebar, API routes, and item
   pages are all driven off this list.
   --------------------------------------------------------------------------- */
export type WilderCollection = {
  /** Stable id used in URLs and as the industry key. */
  id: string;
  /** Display label shown in the sidebar. */
  industry: string;
  /** Short blurb shown under the active collection. */
  blurb: string;
  /** OpenSea collection slug. */
  slug: string;
  /** Chain the collection lives on. */
  chain: string;
};

export const WILDER_COLLECTIONS: WilderCollection[] = [
  {
    id: 'wheels',
    industry: 'Wheels',
    blurb:
      'Procedurally generated, race-ready vehicles with dynamic gameplay abilities on the streets of Wiami.',
    slug: 'wilderworld',
    chain: 'ethereum',
  },
  {
    id: 'cribs',
    industry: 'Cribs',
    blurb: 'Genesis living spaces that showcase your collection and status in Wiami.',
    slug: 'wilder-cribs-genesis',
    chain: 'ethereum',
  },
  {
    id: 'moto',
    industry: 'Moto',
    blurb: 'Genesis motorcycles tuned for speed and style across the city.',
    slug: 'wilder-moto',
    chain: 'ethereum',
  },
  {
    id: 'beasts',
    industry: 'Beasts',
    blurb: 'The wolves that roam the wilds beyond the city limits.',
    slug: 'wilderbeasts-wolf',
    chain: 'ethereum',
  },
  {
    id: 'land',
    industry: 'Land',
    blurb: 'Onchain parcels across The Island — the foundation of mining and building.',
    slug: 'wilder-land-the-island',
    chain: 'ethereum',
  },
  {
    id: 'kicks',
    industry: 'Kicks',
    blurb: 'AIRWILD — exclusive, collectible footwear that sets your style apart.',
    slug: 'air-wild',
    chain: 'ethereum',
  },
];

export function getCollectionById(id: string): WilderCollection | undefined {
  return WILDER_COLLECTIONS.find((c) => c.id === id);
}

export function getCollectionBySlug(slug: string): WilderCollection | undefined {
  return WILDER_COLLECTIONS.find((c) => c.slug === slug);
}
