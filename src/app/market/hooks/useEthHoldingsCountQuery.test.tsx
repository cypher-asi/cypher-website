import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEthHoldingsCountQuery } from './useEthHoldingsCountQuery';

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('useEthHoldingsCountQuery', () => {
  it('does not fetch when the user has no linked wallets', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useEthHoldingsCountQuery('u1', false), { wrapper: wrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not fetch when signed out', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useEthHoldingsCountQuery(null, true), { wrapper: wrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches once signed in with at least one linked wallet', () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ total: 3 }) }) as Response);
    vi.stubGlobal('fetch', fetchMock);

    renderHook(() => useEthHoldingsCountQuery('u1', true), { wrapper: wrapper() });

    expect(fetchMock).toHaveBeenCalledWith('/api/market/eth-holdings?count=1');
  });
});
