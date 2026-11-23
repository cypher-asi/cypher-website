import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Wallets from './Wallets';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as unknown as Response;
}

describe('Wallets (account page, real rail)', () => {
  it('lists the linked wallets from /api/marketplace/wallets', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ wallets: [{ id: 'w1', publicAddress: '0xabc0000000000000000000000000000000000001', canAuthenticate: false }] }),
    );
    render(<Wallets />);
    expect(await screen.findByText('0xabc0000000000000000000000000000000000001')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/marketplace/wallets');
  });

  it('surfaces a load error loudly when the list fetch fails', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'nope' }, false, 500));
    render(<Wallets />);
    expect(await screen.findByRole('alert')).toHaveTextContent('nope');
  });

  it('unlinks a wallet via DELETE /api/marketplace/wallets/:id and drops it from the list', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ wallets: [{ id: 'w1', publicAddress: '0xabc0000000000000000000000000000000000001', canAuthenticate: false }] }),
      )
      .mockResolvedValueOnce(jsonResponse({}, true, 200)); // the DELETE
    render(<Wallets />);
    fireEvent.click(await screen.findByRole('button', { name: /^unlink wallet$/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm unlink/i }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/marketplace/wallets/w1', { method: 'DELETE' }),
    );
    await waitFor(() =>
      expect(screen.queryByText('0xabc0000000000000000000000000000000000001')).not.toBeInTheDocument(),
    );
  });
});
