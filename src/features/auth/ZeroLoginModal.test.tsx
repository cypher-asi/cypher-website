import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';

const h = vi.hoisted(() => ({
  mode: 'login' as 'login' | 'create',
  signUp: vi.fn(),
  openLogin: vi.fn(),
  openCreate: vi.fn(),
  openCreateWithNotice: vi.fn(),
  notice: null as string | null,
  error: null as string | null,
  // Hoisted so they keep identity across renders and can be asserted on. The
  // Epic popup path calls both on success.
  restore: vi.fn(async () => {}),
  closeLogin: vi.fn(),
}));

vi.mock('./store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({
      isModalOpen: true,
      mode: h.mode,
      status: 'idle',
      error: h.error,
      closeLogin: h.closeLogin,
      clearError: vi.fn(),
      restore: h.restore,
      notice: h.notice,
      openCreateWithNotice: h.openCreateWithNotice,
      requestCode: vi.fn(),
      verifyCode: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: h.signUp,
      openLogin: h.openLogin,
      openCreate: h.openCreate,
    }),
}));

import { ZeroLoginModal } from './ZeroLoginModal';

function setUserAgent(ua: string) {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
}

const DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120 Safari/537.36';

/** On desktop the email form sits behind Epic, so open it before using it. */
async function revealEmail() {
  fireEvent.click(await screen.findByRole('button', { name: /with email instead/i }));
}
const MOBILE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E Safari/604.1';

beforeEach(() => {
  h.mode = 'login';
  h.signUp.mockReset();
  h.openLogin.mockReset();
  h.openCreate.mockReset();
  h.openCreateWithNotice.mockReset();
  h.notice = null;
  h.error = null;
  h.restore.mockClear();
  h.closeLogin.mockClear();
  setUserAgent(DESKTOP);
});
afterEach(cleanup);

describe('ZeroLoginModal — login mode', () => {
  it('shows the Epic Games button on desktop', async () => {
    render(<ZeroLoginModal />);
    expect(await screen.findByRole('button', { name: /Continue with Epic Games/i })).toBeInTheDocument();
  });

  it('offers Epic alone, then the email form alone once asked for', async () => {
    render(<ZeroLoginModal />);

    // On open: Epic only. Email is not shown at all, so it cannot be picked by default.
    await screen.findByRole('button', { name: /Continue with Epic Games/i });
    expect(screen.queryByPlaceholderText('you@email.com')).not.toBeInTheDocument();

    await revealEmail();

    // Once the buyer has chosen email, Epic stops competing for the same decision.
    expect(screen.getByPlaceholderText('you@email.com')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continue with Epic Games/i })).not.toBeInTheDocument();
  });

  it('still offers Epic from the email form, for a player who took the wrong path', async () => {
    render(<ZeroLoginModal />);
    await revealEmail();

    // Above the form, so it is read before they start filling one in.
    const epicLink = screen.getByRole('button', { name: /Epic Games/i });
    const emailField = screen.getByPlaceholderText('you@email.com');
    expect(epicLink.compareDocumentPosition(emailField)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    // It returns to the Epic screen rather than navigating the page away.
    fireEvent.click(epicLink);
    expect(await screen.findByRole('button', { name: 'Continue with Epic Games' })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('you@email.com')).not.toBeInTheDocument();
  });

  it('leaves focus alone so the email field does not pull attention off Epic', async () => {
    render(<ZeroLoginModal />);
    await revealEmail();
    expect(screen.getByPlaceholderText('you@email.com')).not.toHaveFocus();
  });

  it('offers Epic on mobile too, where it used to be hidden', async () => {
    setUserAgent(MOBILE);
    render(<ZeroLoginModal />);

    // The old gate forced mobile players down the email path, which is exactly how
    // a second account gets made. The redirect was verified working on mobile.
    expect(await screen.findByRole('button', { name: /Continue with Epic Games/i })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('you@email.com')).not.toBeInTheDocument();

    // And email is still reachable, so a device where Epic did fail is not stuck.
    await revealEmail();
    expect(screen.getByPlaceholderText('you@email.com')).toBeInTheDocument();
  });

  it('offers a create-account toggle that calls openCreate', () => {
    render(<ZeroLoginModal />);
    fireEvent.click(screen.getByRole('button', { name: /Create an account/i }));
    expect(h.openCreate).toHaveBeenCalledTimes(1);
  });
});

