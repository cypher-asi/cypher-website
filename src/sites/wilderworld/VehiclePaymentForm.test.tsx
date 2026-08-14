import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

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
const onBack = vi.fn();

function fetchReturning(bodyObj: unknown, status = 200) {
  global.fetch = vi.fn(async () => new Response(JSON.stringify(bodyObj), { status })) as typeof fetch;
}

function renderForm(wallet: string | null = '0x1234567890abcdef1234567890abcdef12345678') {
  return render(<VehiclePaymentForm pass={pass} walletAddress={wallet} onBack={onBack} />);
}

beforeEach(() => {
  stripeMock.createPaymentMethod.mockReset().mockResolvedValue({ paymentMethod: { id: 'pm_1' } });
  elementsMock.getElement.mockReturnValue({});
  onBack.mockReset();
});

afterEach(() => vi.restoreAllMocks());

describe('VehiclePaymentForm', () => {
  it('renders the card field, delivering line, and Pay button', () => {
    renderForm();
    expect(screen.getByTestId('card-element')).toBeInTheDocument();
    expect(screen.getByText(/Delivering to 0x1234…5678/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pay \$19/ })).toBeInTheDocument();
  });

  it('tokenizes the card, posts passId + paymentMethodId, then shows delivered', async () => {
    fetchReturning({ status: 'delivered', transactionHash: '0xTX' });
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /Pay \$19/ }));

    await waitFor(() => expect(screen.getByText(/on its way to your wallet/i)).toBeInTheDocument());
    expect(stripeMock.createPaymentMethod).toHaveBeenCalledWith({ type: 'card', card: expect.anything() });
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('/api/vehicles/checkout');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      passId: 'ghostline',
      paymentMethodId: 'pm_1',
    });
  });

  it('shows the pending state on a 202', async () => {
    fetchReturning({ status: 'pending', message: 'on its way' }, 202);
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /Pay \$19/ }));
    await waitFor(() => expect(screen.getByText(/Payment received/i)).toBeInTheDocument());
  });

  it('shows the server error message on a failed charge', async () => {
    fetchReturning({ error: 'Your card was declined.' }, 402);
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /Pay \$19/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Your card was declined.'));
  });

  it('surfaces a card tokenization error without calling the API', async () => {
    stripeMock.createPaymentMethod.mockResolvedValueOnce({ error: { message: 'Invalid card number.' } });
    global.fetch = vi.fn() as typeof fetch;
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /Pay \$19/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Invalid card number.'));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('Back to account calls onBack', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /Back to account/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
