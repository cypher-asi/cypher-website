/* ---------------------------------------------------------------------------
   Wilder World OpenSea collections, grouped by industry.

   The Market page browses live NFTs via the OpenSea API v2. Each industry maps
   to one or more OpenSea collections. Collections are resolved primarily by
   their onchain `contract` address (authoritative — verified from the Wilder
   World wiki) so we never depend on a fragile umbrella slug like `wilderworld`.
   The `slug` is still used for collection-level stats (floor, volume, owners).

   Industry order mirrors the footer "Industries" column
   (see src/lib/companies/registry.ts): Land, Avatars, Wheels, Weapons, Beasts,
   Moto, PALs, Crafts, Cribs, Kicks. Avatars and Weapons have no tradeable
   collection yet and are omitted.
   --------------------------------------------------------------------------- */
export type WilderCollectionEntry = {
  /** Stable id / URL key for this collection. */
  id: string;
  /** OpenSea collection slug (used for stats + collection detail). */
  slug: string;
  /** Optional sub-label when an industry has more than one collection. */
  label?: string;
  /** Chain the collection lives on. */
  chain: string;
  /** Onchain contract address — the authoritative resolver for NFTs. */
  contract?: string;
  /** Fallback "launched" label when OpenSea does not expose a created date. */
  launched?: string;
  /** Short blurb shown under the active collection. */
  blurb?: string;
};

export type WilderIndustry = {
  /** Stable id used as the industry key. */
  id: string;
  /** Display label shown in the rail. */
  name: string;
  collections: WilderCollectionEntry[];
};

export const WILDER_INDUSTRIES: WilderIndustry[] = [
  {
    id: 'land',
    name: 'Land',
    collections: [
      {
        id: 'land-the-island',
        slug: 'wilder-land-the-island',
        chain: 'ethereum',
        contract: '0xd396ca541F501f5D303166C509e2045848df356b',
        launched: '2021',
        blurb: 'Onchain parcels across The Island — the foundation of mining and building.',
      },
    ],
  },
  {
    id: 'wheels',
    name: 'Wheels',
    collections: [
      {
        id: 'wheels-genesis',
        slug: 'wilder-wheels',
        chain: 'ethereum',
        contract: '0xc2e9678A71e50E5AeD036e00e9c5caeb1aC5987D',
        launched: '2021',
        blurb:
          'Procedurally generated, race-ready vehicles with dynamic gameplay abilities on the streets of Wiami.',
      },
    ],
  },
  {
    id: 'beasts',
    name: 'Beasts',
    collections: [
      {
        id: 'beasts-wolves',
        slug: 'wilderbeasts-wolf',
        label: 'Wolves',
        chain: 'ethereum',
        contract: '0x1a178cfd768f74b3308cbca9998c767f4e5b2cf8',
        launched: '2021',
        blurb: 'The wolves that roam the wilds beyond the city limits.',
      },
      {
        id: 'beasts-wapes',
        slug: 'wilderbeasts-wape',
        label: 'Wapes',
        chain: 'ethereum',
        contract: '0x05F81F870cBca79E9171f22886b58b5597A603AA',
        launched: 'Dec 2022',
        blurb: 'Revenge-seeking beasts in organic, hybrid and mech variants.',
      },
    ],
  },
  {
    id: 'moto',
    name: 'Moto',
    collections: [
      {
        id: 'moto-genesis',
        slug: 'wilder-moto',
        chain: 'ethereum',
        contract: '0x51bd5948cf84a1041d2720f56dED5E173396fc95',
        launched: '2022',
        blurb: 'Genesis motorcycles tuned for speed and style across the city.',
      },
    ],
  },
  {
    id: 'pals',
    name: 'PALs',
    collections: [
      {
        id: 'pals-gen',
        slug: 'wilderpals-gen',
        label: 'GEN',
        chain: 'ethereum',
        contract: '0x90a1f4B78Fa4198BB620b7686f510FD476Ec7A0B',
        launched: 'Mar 2023',
        blurb:
          'GEN companion bots that fight, craft and explore alongside you across the simulation.',
      },
      {
        // NOTE: BEINGs is the second PALs collection. Slug/contract not yet
        // verified against a live OpenSea listing — confirm before relying on
        // its stats. The grid degrades gracefully to an empty state if unset.
        id: 'pals-being',
        slug: 'wilder-pals-being',
        label: 'BEING',
        chain: 'ethereum',
        blurb: 'BEINGs — humanoid lifeforms materialized by GENs.',
      },
    ],
  },
  {
    id: 'crafts',
    name: 'Crafts',
    collections: [
      {
        id: 'crafts-genesis',
        slug: 'wilder-crafts-genesis',
        chain: 'ethereum',
        contract: '0xE4954E4FB3C448f4eFBC1f8EC40eD54a2A1cc1f5',
        launched: '2021',
        blurb: 'Genesis weapons, gear and upgrades forged from the resources you gather.',
      },
    ],
  },
  {
    id: 'cribs',
    name: 'Cribs',
    collections: [
      {
        id: 'cribs-genesis',
        slug: 'wilder-cribs-genesis',
        chain: 'ethereum',
        contract: '0xfEA385B9E6e4fdfA3508aE6863d540c4a8Ccc0fE',
        launched: '2022',
        blurb: 'Genesis living spaces that showcase your collection and status in Wiami.',
      },
    ],
  },
  {
    id: 'kicks',
    name: 'Kicks',
    collections: [
      {
        id: 'kicks-season-0',
        slug: 'aws0',
        label: 'Season 0',
        chain: 'ethereum',
        contract: '0x1C42576aCa321a590a809cd8B18492aafC1f3909',
        launched: '2021',
        blurb: 'AIR WILD Season 0 — the genesis Wilder.Kicks sneaker drop.',
      },
      {
        id: 'kicks-season-1',
        slug: 'air-wild-season-1',
        label: 'Season 1',
        chain: 'ethereum',
        contract: '0x4d8165cb6861253e9edFBAC2f41A386BA1a0A175',
        launched: 'Jan 2022',
        blurb: 'AIR WILD Season 1 — collectible footwear that sets your style apart.',
      },
      {
        id: 'kicks-season-2',
        slug: 'air-wild',
        label: 'Season 2',
        chain: 'ethereum',
        contract: '0x35D2f3CDAf5e2DeA9e6ae3553A4CAacbA860A395',
        launched: '2022',
        blurb: 'AIR WILD Season 2 — exclusive metaverse-ready sneakers by Chad Knight.',
      },
    ],
  },
];

/** Flat list of every collection across all industries, in rail order. */
export const ALL_ENTRIES: WilderCollectionEntry[] = WILDER_INDUSTRIES.flatMap(
  (i) => i.collections
);

export function getEntryBySlug(slug: string): WilderCollectionEntry | undefined {
  return ALL_ENTRIES.find((c) => c.slug === slug);
}

export function getEntryById(id: string): WilderCollectionEntry | undefined {
  return ALL_ENTRIES.find((c) => c.id === id);
}

export function getIndustryForEntry(entryId: string): WilderIndustry | undefined {
  return WILDER_INDUSTRIES.find((i) => i.collections.some((c) => c.id === entryId));
}
