import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

type AuthUser = { zeroWalletAddress: string | null; handle: string | null } | null;
const authState = {
  user: null as AuthUser,
  openLogin: vi.fn(),
  openCreate: vi.fn(),
  disconnect: vi.fn(),
};
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (selector: (s: typeof authState) => unknown) => selector(authState),
}));

// Stripe Elements just renders its children here; the real card field has its own test.
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div data-testid="elements">{children}</div>,
}));
vi.mock('@/features/store/stripe-client', () => ({ getStripePromise: () => null }));

// Stand in for the payment form, surfacing the props it was handed + a way to fire onPaid.
vi.mock('@/features/store/StorePaymentForm', () => ({
  default: (props: { lines: unknown; totalCents: number; walletAddress: string; onPaid: () => void }) => (
    <div
      data-testid="payment-form"
      data-total={props.totalCents}
      data-wallet={props.walletAddress}
      data-lines={JSON.stringify(props.lines)}
    >
      <button type="button" onClick={props.onPaid}>
        fire onPaid
      </button>
    </div>
  ),
}));

import BagCheckout from './BagCheckout';

const LINES = [{ productId: 'jckt-1', variantId: 'red', quantity: 2 }];

beforeEach(() => {
  authState.user = null;
  authState.openLogin.mockReset();
  authState.openCreate.mockReset();
  authState.disconnect.mockReset();
});

describe('BagCheckout', () => {
  it('offers Connect and Create to a signed-out buyer, and no card form', () => {
    const onPaid = vi.fn();
    render(<BagCheckout lines={LINES} totalCents={500} onPaid={onPaid} />);

    expect(screen.queryByTestId('payment-form')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Connect/ }));
    expect(authState.openLogin).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /Create your account/i }));
    expect(authState.openCreate).toHaveBeenCalledTimes(1);
  });

  it('tells a wallet-less account why it cannot receive items, offering disconnect', () => {
    authState.user = { zeroWalletAddress: null, handle: 'player.wild' };
    render(<BagCheckout lines={LINES} totalCents={500} onPaid={vi.fn()} />);

    expect(screen.queryByTestId('payment-form')).not.toBeInTheDocument();
    expect(screen.getByText(/no wallet yet/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Disconnect/ }));
    expect(authState.disconnect).toHaveBeenCalledTimes(1);
  });

  it('shows the card form to a signed-in buyer with a wallet, handing it the bag + wallet + onPaid', () => {
    authState.user = { zeroWalletAddress: '0xBuyer', handle: 'player.wild' };
    const onPaid = vi.fn();
    render(<BagCheckout lines={LINES} totalCents={1234} onPaid={onPaid} />);

    const form = screen.getByTestId('payment-form');
    expect(form).toBeInTheDocument();
    expect(screen.getByTestId('elements')).toContainElement(form); // wrapped in <Elements>
    expect(form).toHaveAttribute('data-wallet', '0xBuyer');
    expect(form).toHaveAttribute('data-total', '1234');
    expect(JSON.parse(form.getAttribute('data-lines') ?? '[]')).toEqual(LINES);

    fireEvent.click(screen.getByRole('button', { name: /fire onPaid/ }));
    expect(onPaid).toHaveBeenCalledTimes(1);
  });
});
