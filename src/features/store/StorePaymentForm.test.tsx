import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const stripeMock = { createPaymentMethod: vi.fn() };
const elementsMock = { getElement: vi.fn(() => ({})) };
vi.mock('@stripe/react-stripe-js', () => ({
  useStripe: () => stripeMock,
  useElements: () => elementsMock,
  CardElement: () => <div data-testid="card-element" />,
}));

// The identity panel has its own test and its own hooks (auth store, Epic link
// status); stub it so this test stays about the payment form's own behaviour and
// does not depend on those. It still proves the form hands it the right wallet.
vi.mock('@/features/auth/CheckoutIdentity', () => ({
  CheckoutIdentity: ({ walletAddress }: { walletAddress: string | null }) => (
    <div data-testid="identity">{walletAddress}</div>
  ),
}));

import StorePaymentForm from './StorePaymentForm';

const WALLET = '0x1234567890abcdef1234567890abcdef12345678';
const SAVED = { id: 'pm_saved', brand: 'visa', last4: '3112', expMonth: 3, expYear: 2031 };
const LINES = [{ productId: 'jckt-1', variantId: 'red', quantity: 2 }];

/** Route the mount GET (saved cards) and the checkout POST independently. */
function mockFetch({
  checkout,
  cards = [],
  email = null,
}: {
  checkout?: { body: unknown; status?: number };
  cards?: unknown[];
  email?: string | null;
}) {
  global.fetch = vi.fn(async (url: RequestInfo | URL) => {
    if (String(url).includes('/payment-methods')) {
      return new Response(JSON.stringify({ cards, email }), { status: 200 });
    }
    return new Response(JSON.stringify(checkout?.body ?? {}), { status: checkout?.status ?? 200 });
  }) as typeof fetch;
}

function checkoutCall() {
  return (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(([u]) => String(u).includes('/checkout'));
}

function renderForm(props: Partial<Parameters<typeof StorePaymentForm>[0]> = {}) {
  const onPaid = vi.fn();
  render(<StorePaymentForm lines={LINES} totalCents={500} walletAddress={WALLET} onPaid={onPaid} {...props} />);
  return { onPaid };
}

function fillEmail(value = 'buyer@example.com') {
  fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value } });
}

beforeEach(() => {
  stripeMock.createPaymentMethod.mockReset().mockResolvedValue({ paymentMethod: { id: 'pm_1' } });
  elementsMock.getElement.mockReturnValue({});
});

afterEach(() => vi.restoreAllMocks());

