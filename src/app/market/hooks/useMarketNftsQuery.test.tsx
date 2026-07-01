import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMarketNftsQuery } from './useMarketNftsQuery';

type FetchResponse = { items: unknown[]; next: string | null };

function mockNfts(pages: Record<string, FetchResponse>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const params = new URLSearchParams(url.split('?')[1]);
      const key = params.get('next') ?? 'first';
      return {
        ok: true,
        json: async () => pages[key],
      } as Response;
    })
  );
}

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const token = (id: string) => ({
  identifier: id,
  name: `Token ${id}`,
  image: null,
  collectionSlug: 'wilder',
  contract: '0xabc',
  chain: 'ethereum',
  priceEth: null,
  traits: [],
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useMarketNftsQuery', () => {
  it('flattens and dedupes pages across cursor pagination', async () => {
    mockNfts({
      first: { items: [token('1'), token('2')], next: 'cursor1' },
      cursor1: { items: [token('2'), token('3')], next: null },
    });

    const { result } = renderHook(() => useMarketNftsQuery('wilder', 'listed'), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items.map((n) => n.identifier)).toEqual(['1', '2']);
    expect(result.current.hasNextPage).toBe(true);

    await result.current.fetchNextPage();

    await waitFor(() =>
      expect(result.current.data?.items.map((n) => n.identifier)).toEqual(['1', '2', '3'])
    );
    expect(result.current.hasNextPage).toBe(false);
    // Second page begins after the two unique tokens from page one.
    expect(result.current.data?.batchBase).toBe(2);
  });

  it('is disabled without a slug', () => {
    const { result } = renderHook(() => useMarketNftsQuery('', 'listed'), {
      wrapper: wrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });
});
