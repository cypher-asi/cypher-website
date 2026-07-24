import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';

const h = vi.hoisted(() => ({
  linked: [] as { id: string; publicAddress: string; canAuthenticate: boolean }[],
  connect: vi.fn(),
  linkMutateAsync: vi.fn(),
  linkReset: vi.fn(),
  unlinkMutate: vi.fn(),
  linkState: { isPending: false, isError: false },
  unlinkState: { isPending: false, variables: undefined as string | undefined },
}));

vi.mock('../../lib/thirdwebClient', () => ({ thirdwebClient: { id: 'test-client' } }));
vi.mock('thirdweb/react', () => ({ useConnectModal: () => ({ connect: h.connect }) }));
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ user: { id: 'user1' } }),
}));
vi.mock('../../hooks/useLinkedWalletsQuery', () => ({ useLinkedWalletsQuery: () => ({ data: h.linked }) }));
vi.mock('../../hooks/useLinkWalletMutation', () => ({
  useLinkWalletMutation: () => ({ mutateAsync: h.linkMutateAsync, reset: h.linkReset, ...h.linkState }),
}));
vi.mock('../../hooks/useUnlinkWalletMutation', () => ({
  useUnlinkWalletMutation: () => ({ mutate: h.unlinkMutate, ...h.unlinkState }),
}));

import { EthereumWalletSection } from './EthereumWalletSection';

beforeEach(() => {
  h.linked = [];
  h.connect.mockReset();
  h.linkMutateAsync.mockReset();
  h.linkReset.mockReset();
  h.unlinkMutate.mockReset();
  h.linkState = { isPending: false, isError: false };
  h.unlinkState = { isPending: false, variables: undefined };
});

afterEach(cleanup);

function connectResolvesTo(address: string) {
  const account = { address, signMessage: vi.fn(async () => '0xsig') };
  h.connect.mockResolvedValue({ getAccount: () => account, disconnect: vi.fn(async () => {}) });
}

describe('EthereumWalletSection', () => {
  it('lists linked wallets and removes one only after confirming', () => {
    h.linked = [{ id: 'w1', publicAddress: '0xabcdef0000000000000000000000000000001234', canAuthenticate: false }];

    render(<EthereumWalletSection />);
    expect(screen.getByText('0xabcd…1234')).toBeInTheDocument();

    // Clicking Remove opens a confirm dialog — it doesn't remove yet.
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(h.unlinkMutate).not.toHaveBeenCalled();

    // Confirming (the dialog's Remove) actually removes.
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));
    expect(h.unlinkMutate).toHaveBeenCalledWith('w1');
  });

  it('warns that a login wallet also signs you in', () => {
    h.linked = [{ id: 'w1', publicAddress: '0xabcdef0000000000000000000000000000001234', canAuthenticate: true }];
    render(<EthereumWalletSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(within(screen.getByRole('dialog')).getByText(/also signs you in/i)).toBeInTheDocument();
  });

  it('does not show the login warning for a non-login wallet', () => {
    h.linked = [{ id: 'w2', publicAddress: '0xabcdef0000000000000000000000000000005678', canAuthenticate: false }];
    render(<EthereumWalletSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(within(screen.getByRole('dialog')).queryByText(/also signs you in/i)).not.toBeInTheDocument();
  });

  it('shows a per-row Removing… state on the wallet being removed', () => {
    h.linked = [
      { id: 'w1', publicAddress: '0xabcdef0000000000000000000000000000001234', canAuthenticate: false },
      { id: 'w2', publicAddress: '0xabcdef0000000000000000000000000000005678', canAuthenticate: false },
    ];
    h.unlinkState = { isPending: true, variables: 'w1' };

    render(<EthereumWalletSection />);
    const buttons = screen.getAllByRole('button', { name: /Remov/ });
    // w1 shows "Removing…"; w2 stays "Remove" (both disabled while one is in flight).
    expect(buttons[0]).toHaveTextContent('Removing…');
    expect(buttons[1]).toHaveTextContent('Remove');
    expect(buttons[1]).toBeDisabled();
  });

  it('explains the link is account-level, then connects and links on confirm', async () => {
    connectResolvesTo('0xEOA');
    h.linkMutateAsync.mockResolvedValue({ linked: true, requiresConfirmation: false });

    render(<EthereumWalletSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Connect & link a wallet' }));

    // The explainer dialog is shown, and nothing connects until confirmed.
    expect(within(screen.getByRole('dialog')).getByText(/ZERO account/i)).toBeInTheDocument();
    expect(h.connect).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(h.linkMutateAsync).toHaveBeenCalled());
    expect(h.connect).toHaveBeenCalled();
    expect(h.linkMutateAsync.mock.calls[0][0].account.address).toBe('0xEOA');
  });

  it('clears a prior link error when re-opening the link dialog', () => {
    h.linkState = { isPending: false, isError: true };

    render(<EthereumWalletSection />);
    expect(screen.getByText(/Couldn’t link that wallet/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Connect & link a wallet' }));
    expect(h.linkReset).toHaveBeenCalled();
  });

  it('surfaces a transfer-confirm when the wallet is on another account, then re-links with confirm', async () => {
    connectResolvesTo('0xEOA');
    h.linkMutateAsync.mockResolvedValue({ linked: false, requiresConfirmation: true });

    render(<EthereumWalletSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Connect & link a wallet' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    const transferBtn = await screen.findByRole('button', { name: /move it here/i });
    fireEvent.click(transferBtn);

    await waitFor(() => expect(h.linkMutateAsync).toHaveBeenCalledTimes(2));
    expect(h.linkMutateAsync.mock.calls[1][0]).toMatchObject({ confirm: true });
  });
});
