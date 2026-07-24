import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { unlinkWallet, useUnlinkWalletMutation } from './useUnlinkWalletMutation';

afterEach(() => vi.unstubAllGlobals());

describe('unlinkWallet', () => {
  it('sends a DELETE to the wallet route', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }) as Response);
    vi.stubGlobal('fetch', fetchMock);

    await unlinkWallet('wallet-1');

    expect(fetchMock).toHaveBeenCalledWith('/api/marketplace/wallets/wallet-1', { method: 'DELETE' });
  });

  it('throws with the server error on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, json: async () => ({ error: 'Cannot remove' }) }) as Response),
    );

    await expect(unlinkWallet('wallet-1')).rejects.toThrow('Cannot remove');
  });
});

describe('useUnlinkWalletMutation', () => {
  it('invalidates the linked-wallets list on success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) }) as Response));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUnlinkWalletMutation(), { wrapper });
    await result.current.mutateAsync('wallet-1');

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['market', 'linkedWallets'] }),
    );
  });
});
