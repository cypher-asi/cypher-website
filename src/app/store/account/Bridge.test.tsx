import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Bridge from './Bridge';

const address = '0x1111111111111111111111111111111111111111';
const zero = '0x9999999999999999999999999999999999999999';

function mockApi(wallets: { id: string; publicAddress: string }[] | null, opts: { ok?: boolean; balance?: string } = {}) {
  const { ok = true, balance = '1000000000000000000' } = opts;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (typeof url === 'string' && url.includes('/api/market/wild-balance')) {
        return { ok: true, json: async () => ({ balance }) } as Response;
      }
      return { ok, json: async () => (wallets ? { wallets } : { error: 'nope' }) } as Response;
    })
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('WILD-only account bridge', () => {
  it('shows the route without fetching private wallets when signed out', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    render(<Bridge userId={null} zeroWalletAddress={null} />);
    expect(screen.getByText('Ethereum Mainnet')).toBeTruthy();
    expect(screen.getByText('Z Chain')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Connect wallet' })).toHaveAttribute('href', '/store/account?tab=wallets');
    fireEvent.click(screen.getByRole('button', { name: 'Preview transfer' }));
    expect(screen.getByRole('button', { name: 'Review transfer' })).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('wires linked wallets, the ZERO receiving address and the real WILD balance', async () => {
    mockApi([{ id: 'w1', publicAddress: address }], { balance: '1000000000000000000' });
    const manage = vi.fn();
    render(<Bridge userId="alice" zeroWalletAddress={zero} onManageWallets={manage} />);
    fireEvent.change(await screen.findByLabelText('Source wallet'), { target: { value: 'w1' } });
    expect(screen.getByText(address)).toBeTruthy();
    expect(screen.getByText('Linked · signing connection pending')).toBeTruthy();
    expect(screen.getByText(zero)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Manage wallets' }));
    expect(manage).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '100.125' } });
    expect(await screen.findByText('Balance 1 WILD')).toBeTruthy(); // real balance, not synthetic
    expect(screen.getByLabelText('Estimated receive unavailable')).toHaveTextContent('—');
    fireEvent.click(screen.getByRole('button', { name: 'Review transfer' }));
    expect(screen.getByRole('heading', { name: 'Review transfer' })).toBeTruthy();
    expect(screen.getByText('100.125')).toBeTruthy();
    expect(screen.getByText(zero)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Confirm bridge' })).toBeDisabled();
  });

  it('surfaces a wallet load error with retry', async () => {
    mockApi(null, { ok: false });
    render(<Bridge userId="alice" zeroWalletAddress={zero} />);
    expect(await screen.findByText('nope')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry wallets' })).toBeTruthy();
  });
});
