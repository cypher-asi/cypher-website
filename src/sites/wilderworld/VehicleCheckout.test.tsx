import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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

// Stub Stripe Elements so step 2 renders without a real Stripe context.
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

describe('VehicleCheckout — account step auth', () => {
  it('signed out: Create account opens the create modal, Log in opens login', () => {
    render(<VehicleCheckout pass={pass} />);
    fireEvent.click(screen.getByRole('button', { name: /Create account/i }));
    expect(h.openCreate).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(h.openLogin).toHaveBeenCalledTimes(1);
  });

  it('signed in with a wallet: shows it, payment is reachable, Disconnect ends the session', () => {
    h.user = { id: 'u1', zeroWalletAddress: '0x1234567890abcdef1234567890abcdef12345678', handle: null };
    render(<VehicleCheckout pass={pass} />);
    expect(screen.getByText('0x1234…5678')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue to payment/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    expect(h.disconnect).toHaveBeenCalledTimes(1);
  });

  it('signed in without a wallet: blocks payment and shows the no-wallet notice', () => {
    h.user = { id: 'u1', zeroWalletAddress: null, handle: 'wilder.zero' };
    render(<VehicleCheckout pass={pass} />);
    expect(screen.getByText('wilder.zero')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continue to payment/i })).not.toBeInTheDocument();
    expect(screen.getByText(/no wallet yet/i)).toBeInTheDocument();
  });

  it('Continue to payment advances to the Stripe payment form', async () => {
    h.user = { id: 'u1', zeroWalletAddress: '0x1234567890abcdef1234567890abcdef12345678', handle: null };
    render(<VehicleCheckout pass={pass} />);
    fireEvent.click(screen.getByRole('button', { name: /Continue to payment/i }));
    expect(await screen.findByTestId('card-element')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pay \$19/ })).toBeInTheDocument();
  });
});
