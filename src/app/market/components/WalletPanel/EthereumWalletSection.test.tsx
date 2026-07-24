import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const h = vi.hoisted(() => ({
  linked: [] as { id: string; publicAddress: string; canAuthenticate: boolean }[],
  connect: vi.fn(),
  linkMutateAsync: vi.fn(),
  unlinkMutate: vi.fn(),
  linkState: { isPending: false, isError: false },
}));

vi.mock('../../lib/thirdwebClient', () => ({ thirdwebClient: { id: 'test-client' } }));
vi.mock('thirdweb/react', () => ({ useConnectModal: () => ({ connect: h.connect }) }));
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ user: { id: 'user1' } }),
}));
vi.mock('../../hooks/useLinkedWalletsQuery', () => ({ useLinkedWalletsQuery: () => ({ data: h.linked }) }));
vi.mock('../../hooks/useLinkWalletMutation', () => ({
  useLinkWalletMutation: () => ({ mutateAsync: h.linkMutateAsync, ...h.linkState }),
}));
vi.mock('../../hooks/useUnlinkWalletMutation', () => ({
  useUnlinkWalletMutation: () => ({ mutate: h.unlinkMutate, isPending: false }),
}));

import { EthereumWalletSection } from './EthereumWalletSection';

beforeEach(() => {
  h.linked = [];
  h.connect.mockReset();
  h.linkMutateAsync.mockReset();
  h.unlinkMutate.mockReset();
  h.linkState = { isPending: false, isError: false };
});

afterEach(cleanup);

function connectResolvesTo(address: string) {
  const account = { address, signMessage: vi.fn(async () => '0xsig') };
  h.connect.mockResolvedValue({ getAccount: () => account });
}

describe('EthereumWalletSection', () => {
  it('lists linked wallets and removes one on click', () => {
    h.linked = [{ id: 'w1', publicAddress: '0xabcdef0000000000000000000000000000001234', canAuthenticate: false }];

    render(<EthereumWalletSection />);

    expect(screen.getByText('0xabcd…1234')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(h.unlinkMutate).toHaveBeenCalledWith('w1');
  });

  it('connects a wallet and links it', async () => {
    connectResolvesTo('0xEOA');
    h.linkMutateAsync.mockResolvedValue({ linked: true, requiresConfirmation: false });

    render(<EthereumWalletSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Connect & link a wallet' }));

    await waitFor(() => expect(h.linkMutateAsync).toHaveBeenCalled());
    expect(h.connect).toHaveBeenCalled();
    expect(h.linkMutateAsync.mock.calls[0][0].account.address).toBe('0xEOA');
  });

  it('surfaces a confirm action when the wallet is on another account, then re-links with confirm', async () => {
    connectResolvesTo('0xEOA');
    h.linkMutateAsync.mockResolvedValue({ linked: false, requiresConfirmation: true });

    render(<EthereumWalletSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Connect & link a wallet' }));

    const confirmBtn = await screen.findByRole('button', { name: /move it here/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => expect(h.linkMutateAsync).toHaveBeenCalledTimes(2));
    expect(h.linkMutateAsync.mock.calls[1][0]).toMatchObject({ confirm: true });
  });
});
