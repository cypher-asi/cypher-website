import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLinkedWalletsQuery } from './useLinkedWalletsQuery';

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('useLinkedWalletsQuery', () => {
  it('does not fetch when signed out (userId null)', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useLinkedWalletsQuery(null), { wrapper: wrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns the linked wallets when signed in', async () => {
    const fetchMock = vi.fn(
      async (_url: string) =>
        ({
          ok: true,
          json: async () => ({ wallets: [{ id: 'w1', publicAddress: '0xabc', canAuthenticate: false }] }),
        }) as Response,
    );
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useLinkedWalletsQuery('user1'), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: 'w1', publicAddress: '0xabc', canAuthenticate: false }]);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/marketplace/wallets');
  });

  it('surfaces an error when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false }) as Response));

    const { result } = renderHook(() => useLinkedWalletsQuery('user1'), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
