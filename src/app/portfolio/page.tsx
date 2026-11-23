import type { Metadata } from 'next';
import Portfolio from './Portfolio';

export const metadata: Metadata = {
  title: 'Portfolio — Wilder World',
  description: 'Your Wilder World items across your ZERO wallet and linked wallets.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <Portfolio />;
}
