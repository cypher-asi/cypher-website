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

  it('shows the ZERO create form and an Epic sign-up option', async () => {
    render(<ZeroLoginModal />);
    expect(screen.getByRole('heading', { name: /Create your ZERO account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Sign up with Epic Games/i })).toBeInTheDocument();
  });

  it('keeps submit disabled until the passwords match, then calls signUp', () => {
    render(<ZeroLoginModal />);
    const email = screen.getByPlaceholderText('you@email.com');
    const passwords = document.querySelectorAll('input[type="password"]');
    const submit = screen.getByRole('button', { name: 'Create account' });

    fireEvent.change(email, { target: { value: 'a@b.com' } });
    fireEvent.change(passwords[0], { target: { value: 'secret1' } });
    fireEvent.change(passwords[1], { target: { value: 'secret2' } });
    expect(submit).toBeDisabled();

    fireEvent.change(passwords[1], { target: { value: 'secret1' } });
    expect(submit).not.toBeDisabled();

    fireEvent.click(submit);
    expect(h.signUp).toHaveBeenCalledWith('a@b.com', 'secret1');
  });

  it('toggles back to sign in via openLogin', () => {
    render(<ZeroLoginModal />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(h.openLogin).toHaveBeenCalledTimes(1);
  });
});
