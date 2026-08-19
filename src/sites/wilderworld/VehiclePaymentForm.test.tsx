import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

// The real payment path is the default under test; the demo walkthrough is opted
// into per-test, so shipping it on never silently hides the flow it stands in for.
const demo = vi.hoisted(() => ({ isDemoCheckout: vi.fn(() => false) }));
vi.mock('@/features/vehicles/demo-checkout', () => demo);

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

function renderForm(wallet: string | null = '0x1234567890abcdef1234567890abcdef12345678') {
  return render(<VehiclePaymentForm pass={pass} walletAddress={wallet} />);
}

function fillEmail(value = 'buyer@example.com') {
  fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value } });
}

beforeEach(() => {
  stripeMock.createPaymentMethod.mockReset().mockResolvedValue({ paymentMethod: { id: 'pm_1' } });
  elementsMock.getElement.mockReturnValue({});
  demo.isDemoCheckout.mockReturnValue(false);
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

  it('prefills the receipt email when one is on file, ready to pay without typing', async () => {
    mockFetch({ cards: [], email: 'buyer@example.com', checkout: { body: { status: 'delivered' } } });
    renderForm();

    await screen.findByTestId('card-element');
    expect(screen.getByPlaceholderText('you@example.com')).toHaveValue('buyer@example.com');

    // The prefilled value is what actually gets charged, with nothing typed.
    fireEvent.click(screen.getByRole('button', { name: /Pay \$19/ }));
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
    // Nothing is usable yet: the email is about to be filled in for them, and the
    // Pay button is disabled, so neither should invite interaction.
    expect(screen.getByPlaceholderText('you@example.com')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Pay \$19/ })).toBeDisabled();

    release(new Response(JSON.stringify({ cards: [], email: null }), { status: 200 }));

    await screen.findByTestId('card-element');
    expect(screen.getByPlaceholderText('you@example.com')).toBeEnabled();
    expect(screen.getByRole('button', { name: /Pay \$19/ })).toBeEnabled();
  });

  describe('while the checkout is demonstrated rather than transacted', () => {
    beforeEach(() => demo.isDemoCheckout.mockReturnValue(true));

    it('reaches the delivered screen without charging or minting', async () => {
      mockFetch({ cards: [] });
      renderForm();
      await screen.findByTestId('card-element');
      fillEmail();

      fireEvent.click(screen.getByRole('button', { name: /Pay \$19/ }));

      // It passes through the same waiting state a real purchase shows...
      await waitFor(() => expect(screen.getByRole('button', { name: /Processing/ })).toBeInTheDocument());
      // ...and lands on delivered, with nothing charged, minted, or linked.
      await waitFor(() => expect(screen.getByRole('heading', { name: /Purchase complete/i })).toBeInTheDocument(), {
        timeout: 4000,
      });
      expect(checkoutCall()).toBeUndefined();
      expect(stripeMock.createPaymentMethod).not.toHaveBeenCalled();
      // The explorer link is shown in its real position so the panel is reviewed
      // whole, though it points at nothing — there was no transaction.
      expect(screen.getByRole('link', { name: /View transaction on zscan/i })).toBeInTheDocument();
    });

    it('still requires a valid receipt email, so that step is demonstrated too', async () => {
      mockFetch({ cards: [] });
      renderForm();
      await screen.findByTestId('card-element');
      fillEmail('not-an-email');

      fireEvent.click(screen.getByRole('button', { name: /Pay \$19/ }));

      await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/valid email/i));
      expect(screen.queryByRole('heading', { name: /Purchase complete/i })).not.toBeInTheDocument();
    });

    it('can be paid without Stripe having loaded, as an unkeyed environment has', async () => {
      stripeMock.createPaymentMethod.mockReset();
      mockFetch({ cards: [] });
      renderForm();
      await screen.findByTestId('card-element');
      fillEmail();

      expect(screen.getByRole('button', { name: /Pay \$19/ })).toBeEnabled();
    });
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

    await waitFor(() => expect(screen.getByRole('heading', { name: /Purchase complete/i })).toBeInTheDocument());
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

  it('confirms the purchase with what was bought, where it went, and a way onward', async () => {
    mockFetch({ cards: [], checkout: { body: { status: 'delivered', transactionHash: '0xTX' } } });
    renderForm();
    await screen.findByTestId('card-element');
    fillEmail();
    fireEvent.click(screen.getByRole('button', { name: /Pay \$19/ }));

    await waitFor(() => expect(screen.getByRole('heading', { name: /Purchase complete/i })).toBeInTheDocument());
    // Where it went, so the buyer can find it.
    expect(screen.getByText(/on its way to your ZERO wallet \(0x1234…5678\)/i)).toBeInTheDocument();
    // What the pass carries, restated now that it is owned.
    for (const line of pass.contents) {
      expect(screen.getByText(line)).toBeInTheDocument();
    }
    // Proof on chain, and somewhere to go next.
    expect(screen.getByRole('link', { name: /View transaction on zscan/i })).toHaveAttribute(
      'href',
      'https://zscan.live/tx/0xTX',
    );
    expect(screen.getByRole('link', { name: /Back to store/i })).toHaveAttribute('href', '/vehicles');
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

    await waitFor(() => expect(screen.getByRole('heading', { name: /Purchase complete/i })).toBeInTheDocument());
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