describe('StorePaymentForm', () => {
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

  it('prefills the receipt email when one is on file, ready to pay without typing', async () => {
    mockFetch({ cards: [], email: 'buyer@example.com', checkout: { body: { status: 'paid' } } });
    renderForm();

    await screen.findByTestId('card-element');
    expect(screen.getByPlaceholderText('you@example.com')).toHaveValue('buyer@example.com');

    fireEvent.click(screen.getByRole('button', { name: /Pay \$5/ }));
    await waitFor(() => expect(checkoutCall()).toBeDefined());
    const init = checkoutCall()![1] as RequestInit;
    expect(JSON.parse(init.body as string).email).toBe('buyer@example.com');
  });

  it('leaves the email empty when none is on file', async () => {
    mockFetch({ cards: [], email: null });
    renderForm();
    await screen.findByTestId('card-element');
    expect(screen.getByPlaceholderText('you@example.com')).toHaveValue('');
  });

  it('never overwrites an email the buyer typed while the prefill was in flight', async () => {
    let release: (r: Response) => void = () => {};
    global.fetch = vi.fn(
      async (url: RequestInfo | URL) =>
        String(url).includes('/payment-methods')
          ? new Promise<Response>((resolve) => {
              release = resolve;
            })
          : new Response('{}', { status: 200 }),
    ) as typeof fetch;

    renderForm();
    fillEmail('typed@example.com');
    release(new Response(JSON.stringify({ cards: [], email: 'onfile@example.com' }), { status: 200 }));

    await screen.findByTestId('card-element');
    expect(screen.getByPlaceholderText('you@example.com')).toHaveValue('typed@example.com');
  });

  it('holds the whole form while the prefill is in flight, then releases it', async () => {
    let release: (r: Response) => void = () => {};
    global.fetch = vi.fn(
      async () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
    ) as typeof fetch;

    renderForm();
    expect(screen.getByPlaceholderText('you@example.com')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Pay \$5/ })).toBeDisabled();

    release(new Response(JSON.stringify({ cards: [], email: null }), { status: 200 }));

    await screen.findByTestId('card-element');
    expect(screen.getByPlaceholderText('you@example.com')).toBeEnabled();
    expect(screen.getByRole('button', { name: /Pay \$5/ })).toBeEnabled();
  });

  it('renders the card field, receipt hint, identity, and Pay button (no saved cards)', async () => {
    mockFetch({ cards: [] });
    renderForm();
    expect(await screen.findByTestId('card-element')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByText(/payment receipt is sent/i)).toBeInTheDocument();
    // The form hands the destination wallet to the identity panel, unchanged.
    expect(screen.getByTestId('identity')).toHaveTextContent(WALLET);
    // The Pay button shows the bag total passed in, not a per-line price.
    expect(screen.getByRole('button', { name: /Pay \$5/ })).toBeInTheDocument();
  });

  it('tokenizes a new card, posts the bag + paymentMethodId + savedCard:false + email, then reports paid', async () => {
    mockFetch({ cards: [], checkout: { body: { status: 'paid', paymentIntentId: 'pi_1', amountCents: 500 } } });
    const { onPaid } = renderForm();
    await screen.findByTestId('card-element');
    fillEmail();
    fireEvent.click(screen.getByRole('button', { name: /Pay \$5/ }));

    await waitFor(() => expect(onPaid).toHaveBeenCalledTimes(1));
    expect(stripeMock.createPaymentMethod).toHaveBeenCalledWith({ type: 'card', card: expect.anything() });
    const init = checkoutCall()![1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({
      lines: LINES,
      paymentMethodId: 'pm_1',
      savedCard: false,
      email: 'buyer@example.com',
    });
  });

  it('blocks checkout until a valid receipt email is entered', async () => {
    mockFetch({ cards: [], checkout: { body: { status: 'paid' } } });
    renderForm();
    fillEmail('not-an-email');
    fireEvent.click(await screen.findByRole('button', { name: /Pay \$5/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/valid email/i));
    expect(checkoutCall()).toBeUndefined();
    expect(stripeMock.createPaymentMethod).not.toHaveBeenCalled();
  });

  it('prefills the saved card and reuses it (savedCard:true, no tokenization)', async () => {
    mockFetch({ cards: [SAVED], checkout: { body: { status: 'paid' } } });
    const { onPaid } = renderForm();
    expect(await screen.findByText(/Visa\b.*3112/)).toBeInTheDocument();
    expect(screen.queryByTestId('card-element')).not.toBeInTheDocument();

    fillEmail();
    fireEvent.click(screen.getByRole('button', { name: /Pay \$5/ }));

    await waitFor(() => expect(onPaid).toHaveBeenCalledTimes(1));
    expect(stripeMock.createPaymentMethod).not.toHaveBeenCalled();
    const init = checkoutCall()![1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({
      lines: LINES,
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

  it('shows the server error message on a failed charge, and stays retryable', async () => {
    mockFetch({ cards: [], checkout: { body: { error: 'Your card was declined.' }, status: 402 } });
    renderForm();
    await screen.findByTestId('card-element');
    fillEmail();
    fireEvent.click(screen.getByRole('button', { name: /Pay \$5/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Your card was declined.'));
    expect(screen.getByRole('button', { name: /Pay \$5/ })).toBeEnabled();
  });

  it('surfaces a card tokenization error without calling checkout', async () => {
    stripeMock.createPaymentMethod.mockResolvedValueOnce({ error: { message: 'Invalid card number.' } });
    mockFetch({ cards: [] });
    renderForm();
    await screen.findByTestId('card-element');
    fillEmail();
    fireEvent.click(screen.getByRole('button', { name: /Pay \$5/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Invalid card number.'));
    expect(checkoutCall()).toBeUndefined();
  });

  it('offers Cancel before paying, and withdraws it once a payment is in flight', async () => {
    const onCancel = vi.fn();
    let release: (r: Response) => void = () => {};
    global.fetch = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes('/payment-methods')) {
        return new Response(JSON.stringify({ cards: [], email: null }), { status: 200 });
      }
      return new Promise<Response>((resolve) => {
        release = resolve;
      });
    }) as typeof fetch;

    const { onPaid } = renderForm({ onCancel });
    await screen.findByTestId('card-element');
    // Available while idle, and it collapses the panel.
    expect(screen.getByRole('button', { name: /^Cancel$/ })).toBeInTheDocument();

    fillEmail();
    fireEvent.click(screen.getByRole('button', { name: /Pay \$5/ }));
    // Once processing, there is no Cancel to abandon an in-flight charge.
    await screen.findByText(/Taking payment/i);
    expect(screen.queryByRole('button', { name: /^Cancel$/ })).not.toBeInTheDocument();

    release(new Response(JSON.stringify({ status: 'paid' }), { status: 200 }));
    // The charge resolved and the surrounding flow takes over; still no Cancel here.
    await waitFor(() => expect(onPaid).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('button', { name: /^Cancel$/ })).not.toBeInTheDocument();
  });

  it('calls onCancel when the buyer backs out before paying', async () => {
    const onCancel = vi.fn();
    mockFetch({ cards: [] });
    renderForm({ onCancel });
    await screen.findByTestId('card-element');
    fireEvent.click(screen.getByRole('button', { name: /^Cancel$/ }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('passes the delivery outcome from the response to onPaid', async () => {
    mockFetch({ cards: [], checkout: { body: { status: 'paid', delivery: 'refunded' } } });
    const { onPaid } = renderForm();
    await screen.findByTestId('card-element');
    fillEmail();
    fireEvent.click(screen.getByRole('button', { name: /Pay \$5/ }));
    await waitFor(() => expect(onPaid).toHaveBeenCalledWith('refunded'));
  });

  it('defaults the delivery outcome to undelivered when the response omits it', async () => {
    mockFetch({ cards: [], checkout: { body: { status: 'paid' } } });
    const { onPaid } = renderForm();
    await screen.findByTestId('card-element');
    fillEmail();
    fireEvent.click(screen.getByRole('button', { name: /Pay \$5/ }));
    await waitFor(() => expect(onPaid).toHaveBeenCalledWith('undelivered'));
  });

  it('reports a successful charge via onPaid and renders no confirmation of its own', async () => {
    mockFetch({ cards: [], checkout: { body: { status: 'paid' } } });
    const { onPaid } = renderForm();
    await screen.findByTestId('card-element');
    fillEmail();
    fireEvent.click(screen.getByRole('button', { name: /Pay \$5/ }));

    await waitFor(() => expect(onPaid).toHaveBeenCalledTimes(1));
    // The surrounding flow owns the confirmation; the form shows none itself.
    expect(screen.queryByRole('heading', { name: /Payment received/i })).not.toBeInTheDocument();
  });
});
