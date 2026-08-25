import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import EpicLinkDonePage from './page';
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

describe('Epic link popup landing page', () => {
  it('reports success when zos-api sends the buyer back clean', async () => {
    landOn('');
    render(<EpicLinkDonePage />);

    await waitFor(() => expect(postMessage).toHaveBeenCalled());
    expect(reported()).toEqual({ source: EPIC_POPUP_MESSAGE, status: 'success' });
    expect(close).toHaveBeenCalled();
  });

  it('reports needs-confirmation rather than failure when the link needs a warning', async () => {
    // zos-api sets both error and requiresConfirmation here. Treating it as a
    // plain failure would hide the fact that the buyer can still go ahead.
    landOn('?error=ACCOUNT_WOULD_BE_ORPHANED&requiresConfirmation=true&orphanedAccountId=u_1');
    render(<EpicLinkDonePage />);

    await waitFor(() => expect(postMessage).toHaveBeenCalled());
    expect(reported().status).toBe('needs-confirmation');
  });

  it('reports an error for any other failure', async () => {
    landOn('?error=link_failed');
    render(<EpicLinkDonePage />);

    await waitFor(() => expect(postMessage).toHaveBeenCalled());
    expect(reported().status).toBe('error');
  });

  it('targets our own origin so no other window can observe the outcome', async () => {
    landOn('');
    render(<EpicLinkDonePage />);

    await waitFor(() => expect(postMessage).toHaveBeenCalled());
    expect(postMessage.mock.calls[0][1]).toBe('http://localhost:3000');
  });

  it('does not throw when opened without an opener', async () => {
    vi.stubGlobal('location', { search: '', origin: 'http://localhost:3000' });
    vi.stubGlobal('opener', null);
    vi.stubGlobal('close', close);

    expect(() => render(<EpicLinkDonePage />)).not.toThrow();
    await waitFor(() => expect(close).toHaveBeenCalled());
  });
});
