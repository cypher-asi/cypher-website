import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { linkWalletFlow, useLinkWalletMutation } from './useLinkWalletMutation';

function mockFetch(
  opts: { challengeOk?: boolean; challengeBody?: unknown; addOk?: boolean; addBody?: unknown } = {},
) {
  const {
    challengeOk = true,
    challengeBody = { message: 'siwe-message' },
    addOk = true,
    addBody = { wallet: { id: 'w1' } },
  } = opts;
  const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
    if (url.startsWith('/api/marketplace/wallet-challenge')) {
      return { ok: challengeOk, json: async () => challengeBody } as Response;
    }
    if (url === '/api/marketplace/add-wallet') {
      return { ok: addOk, json: async () => addBody } as Response;
    }
    throw new Error(`unexpected url ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const account = { address: '0xAbc', signMessage: vi.fn(async () => '0xsignature') };

afterEach(() => {
  vi.unstubAllGlobals();
  account.signMessage.mockClear();
});

describe('linkWalletFlow', () => {
  it('fetches a challenge, signs it, and submits to add-wallet', async () => {
    const fetchMock = mockFetch();

    const result = await linkWalletFlow(account);

    expect(result).toEqual({ linked: true, requiresConfirmation: false });
    expect(account.signMessage).toHaveBeenCalledWith({ message: 'siwe-message' });
    expect(fetchMock.mock.calls[0][0]).toContain('address=0xAbc');
    const addBody = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string);
    expect(addBody).toMatchObject({ message: 'siwe-message', signature: '0xsignature' });
    expect(addBody.confirm).toBeUndefined();
  });

  it('returns requiresConfirmation when the wallet is on another account', async () => {
    mockFetch({ addBody: { code: 'WALLET_LINKED_TO_ANOTHER_ACCOUNT', requiresConfirmation: true } });

    const result = await linkWalletFlow(account);

    expect(result).toEqual({ linked: false, requiresConfirmation: true });
  });

  it('passes confirm:true through on a transfer re-submit', async () => {
    const fetchMock = mockFetch();

    await linkWalletFlow(account, true);

    const addBody = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string);
    expect(addBody.confirm).toBe(true);
  });

  it('throws (and does not sign) if the challenge request fails', async () => {
    mockFetch({ challengeOk: false, challengeBody: {} });

    await expect(linkWalletFlow(account)).rejects.toThrow('Could not start wallet linking');
    expect(account.signMessage).not.toHaveBeenCalled();
  });

  it('throws with the server error when add-wallet fails', async () => {
    mockFetch({ addOk: false, addBody: { error: 'Wallet in use' } });

    await expect(linkWalletFlow(account)).rejects.toThrow('Wallet in use');
  });
});

describe('useLinkWalletMutation', () => {
  it('invalidates the linked-wallets list after a successful link', async () => {
    mockFetch();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useLinkWalletMutation(), { wrapper });
    await result.current.mutateAsync({ account });

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['market', 'linkedWallets'] }),
    );
  });
});
