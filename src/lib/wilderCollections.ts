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
    id: 'land',
    industry: 'Land',
    blurb: 'Onchain parcels across The Island — the foundation of mining and building.',
    slug: 'wilder-land-the-island',
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
    id: 'pals',
    industry: 'PALs',
    blurb: 'GEN companion bots that fight, craft and explore alongside you across the simulation.',
    slug: 'wilderpals-gen',
    chain: 'ethereum',
  },
  {
    id: 'crafts',
    industry: 'Crafts',
    blurb: 'Genesis weapons, gear and upgrades forged from the resources you gather.',
    slug: 'wilder-crafts-genesis',
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
    id: 'kicks',
    industry: 'Kicks',
    blurb: 'AIR WILD — exclusive, collectible footwear that sets your style apart on the streets.',
    slug: 'air-wild-season-two-by-wilder',
    chain: 'base',
  },
];

export function getCollectionById(id: string): WilderCollection | undefined {
  return WILDER_COLLECTIONS.find((c) => c.id === id);
}

export function getCollectionBySlug(slug: string): WilderCollection | undefined {
  return WILDER_COLLECTIONS.find((c) => c.slug === slug);
}
