import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import type {
  IndexerAsset,
  IndexerInventoryResponse,
  MarketplaceListingsResponse,
} from '@/lib/indexer';

vi.mock('@/lib/indexer', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/indexer')>();
  return { ...actual, indexerFetch: vi.fn() };
});
vi.mock('@/lib/opensea', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/opensea')>();
  return {
    ...actual,
    openseaFetch: vi.fn().mockResolvedValue(null),
    fetchBestListingsPage: vi.fn().mockResolvedValue(null),
    fetchBestListingsMap: vi.fn().mockResolvedValue({}),
    fetchNftsByContract: vi.fn().mockResolvedValue(null),
    fetchNftsByIdentifiers: vi.fn().mockResolvedValue([]),
  };
});

import { indexerFetch } from '@/lib/indexer';
import { GET } from './route';

// `indexerFetch` is generic, so type the mock against a concrete signature.
const mockedFetch = indexerFetch as MockedFunction<
  (path: string) => Promise<unknown>
>;

// `pack-weapons` is a non-fungible indexer collection, so status=unlisted takes the
// ERC-721 path: paginate the collection inventory (offset cursor) minus tokens that
// have an active listing. That's the inventory-pagination logic under test here.
const SLUG = 'pack-weapons';
const CONTRACT = '0x693de821fc5999ac3738720f53763fe8aafaf6ac';

function makeAsset(tokenId: string): IndexerAsset {
  return {
    id: `asset-${tokenId}`,
    collectionAddress: CONTRACT,
    collectionName: 'Weapons',
    tokenId,
    ownerAddress: '0xowner',
    chainId: 9369,
    tokenStandard: 'ERC721',
    balance: '1',
    tokenUri: null,
    metadata: { name: `Weapon #${tokenId}`, attributes: [] },
  };
}

/** The inventory calls (the ones under test); the ERC-721 unlisted path also makes
 *  a listings-exclusion call, which we filter out of call-index assertions. */
const inventoryCalls = () =>
  mockedFetch.mock.calls.filter((c) => String(c[0]).includes('/v1/inventory'));

/** Serves pages of `total` synthetic assets from ?limit=&offset=, and returns an
 *  empty active-listing set for the exclusion query so the full page shows. */
function servePages(total: number) {
  const all = Array.from({ length: total }, (_, i) => makeAsset(String(i)));
  mockedFetch.mockImplementation(async (path: string) => {
    if (path.includes('/v1/marketplace/listings')) {
      return { items: [], total: 0, limit: 0, offset: 0 } satisfies MarketplaceListingsResponse;
    }
    const params = new URLSearchParams(path.split('?')[1] ?? '');
    const limit = parseInt(params.get('limit') ?? '50', 10);
    const offset = parseInt(params.get('offset') ?? '0', 10);
    const page: IndexerInventoryResponse = {
      items: all.slice(offset, offset + limit),
      total,
      limit,
      offset,
    };
    return page;
  });
}

function request(extra = '') {
  return new Request(`http://localhost/api/market/nfts?slug=${SLUG}&status=unlisted${extra}`);
}

beforeEach(() => {
  mockedFetch.mockReset();
});

describe('GET /api/market/nfts (indexer unlisted branch)', () => {
  it('returns the first page of 50 with next="50" when more remain', async () => {
    servePages(450);
    const res = await GET(request());
    const body = await res.json();
    expect(body.error).toBe(false);
    expect(body.items).toHaveLength(50);
    expect(body.items[0].identifier).toBe('0');
    expect(body.next).toBe('50');
    expect(inventoryCalls()).toHaveLength(1);
    expect(inventoryCalls()[0][0]).toContain('limit=50');
    expect(inventoryCalls()[0][0]).toContain('offset=0');
  });

  it('walks subsequent pages via next and terminates with next=null', async () => {
    servePages(450);
    const page2 = await (await GET(request('&next=50'))).json();
    expect(page2.items[0].identifier).toBe('50');
    expect(page2.next).toBe('100');

    const last = await (await GET(request('&next=400'))).json();
    expect(last.items).toHaveLength(50);
    expect(last.next).toBeNull();
  });

  it('uses the short-page heuristic when total is missing', async () => {
    // Inventory is awaited before the exclusion call, so the once-mock feeds it;
    // the exclusion call then resolves undefined → treated as no listings.
    mockedFetch.mockResolvedValueOnce({
      items: Array.from({ length: 50 }, (_, i) => makeAsset(String(i))),
    } satisfies IndexerInventoryResponse);
    const body = await (await GET(request())).json();
    expect(body.next).toBe('50');

    mockedFetch.mockResolvedValueOnce({
      items: [makeAsset('50')],
    } satisfies IndexerInventoryResponse);
    const tail = await (await GET(request('&next=50'))).json();
    expect(tail.next).toBeNull();
  });

  it('treats a NaN or negative next cursor as offset 0', async () => {
    servePages(10);
    const body = await (await GET(request('&next=bogus'))).json();
    expect(body.items).toHaveLength(10);
    expect(inventoryCalls()[0][0]).toContain('offset=0');

    const neg = await (await GET(request('&next=-5'))).json();
    expect(neg.items).toHaveLength(10);
    expect(inventoryCalls()[1][0]).toContain('offset=0');
  });

  it('forwards trait selections to the indexer as an attributes filter', async () => {
    servePages(10);
    const attrs = JSON.stringify({ Rarity: ['Rare', 'Common'] });
    await GET(request(`&attributes=${encodeURIComponent(attrs)}`));
    const url = inventoryCalls()[0][0];
    expect(url).toContain('attributes=');
    expect(decodeURIComponent(url)).toContain(attrs);
  });

  it('omits the attributes param when no traits are selected', async () => {
    servePages(10);
    await GET(request());
    expect(inventoryCalls()[0][0]).not.toContain('attributes=');
  });

  it('reports a failed page as a failed request (502, error: true)', async () => {
    mockedFetch.mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toEqual({ items: [], next: null, error: true });
  });
});
