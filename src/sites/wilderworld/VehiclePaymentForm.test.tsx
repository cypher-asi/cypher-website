import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const stripeMock = { createPaymentMethod: vi.fn() };
const elementsMock = { getElement: vi.fn(() => ({})) };
vi.mock('@stripe/react-stripe-js', () => ({
  useStripe: () => stripeMock,
  useElements: () => elementsMock,
  CardElement: () => <div data-testid="card-element" />,
}));

import VehiclePaymentForm from './VehiclePaymentForm';
import { VEHICLE_PASSES } from './vehicles';

const pass = VEHICLE_PASSES[0]; // Radeon Ghostline, $19

const SAVED = { id: 'pm_saved', brand: 'visa', last4: '3112', expMonth: 3, expYear: 2031 };

/** Route the mount GET (saved cards) and the checkout POST independently. */
function mockFetch({ checkout, cards = [] }: { checkout?: { body: unknown; status?: number }; cards?: unknown[] }) {
  global.fetch = vi.fn(async (url: RequestInfo | URL) => {
    if (String(url).includes('/payment-methods')) {
      return new Response(JSON.stringify({ cards }), { status: 200 });
    }
    return new Response(JSON.stringify(checkout?.body ?? {}), { status: checkout?.status ?? 200 });
  }) as typeof fetch;
}

function checkoutCall() {
  return (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(([u]) => String(u).includes('/checkout'));
}

function renderForm(wallet: string | null = '0x1234567890abcdef1234567890abcdef12345678') {
  return render(<VehiclePaymentForm pass={pass} walletAddress={wallet} />);
}

function fillEmail(value = 'buyer@example.com') {
  fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value } });
}

beforeEach(() => {
  stripeMock.createPaymentMethod.mockReset().mockResolvedValue({ paymentMethod: { id: 'pm_1' } });
  elementsMock.getElement.mockReturnValue({});
});

afterEach(() => vi.restoreAllMocks());

describe('VehiclePaymentForm', () => {
  it('tells the buyer the payment options are loading, and stops once they arrive', async () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch; // never settles
    renderForm();
    expect(screen.getByText(/Loading payment options/i)).toBeInTheDocument();

    cleanup();
    mockFetch({ cards: [] });
    renderForm();
    await screen.findByTestId('card-element');
    expect(screen.queryByText(/Loading payment options/i)).not.toBeInTheDocument();
  });

  it('renders the card field, delivering line, and Pay button (no saved cards)', async () => {
    mockFetch({ cards: [] });
    renderForm();
    expect(await screen.findByTestId('card-element')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByText(/payment receipt is sent/i)).toBeInTheDocument();
    expect(screen.getByText(/Delivering to 0x1234…5678/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pay \$19/ })).toBeInTheDocument();
  });

  it('tokenizes a new card, posts passId + paymentMethodId + savedCard:false + email, shows delivered', async () => {
    mockFetch({ cards: [], checkout: { body: { status: 'delivered', transactionHash: '0xTX' } } });
    renderForm();
    await screen.findByTestId('card-element');
    fillEmail();
    fireEvent.click(screen.getByRole('button', { name: /Pay \$19/ }));

    await waitFor(() => expect(screen.getByText(/on its way to your wallet/i)).toBeInTheDocument());
    expect(stripeMock.createPaymentMethod).toHaveBeenCalledWith({ type: 'card', card: expect.anything() });
    // The delivered panel links the on-chain tx on zscan.
    expect(screen.getByRole('link', { name: /View transaction on zscan/i })).toHaveAttribute(
      'href',
      'https://zscan.live/tx/0xTX',
    );
    const init = checkoutCall()![1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({
      passId: 'ghostline',
      paymentMethodId: 'pm_1',
      savedCard: false,
      email: 'buyer@example.com',
    });
  });

  it('blocks checkout until a valid receipt email is entered', async () => {
    mockFetch({ cards: [], checkout: { body: { status: 'delivered' } } });
    renderForm();
    fillEmail('not-an-email');
    fireEvent.click(await screen.findByRole('button', { name: /Pay \$19/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/valid email/i));
    expect(checkoutCall()).toBeUndefined();
    expect(stripeMock.createPaymentMethod).not.toHaveBeenCalled();
  });

  it('prefills the saved card and reuses it (savedCard:true, no tokenization)', async () => {
    mockFetch({ cards: [SAVED], checkout: { body: { status: 'delivered', transactionHash: '0xTX' } } });
    renderForm();
    expect(await screen.findByText(/Visa\b.*3112/)).toBeInTheDocument();
    expect(screen.queryByTestId('card-element')).not.toBeInTheDocument();

    fillEmail();
    fireEvent.click(screen.getByRole('button', { name: /Pay \$19/ }));

    await waitFor(() => expect(screen.getByText(/on its way to your wallet/i)).toBeInTheDocument());
    expect(stripeMock.createPaymentMethod).not.toHaveBeenCalled(); // saved card is reused as-is
    const init = checkoutCall()![1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({
      passId: 'ghostline',
      paymentMethodId: 'pm_saved',
      savedCard: true,
      email: 'buyer@example.com',
    });
  });

  it('"Use a different card" reveals the card field to enter a new one', async () => {
    mockFetch({ cards: [SAVED] });
    renderForm();
    fireEvent.click(await screen.findByRole('button', { name: /Use a different card/i }));
    expect(await screen.findByTestId('card-element')).toBeInTheDocument();
  });

  it('shows the pending state on a 202', async () => {
    mockFetch({ cards: [], checkout: { body: { status: 'pending', message: 'on its way' }, status: 202 } });
    renderForm();
    await screen.findByTestId('card-element');
    fillEmail();
    fireEvent.click(screen.getByRole('button', { name: /Pay \$19/ }));
    await waitFor(() => expect(screen.getByText(/Payment received/i)).toBeInTheDocument());
  });

  it('shows the server error message on a failed charge', async () => {
    mockFetch({ cards: [], checkout: { body: { error: 'Your card was declined.' }, status: 402 } });
    renderForm();
    await screen.findByTestId('card-element');
    fillEmail();
    fireEvent.click(screen.getByRole('button', { name: /Pay \$19/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Your card was declined.'));
  });

  it('surfaces a card tokenization error without calling checkout', async () => {
    stripeMock.createPaymentMethod.mockResolvedValueOnce({ error: { message: 'Invalid card number.' } });
    mockFetch({ cards: [] });
    renderForm();
    await screen.findByTestId('card-element');
    fillEmail();
    fireEvent.click(screen.getByRole('button', { name: /Pay \$19/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Invalid card number.'));
    expect(checkoutCall()).toBeUndefined();
  });

  it('offers no way back to a separate account step', async () => {
    mockFetch({ cards: [] });
    renderForm();
    await screen.findByRole('button', { name: /Pay \$19/ });
    expect(screen.queryByRole('button', { name: /Back to account/i })).not.toBeInTheDocument();
  });
});
