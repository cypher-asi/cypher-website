import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { EpicCheckoutNotice } from './EpicCheckoutNotice';

const epic = { providerName: 'epic-games', providerId: 'p1', handle: 'player1' };

function respondWith(accounts: unknown[], ok = true) {
  return vi.fn(
    async () =>
      new Response(ok ? JSON.stringify({ accounts }) : '{}', { status: ok ? 200 : 502 }),
  );
}

const notice = () => screen.queryByText(/Already play Wilder World/i);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('EpicCheckoutNotice', () => {
  it('warns a buyer whose account has no Epic connected, before they pay', async () => {
    vi.stubGlobal('fetch', respondWith([]));

    render(<EpicCheckoutNotice />);

    // The fix is only free before delivery, so this has to say what to do now.
    expect(await screen.findByText(/sign back in with Epic Games first/i)).toBeInTheDocument();
  });

  it('says nothing to a buyer who is already connected', async () => {
    vi.stubGlobal('fetch', respondWith([epic]));

    const { container } = render(<EpicCheckoutNotice />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(notice()).toBeNull();
  });

  it('says nothing while the check is still in flight', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));

    const { container } = render(<EpicCheckoutNotice />);

    // Appearing late, mid-purchase, would be worse than not appearing.
    expect(container).toBeEmptyDOMElement();
  });

  it('says nothing when the check fails rather than guessing', async () => {
    vi.stubGlobal('fetch', respondWith([], false));

    const { container } = render(<EpicCheckoutNotice />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('adds no button or control between the buyer and paying', async () => {
    vi.stubGlobal('fetch', respondWith([]));

    render(<EpicCheckoutNotice />);
    await screen.findByText(/Already play Wilder World/i);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
