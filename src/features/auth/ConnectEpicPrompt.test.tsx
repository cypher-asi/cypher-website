import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ConnectEpicPrompt } from './ConnectEpicPrompt';
import { EPIC_POPUP_MESSAGE } from './epicPopup';

const epic = { providerName: 'epic-games', providerId: 'p1', handle: 'player1' };

function respondWith(accounts: unknown[], ok = true) {
  return vi.fn(async () =>
    ok
      ? new Response(JSON.stringify({ accounts }), { status: 200 })
      : new Response('{}', { status: 502 }),
  );
}

/** The popup reporting back to the opener. */
function popupReports(status: string) {
  fireEvent(
    window,
    new MessageEvent('message', {
      data: { source: EPIC_POPUP_MESSAGE, status },
      origin: window.location.origin,
    }),
  );
}

const openPopup = () => screen.findByRole('button', { name: /Connect Epic Games/i });

let fakePopup: { closed: boolean; close: ReturnType<typeof vi.fn>; focus: ReturnType<typeof vi.fn> };
let open: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fakePopup = { closed: false, close: vi.fn(), focus: vi.fn() };
  open = vi.fn(() => fakePopup);
  vi.stubGlobal('open', open);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ConnectEpicPrompt', () => {
  it('stays hidden for a buyer whose Epic is already connected', async () => {
    vi.stubGlobal('fetch', respondWith([epic]));

    const { container } = render(<ConnectEpicPrompt />);

    expect(await screen.findByText(/Epic Games connected/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Connect Epic Games/i })).toBeNull();
    expect(container.textContent).toContain('player1');
  });

  it('prompts a buyer who signed up by email', async () => {
    vi.stubGlobal('fetch', respondWith([]));

    render(<ConnectEpicPrompt />);

    expect(await openPopup()).toBeInTheDocument();
  });

  it('shows nothing rather than guessing when the check fails', async () => {
    // Guessing "not linked" would ask someone to connect an account they
    // already have, on a screen that is otherwise good news.
    vi.stubGlobal('fetch', respondWith([], false));

    const { container } = render(<ConnectEpicPrompt />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('opens the handshake in a popup, leaving the receipt on screen', async () => {
    vi.stubGlobal('fetch', respondWith([]));

    render(<ConnectEpicPrompt />);
    fireEvent.click(await openPopup());

    expect(open).toHaveBeenCalledTimes(1);
    expect((open.mock.calls[0] as unknown as [string])[0]).toBe('/api/auth/epic-link/start');
    expect(await screen.findByRole('button', { name: /Waiting for Epic Games/i })).toBeDisabled();
  });

  it('re-reads the link and confirms once the popup reports success', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ accounts: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ accounts: [epic] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    render(<ConnectEpicPrompt />);
    fireEvent.click(await openPopup());
    popupReports('success');

    expect(await screen.findByText(/Epic Games connected/i)).toBeInTheDocument();
  });

  it('warns instead of failing when the Epic account is already in use', async () => {
    vi.stubGlobal('fetch', respondWith([]));

    render(<ConnectEpicPrompt />);
    fireEvent.click(await openPopup());
    popupReports('needs-confirmation');

    expect(await screen.findByText(/already in use/i)).toBeInTheDocument();
    // The wording must not overstate it: the check that raises this counts only
    // social logins and wallets, so an email-and-password account can trip it.
    expect(screen.getByText(/may be left with no way to sign in/i)).toBeInTheDocument();
  });

  it('re-runs with confirm once the buyer accepts the warning', async () => {
    vi.stubGlobal('fetch', respondWith([]));

    render(<ConnectEpicPrompt />);
    fireEvent.click(await openPopup());
    popupReports('needs-confirmation');

    fireEvent.click(await screen.findByRole('button', { name: /Connect anyway/i }));

    expect((open.mock.calls[1] as unknown as [string])[0]).toBe('/api/auth/epic-link/start?confirm=1');
  });

  it('lets the buyer back out of the warning', async () => {
    vi.stubGlobal('fetch', respondWith([]));

    render(<ConnectEpicPrompt />);
    fireEvent.click(await openPopup());
    popupReports('needs-confirmation');

    fireEvent.click(await screen.findByRole('button', { name: /Cancel/i }));

    expect(await openPopup()).toBeInTheDocument();
    expect(screen.queryByText(/already in use/i)).toBeNull();
  });

  it('surfaces a failed handshake', async () => {
    vi.stubGlobal('fetch', respondWith([]));

    render(<ConnectEpicPrompt />);
    fireEvent.click(await openPopup());
    popupReports('error');

    expect(await screen.findByText(/Could not connect your Epic account/i)).toBeInTheDocument();
  });
});
