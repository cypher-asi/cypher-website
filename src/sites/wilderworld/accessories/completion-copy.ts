import type { StoreOrderStatus } from '@/features/store/types';

/**
 * The confirmation heading and body for a finished order, honest to its delivery
 * outcome. Delivery runs synchronously at checkout, so by this screen the outcome is
 * known: `delivered` means the items are already in the wallet, `undelivered` means
 * they are still on the way, `refunded` means they were unavailable and the money is
 * back, and `refund_failed` means something needs a person. Anything unexpected falls
 * back to the still-arriving wording, which is never wrong for an order already paid.
 */
export function completionCopy(
  delivery: StoreOrderStatus,
  count: number,
): { heading: string; body: string } {
  const items = count === 1 ? 'item' : `${count} items`;
  const isAre = count === 1 ? 'is' : 'are';
  const wasWere = count === 1 ? 'was' : 'were';
  switch (delivery) {
    case 'delivered':
      return { heading: 'You’re all set.', body: `Your ${items} ${isAre} in your ZERO wallet.` };
    case 'refunded':
      return {
        heading: 'Payment refunded.',
        body: `The ${items} you chose ${wasWere} unavailable, so your payment has been refunded.`,
      };
    case 'refund_failed':
      return {
        heading: 'We’re on it.',
        body: 'Something went wrong completing your order and the automatic refund did not go through. Our team will sort this out.',
      };
    case 'undelivered':
    case 'paid':
    default:
      return {
        heading: 'You’re all set.',
        body: `Your order is confirmed. Your ${items} will arrive in your ZERO wallet shortly.`,
      };
  }
}
