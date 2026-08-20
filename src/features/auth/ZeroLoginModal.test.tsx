import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';

const h = vi.hoisted(() => ({
  mode: 'login' as 'login' | 'create',
  signUp: vi.fn(),
  openLogin: vi.fn(),
  openCreate: vi.fn(),
}));

vi.mock('./store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({
      isModalOpen: true,
      mode: h.mode,
      status: 'idle',
      error: null,
      closeLogin: vi.fn(),
      clearError: vi.fn(),
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

  it('shows email straight away on mobile, where Epic is unavailable', async () => {
    setUserAgent(MOBILE);
    render(<ZeroLoginModal />);

    // Epic is gated on mobile, so collapsing email too would leave no way in at all.
    await waitFor(() => expect(screen.getByPlaceholderText('you@email.com')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /with email instead/i })).not.toBeInTheDocument();
  });

  it('hides the Epic Games button on mobile', async () => {
    setUserAgent(MOBILE);
    render(<ZeroLoginModal />);
    await screen.findByText('Sign in');
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Continue with Epic Games/i })).not.toBeInTheDocument(),
    );
  });

  it('offers a create-account toggle that calls openCreate', () => {
    render(<ZeroLoginModal />);
    fireEvent.click(screen.getByRole('button', { name: /Create an account/i }));
    expect(h.openCreate).toHaveBeenCalledTimes(1);
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
