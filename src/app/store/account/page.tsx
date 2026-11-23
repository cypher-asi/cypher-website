import type { Metadata } from 'next';
import AccountPage from './AccountPage';

export const metadata: Metadata = {
  title: 'Your account | Wilder World',
  description: 'Your Wilder World account.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AccountPage />;
}
