import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import type { IndexerInventoryResponse } from '@/lib/indexer';

vi.mock('@/lib/indexer', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/indexer')>();
  return { ...actual, indexerFetch: vi.fn() };
});
vi.mock('@/lib/opensea', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/opensea')>();
  return { ...actual, openseaFetch: vi.fn().mockResolvedValue(null) };
});

import { indexerFetch } from '@/lib/indexer';
import { GET } from './route';

// `indexerFetch` is generic, so type the mock against a concrete signature.
const mockedFetch = indexerFetch as MockedFunction<
  (path: string) => Promise<unknown>
>;

// Checksum-cased on purpose: the route must match case-insensitively against
// the lowercase contract configured in wilderCollections.
const PACKS_CONTRACT = '0x5CE3A764cc43E891D8Bd068dd16C1b08Db4Ad0d4';

const collectionsEnvelope = {
  collections: [
    {
      collectionAddress: PACKS_CONTRACT,
      collectionName: 'Wilder Packs',
      totalItems: 7589,
      totalHolders: 1200,
    },
  ],
};

const marketCollectionsEnvelope = {
  collections: [
    {
      collectionAddress: PACKS_CONTRACT,
      collectionName: 'Wilder Packs',
      activeListings: 3,
      floorPriceRaw: '2000000000000000000',
      floorPriceFormatted: null,
    },
  ],
};

const soldEnvelope = {
  items: [{ priceRaw: '3000000000000000000' }, { priceRaw: '2000000000000000000' }],
  total: 2,
  limit: 200,
  offset: 0,
};

const inventoryEnvelope: IndexerInventoryResponse = {
  items: [
    {
      id: 'asset-1',
      collectionAddress: PACKS_CONTRACT.toLowerCase(),
      collectionName: 'Wilder Packs',
      tokenId: '1',
      ownerAddress: '0xowner',
      chainId: 9369,
      tokenStandard: 'ERC721',
      balance: '1',
      tokenUri: null,
      metadata: {
        name: 'Pack #1',
        image: 'https://example.com/pack.png',
        attributes: [],
      },
    },
  ],
  total: 7589,
  limit: 50,
  offset: 0,
};

function findCollection(body: { collections: Array<{ slug: string }> }, slug: string) {
  return body.collections.find((c) => c.slug === slug) as
    | Record<string, unknown>
    | undefined;
}

beforeEach(() => {
  mockedFetch.mockReset();
});

describe('GET /api/market/collections (indexer entries)', () => {
  it('resolves name/supply/owners + order-book stats (case-insensitive address)', async () => {
    mockedFetch.mockImplementation(async (path: string) => {
      if (path.startsWith('/v1/inventory/collections')) return collectionsEnvelope;
      if (path.startsWith('/v1/marketplace/collections')) return marketCollectionsEnvelope;
      if (path.startsWith('/v1/marketplace/listings')) return soldEnvelope;
      return inventoryEnvelope;
    });

    const body = await (await GET()).json();
    const packs = findCollection(body, 'packs');
    expect(packs).toBeDefined();
    expect(packs?.name).toBe('Wilder Packs');
    expect(packs?.totalSupply).toBe(7589);
    expect(packs?.image).toBe('https://example.com/pack.png');
    // Order-book stats, WILD-denominated.
    expect(packs?.floorPrice).toBe(2);
    expect(packs?.floorSymbol).toBe('WILD');
    expect(packs?.listedCount).toBe(3);
    expect(packs?.owners).toBe(1200);
    expect(packs?.totalVolume).toBe(5); // 3 + 2 WILD sold
    expect(packs?.topOfferEth).toBeNull(); // no offers/bids in the marketplace
    expect(packs?.priceEth).toBeUndefined();
  });

  it('falls back to the config label and null supply when the indexer fails', async () => {
    mockedFetch.mockResolvedValue(null);

    const body = await (await GET()).json();
    const packs = findCollection(body, 'packs');
    expect(packs).toBeDefined();
    // The packs entry has no `label`, so the fallback is the slug itself.
    expect(packs?.name).toBe('packs');
    expect(packs?.totalSupply).toBeNull();
    expect(packs?.image).toBeNull();
  });
});
