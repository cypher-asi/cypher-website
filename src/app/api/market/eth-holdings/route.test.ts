import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import type { IndexerAsset, IndexerInventoryResponse } from '@/lib/indexer';

// The route's module chain pulls in the server-only marketplace config; neutralize
// the `server-only` guard so it can load under vitest's jsdom environment.
vi.mock('server-only', () => ({}));

vi.mock('@/lib/indexer', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/indexer')>();
  return { ...actual, indexerFetch: vi.fn() };
});
vi.mock('@/features/marketplace/wallet-link', async (importActual) => {
  const actual = await importActual<typeof import('@/features/marketplace/wallet-link')>();
  return { ...actual, fetchLinkedWallets: vi.fn() };
});

import { indexerFetch } from '@/lib/indexer';
import { fetchLinkedWallets } from '@/features/marketplace/wallet-link';
import { MarketplaceAuthError } from '@/features/marketplace/auth';
import { GET } from './route';

const mockedFetch = indexerFetch as MockedFunction<(path: string) => Promise<unknown>>;
const mockedWallets = fetchLinkedWallets as MockedFunction<typeof fetchLinkedWallets>;

const EOA = '0x00000000000000000000000000000000000000aa';

function asset(tokenId: string, collection: string): IndexerAsset {
  return {
    collectionAddress: collection,
    tokenId,
    ownerAddress: EOA,
    chainId: 1,
    balance: 1,
    metadata: { name: `Asset ${tokenId}`, image: 'ipfs://x' },
  } as unknown as IndexerAsset;
}

function inv(items: IndexerAsset[], total?: number): IndexerInventoryResponse {
  return { items, total: total ?? items.length } as IndexerInventoryResponse;
}

function req(params = ''): Request {
  return new Request(`http://localhost/api/market/eth-holdings${params}`);
}

beforeEach(() => {
  mockedFetch.mockReset();
  mockedWallets.mockReset();
});

describe('GET /api/market/eth-holdings', () => {
  it('returns empty (no fetch) when the user has no linked wallets', async () => {
    mockedWallets.mockResolvedValueOnce([]);

    const body = await (await GET(req())).json();

    expect(body).toEqual({ items: [], next: null, total: 0, error: false });
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it('aggregates held assets across the linked wallets and ETH collections', async () => {
    mockedWallets.mockResolvedValueOnce([{ id: 'w1', publicAddress: EOA, canAuthenticate: false }]);
    // One held asset in the first collection queried, empty for the rest.
    const seenFirst = { hit: false };
    mockedFetch.mockImplementation(async (path: string) => {
      if (path.includes('offset=0') && path.includes(EOA) && !seenFirst.hit) {
        seenFirst.hit = true;
        return inv([asset('1', '0xland')]);
      }
      return inv([]);
    });

    const body = await (await GET(req())).json();

    expect(body.error).toBe(false);
    expect(body.items.length).toBe(1);
    expect(body.items[0].identifier).toBe('1');
    // Every (wallet, collection) pair was queried by owner + collection.
    expect(mockedFetch.mock.calls.every(([p]) => (p as string).includes(`wallet=${EOA}`))).toBe(true);
  });

  it('count=1 sums held totals across all pairs without items', async () => {
    mockedWallets.mockResolvedValueOnce([{ id: 'w1', publicAddress: EOA, canAuthenticate: false }]);
    mockedFetch.mockResolvedValue(inv([], 2)); // each pair reports total 2

    const body = await (await GET(req('?count=1'))).json();

    expect(body.items).toEqual([]);
    expect(body.total).toBeGreaterThan(0);
    expect(body.total % 2).toBe(0);
  });

  it('returns 502 when an indexer fetch fails', async () => {
    mockedWallets.mockResolvedValueOnce([{ id: 'w1', publicAddress: EOA, canAuthenticate: false }]);
    mockedFetch.mockResolvedValue(null);

    const res = await GET(req());

    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe(true);
  });

  it('maps an auth failure to its status', async () => {
    mockedWallets.mockRejectedValueOnce(new MarketplaceAuthError(401, 'Not signed in'));

    const res = await GET(req());

    expect(res.status).toBe(401);
  });
});
