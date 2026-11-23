import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEthHoldingsQuery, useZchainHoldingsQuery } from './useHoldingsQuery';

type Page = { items: unknown[]; next: string | null; error?: boolean };

/** Serve `pages` (keyed by the `next` cursor) only for URLs matching `path`. */
function mockRoute(path: string, pages: Record<string, Page>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (!url.includes(path)) {
        return { ok: true, json: async () => ({ items: [], next: null }) } as Response;
      }
      const params = new URLSearchParams(url.split('?')[1] ?? '');
      const key = params.get('next') ?? 'first';
      return { ok: true, json: async () => pages[key] } as Response;
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
  chain: 'zchain',
  priceEth: null,
  traits: [],
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useZchainHoldingsQuery', () => {
  it('flattens and dedupes the ZERO wallet holdings across cursor pages', async () => {
    mockRoute('/api/market/holdings', {
      first: { items: [token('1'), token('2')], next: 'c1' },
      c1: { items: [token('2'), token('3')], next: null },
    });

    const { result } = renderHook(() => useZchainHoldingsQuery('0xowner'), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items.map((n) => n.identifier)).toEqual(['1', '2']);
    expect(result.current.hasNextPage).toBe(true);

    await result.current.fetchNextPage();

    await waitFor(() =>
      expect(result.current.data?.items.map((n) => n.identifier)).toEqual(['1', '2', '3'])
    );
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.data?.batchBase).toBe(2);
  });

  it('is disabled without an owner', () => {
    const { result } = renderHook(() => useZchainHoldingsQuery(null), { wrapper: wrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useEthHoldingsQuery', () => {
  it('flattens the linked-wallet ETH holdings', async () => {
    mockRoute('/api/market/eth-holdings', {
      first: { items: [token('a'), token('b')], next: null },
    });

    const { result } = renderHook(() => useEthHoldingsQuery(true), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items.map((n) => n.identifier)).toEqual(['a', 'b']);
  });

  it('is disabled when not enabled', () => {
    const { result } = renderHook(() => useEthHoldingsQuery(false), { wrapper: wrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});