describe('ZeroLoginModal — Epic runs in a popup', () => {
  // epicSignIn no-ops without a zos base URL, so the flow needs one to run.
  beforeEach(() => vi.stubEnv('NEXT_PUBLIC_ZOS_API_URL', 'https://zos.example'));
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    // Restored here, not inline, so a failing test can't leak mode into the next.
    h.mode = 'login';
  });

  const clickEpic = async () =>
    fireEvent.click(await screen.findByRole('button', { name: /Continue with Epic Games/i }));

  it('opens a popup and leaves the page underneath alone', async () => {
    const fakePopup = { closed: false, close: vi.fn(), focus: vi.fn() };
    const open = vi.fn(() => fakePopup);
    vi.stubGlobal('open', open);

    render(<ZeroLoginModal />);
    await clickEpic();

    // The whole point: the purchase page beneath is never navigated away from.
    expect(open).toHaveBeenCalledTimes(1);
    const [url, target] = open.mock.calls[0] as unknown as [string, string];
    expect(url).toContain('/api/oauth/epic-games/login');
    expect(url).toContain(encodeURIComponent('/oauth/callback?popup=1'));
    expect(target).toBe('zero-epic-auth');

    // And it says so, rather than looking like nothing happened.
    expect(screen.getByRole('button', { name: /Waiting for Epic Games/i })).toBeDisabled();
  });

  it('falls back to a full page redirect when the popup is blocked', async () => {
    vi.stubGlobal('open', vi.fn(() => null));
    // jsdom will not let location.assign be redefined, so swap the object.
    // unstubAllGlobals in afterEach puts the real one back.
    const assign = vi.fn();
    vi.stubGlobal('location', { origin: 'http://localhost:3000', assign });

    render(<ZeroLoginModal />);
    await clickEpic();

    // A blocked popup must not leave a button that silently does nothing.
    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1));
    const target = assign.mock.calls[0][0] as string;
    expect(target).toContain('/api/oauth/epic-games/login');
    expect(target).not.toContain('popup%3D1');
  });

  it('re-reads the session and closes once the popup reports success', async () => {
    const fakePopup = { closed: false, close: vi.fn(), focus: vi.fn() };
    vi.stubGlobal('open', vi.fn(() => fakePopup));

    render(<ZeroLoginModal />);
    await clickEpic();

    fireEvent(
      window,
      new MessageEvent('message', {
        data: { source: 'zero-epic-auth', status: 'success' },
        origin: window.location.origin,
      }),
    );

    // The cookie is already set by the popup's callback, so the opener only has
    // to pick up the session that is now there.
    await waitFor(() => expect(h.restore).toHaveBeenCalled());
    expect(h.closeLogin).toHaveBeenCalled();
    expect(fakePopup.close).toHaveBeenCalled();
  });

  it('surfaces a failure to load the account rather than looking idle', async () => {
    const fakePopup = { closed: false, close: vi.fn(), focus: vi.fn() };
    vi.stubGlobal('open', vi.fn(() => fakePopup));
    h.restore.mockRejectedValueOnce(new Error('network'));

    render(<ZeroLoginModal />);
    await clickEpic();

    fireEvent(
      window,
      new MessageEvent('message', {
        data: { source: 'zero-epic-auth', status: 'success' },
        origin: window.location.origin,
      }),
    );

    // Sign-in worked and the cookie is set, so the advice has to be recoverable.
    expect(await screen.findByText(/refresh the page/i)).toBeInTheDocument();
    expect(h.closeLogin).not.toHaveBeenCalled();
  });

  it('uses the create-or-login path in create mode', async () => {
    h.mode = 'create';
    const fakePopup = { closed: false, close: vi.fn(), focus: vi.fn() };
    const open = vi.fn(() => fakePopup);
    vi.stubGlobal('open', open);

    render(<ZeroLoginModal />);
    fireEvent.click(await screen.findByRole('button', { name: /Create with Epic Games/i }));

    // initiate findOrCreates the account; login would reject a new Epic user.
    const [url] = open.mock.calls[0] as unknown as [string];
    expect(url).toContain('/api/oauth/epic-games/initiate');
    expect(url).toContain(encodeURIComponent('/oauth/callback?popup=1'));
  });

  it('sends an Epic user with no account to create, rather than telling them to retry', async () => {
    const fakePopup = { closed: false, close: vi.fn(), focus: vi.fn() };
    vi.stubGlobal('open', vi.fn(() => fakePopup));

    render(<ZeroLoginModal />);
    await clickEpic();

    fireEvent(
      window,
      new MessageEvent('message', {
        data: { source: 'zero-epic-auth', status: 'no-account' },
        origin: window.location.origin,
      }),
    );

    // Nothing failed, so it must not read as a failure, and the modal has to
    // move to the path that can actually succeed.
    // Set on the store, not locally, so the full-page fallback renders it too.
    expect(h.openCreateWithNotice).toHaveBeenCalled();
    expect(h.openCreateWithNotice.mock.calls[0][0]).toMatch(/No Wilder World account is linked/i);
    expect(h.closeLogin).not.toHaveBeenCalled();
    expect(h.restore).not.toHaveBeenCalled();
    expect(screen.queryByText(/Could not finish signing in/i)).toBeNull();
  });

  it('shows a notice set by the full-page fallback, on the screen before email is revealed', async () => {
    // Regression: every store-error render site sits behind showEmail, which is
    // false by default, so a message set from outside the modal had nowhere to
    // appear and was silently swallowed.
    h.notice = 'No Wilder World account is linked to that Epic account yet.';
    h.mode = 'create';

    render(<ZeroLoginModal />);

    expect(await screen.findByText(/No Wilder World account is linked/i)).toBeInTheDocument();
  });

  it('shows a sign-in error on the screen before email is revealed', async () => {
    // Same latent problem as the notice: every error render site sat behind
    // showEmail, which is false by default, so a failed social sign-in set a
    // message nothing could display.
    h.error = 'Sign-in with Epic Games didn’t complete. Please try again.';

    render(<ZeroLoginModal />);

    expect(await screen.findByText(/didn’t complete/i)).toBeInTheDocument();
  });

  it('ignores a message from another origin', async () => {
    const fakePopup = { closed: false, close: vi.fn(), focus: vi.fn() };
    vi.stubGlobal('open', vi.fn(() => fakePopup));

    render(<ZeroLoginModal />);
    await clickEpic();

    fireEvent(
      window,
      new MessageEvent('message', {
        data: { source: 'zero-epic-auth', status: 'success' },
        origin: 'https://not-us.example',
      }),
    );

    // Anyone can postMessage us; only our own origin may end the handshake.
    await new Promise((r) => setTimeout(r, 20));
    expect(h.restore).not.toHaveBeenCalled();
    expect(h.closeLogin).not.toHaveBeenCalled();
  });
});

