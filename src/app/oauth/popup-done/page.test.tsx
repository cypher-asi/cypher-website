import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import EpicPopupDonePage from './page';
import { EPIC_POPUP_MESSAGE } from '@/features/auth/epicPopup';

const postMessage = vi.fn();
const close = vi.fn();

function landOn(search: string) {
  vi.stubGlobal('location', { search, origin: 'http://localhost:3000' });
  vi.stubGlobal('opener', { postMessage });
  vi.stubGlobal('close', close);
}

const reported = () => postMessage.mock.calls[0][0];

beforeEach(() => {
  postMessage.mockReset();
  close.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe('Epic sign-in popup landing page', () => {
  it('reports success and closes itself', async () => {
    landOn('?status=success');
    render(<EpicPopupDonePage />);

    await waitFor(() => expect(postMessage).toHaveBeenCalled());
    expect(reported()).toEqual({ source: EPIC_POPUP_MESSAGE, status: 'success' });
    expect(close).toHaveBeenCalled();
  });

  it('forwards no-account instead of flattening it to an error', async () => {
    // The opener acts on this differently: it switches to create rather than
    // telling the buyer to try again.
    landOn('?status=no-account');
    render(<EpicPopupDonePage />);

    await waitFor(() => expect(postMessage).toHaveBeenCalled());
    expect(reported().status).toBe('no-account');
  });

  it('treats anything unrecognised as an error', async () => {
    landOn('?status=weird');
    render(<EpicPopupDonePage />);

    await waitFor(() => expect(postMessage).toHaveBeenCalled());
    expect(reported().status).toBe('error');
  });

  it('targets our own origin so no other window can observe the outcome', async () => {
    landOn('?status=success');
    render(<EpicPopupDonePage />);

    await waitFor(() => expect(postMessage).toHaveBeenCalled());
    expect(postMessage.mock.calls[0][1]).toBe('http://localhost:3000');
  });

  it('does not throw when opened without an opener', async () => {
    vi.stubGlobal('location', { search: '?status=success', origin: 'http://localhost:3000' });
    vi.stubGlobal('opener', null);
    vi.stubGlobal('close', close);

    expect(() => render(<EpicPopupDonePage />)).not.toThrow();
    await waitFor(() => expect(close).toHaveBeenCalled());
  });
});
