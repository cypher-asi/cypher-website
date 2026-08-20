import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// Mutable auth state shared with the mocked store, varied per test.
const h = vi.hoisted(() => ({
  user: null as null | { id: string; zeroWalletAddress: string | null; handle: string | null },
  openLogin: vi.fn(),
  openCreate: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock('@/features/auth/store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ user: h.user, openLogin: h.openLogin, openCreate: h.openCreate, disconnect: h.disconnect }),
}));

// Stub Stripe Elements so the payment panel renders without a real Stripe context.
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useStripe: () => ({}),
  useElements: () => ({ getElement: () => ({}) }),
  CardElement: () => <div data-testid="card-element" />,
}));

import VehicleCheckout from './VehicleCheckout';
import { VEHICLE_PASSES } from './vehicles';

const pass = VEHICLE_PASSES[0];

beforeEach(() => {
  h.user = null;
  h.openLogin.mockReset();
  h.openCreate.mockReset();
  h.disconnect.mockReset();
  // The payment form loads saved cards on mount; return none by default.
  global.fetch = vi.fn(async () => new Response(JSON.stringify({ cards: [] }), { status: 200 })) as typeof fetch;
});

describe('VehicleCheckout — the panel follows the session', () => {
  it('signed out: Create account opens the create modal, Log in opens login', () => {
    render(<VehicleCheckout pass={pass} />);
    fireEvent.click(screen.getByRole('button', { name: /Create your account here/i }));
    expect(h.openCreate).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /Connect/i }));
    expect(h.openLogin).toHaveBeenCalledTimes(1);
  });

  it('signed out: shows the account panel, not payment', () => {
    render(<VehicleCheckout pass={pass} />);
    expect(screen.getByRole('heading', { name: /Sign in to checkout/i })).toBeInTheDocument();
    // Each option says who it is for, so a returning player is steered to Log in
    // rather than quietly creating a second account.
    expect(screen.getByText(/Already play Wilder World or have a ZERO account\?/i)).toBeInTheDocument();
    expect(screen.queryByTestId('card-element')).not.toBeInTheDocument();
  });

  it('signed in with a wallet: goes straight to payment, with no step to advance', async () => {
    h.user = { id: 'u1', zeroWalletAddress: '0x1234567890abcdef1234567890abcdef12345678', handle: null };
    render(<VehicleCheckout pass={pass} />);

    expect(await screen.findByTestId('card-element')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pay \$19/ })).toBeInTheDocument();
    expect(screen.getByText(/Delivering to 0x1234…5678/)).toBeInTheDocument();
    // The interstitial step is gone entirely.
    expect(screen.queryByRole('button', { name: /Continue to payment/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Back to account/i })).not.toBeInTheDocument();
  });

  it('signed in without a wallet: blocks payment and shows the no-wallet notice', () => {
    h.user = { id: 'u1', zeroWalletAddress: null, handle: 'wilder.zero' };
    render(<VehicleCheckout pass={pass} />);
    expect(screen.getByText('wilder.zero')).toBeInTheDocument();
    expect(screen.queryByTestId('card-element')).not.toBeInTheDocument();
    expect(screen.getByText(/no wallet yet/i)).toBeInTheDocument();
  });

  it('offers a way back to the store from every state', async () => {
    const backToStore = () =>
      screen.getByRole('link', { name: /Back to store/i }).getAttribute('href');

    render(<VehicleCheckout pass={pass} />); // signed out
    expect(backToStore()).toBe('/vehicles');
    cleanup();

    h.user = { id: 'u1', zeroWalletAddress: null, handle: 'wilder.zero' }; // no wallet
    render(<VehicleCheckout pass={pass} />);
    expect(backToStore()).toBe('/vehicles');
    cleanup();

    h.user = { id: 'u1', zeroWalletAddress: '0x1234567890abcdef1234567890abcdef12345678', handle: null };
    render(<VehicleCheckout pass={pass} />); // paying
    await screen.findByTestId('card-element');
    expect(backToStore()).toBe('/vehicles');
  });

  it('signed in without a wallet: Disconnect ends the session', () => {
    h.user = { id: 'u1', zeroWalletAddress: null, handle: 'wilder.zero' };
    render(<VehicleCheckout pass={pass} />);
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    expect(h.disconnect).toHaveBeenCalledTimes(1);
  });
});