describe('ZeroLoginModal — create mode', () => {
  beforeEach(() => {
    h.mode = 'create';
  });

  it('offers Epic alone, then the create form alone once asked for', async () => {
    render(<ZeroLoginModal />);
    expect(screen.getByRole('heading', { name: /Create account/i })).toBeInTheDocument();

    // "Continue", not "Sign up": this path find-or-creates, so a player who already
    // has an account from the game is signed into it rather than given a second one.
    await screen.findByRole('button', { name: /Create with Epic Games/i });
    expect(screen.queryByRole('button', { name: 'Create account' })).not.toBeInTheDocument();

    await revealEmail();

    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
    // The Epic button itself stops competing (exact name), but a way back to it
    // remains, so choosing email is not a one-way door.
    expect(screen.queryByRole('button', { name: 'Create with Epic Games' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Create with Epic Games instead' }),
    ).toBeInTheDocument();
  });

  it('warns a player off creating a second account, and offers Epic from the warning', async () => {
    render(<ZeroLoginModal />);
    await revealEmail();

    // This is the last point where the second account can still be avoided, so the
    // warning has to name the consequence, not just mention Epic.
    expect(screen.getByText(/gives you a second one/i)).toBeInTheDocument();
    expect(screen.getByText(/not be on the account you play with/i)).toBeInTheDocument();

    // And it has to be actionable from there rather than sending them hunting.
    fireEvent.click(screen.getByRole('button', { name: /Use Epic Games instead/i }));
    expect(await screen.findByRole('button', { name: 'Create with Epic Games' })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('you@email.com')).not.toBeInTheDocument();
  });

  it('keeps submit disabled until name + matching passwords, then calls signUp', async () => {
    render(<ZeroLoginModal />);
    await revealEmail();
    const email = screen.getByPlaceholderText('you@email.com');
    const nameInput = document.querySelector('input[type="text"]') as HTMLInputElement;
    const passwords = document.querySelectorAll('input[type="password"]');
    const submit = screen.getByRole('button', { name: 'Create account' });

    fireEvent.change(email, { target: { value: 'a@b.com' } });
    fireEvent.change(passwords[0], { target: { value: 'secret1' } });
    fireEvent.change(passwords[1], { target: { value: 'secret1' } });
    // Still disabled without a display name.
    expect(submit).toBeDisabled();

    fireEvent.change(nameInput, { target: { value: 'Ada' } });
    expect(submit).not.toBeDisabled();

    // Mismatched passwords re-disable it.
    fireEvent.change(passwords[1], { target: { value: 'secret2' } });
    expect(submit).toBeDisabled();
    fireEvent.change(passwords[1], { target: { value: 'secret1' } });

    fireEvent.click(submit);
    expect(h.signUp).toHaveBeenCalledWith('a@b.com', 'secret1', 'Ada');
  });

  it('toggles back to sign in via openLogin', () => {
    render(<ZeroLoginModal />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(h.openLogin).toHaveBeenCalledTimes(1);
  });
});
