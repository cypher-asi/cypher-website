import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

type AuthUser = { displayName: string | null; handle: string | null; zeroWalletAddress: string | null } | null;
const authState = { user: null as AuthUser, status: 'idle' as string, openLogin: vi.fn() };
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (selector: (s: typeof authState) => unknown) => selector(authState),
}));

type Query = {
  data: unknown;
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
};
function queryResult(over: Partial<Query> = {}): Query {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    ...over,
  };
}
const holdingsState = { zchain: queryResult(), eth: queryResult() };
vi.mock('@/app/market/hooks/useHoldingsQuery', () => ({
  useZchainHoldingsQuery: () => holdingsState.zchain,
  useEthHoldingsQuery: () => holdingsState.eth,
}));
vi.mock('@/app/market/hooks/useEthPriceQuery', () => ({ useEthPriceQuery: () => ({ data: null }) }));
vi.mock('@/app/market/hooks/useInfiniteScroll', () => ({ useInfiniteScroll: () => {} }));
vi.mock('@/sites/wilderworld/marketplace/MarketHeader', () => ({ MarketHeader: () => <div data-testid="market-header" /> }));
vi.mock('@/app/market/components/NftGrid', () => ({
  NftGrid: ({ items }: { items: { identifier: string }[] }) => (
    <div data-testid="grid">{items.map((i) => <span key={i.identifier}>{i.identifier}</span>)}</div>
  ),
}));
vi.mock('@/app/market/components/MarketSkeleton', () => ({ MarketSkeleton: () => <div data-testid="skeleton" /> }));
vi.mock('@/app/market/components/MarketEmptyState', () => ({ MarketEmptyState: ({ title }: { title: string }) => <div>{title}</div> }));
vi.mock('@/app/market/components/LoadMoreSentinel', () => ({ LoadMoreSentinel: () => <div data-testid="sentinel" /> }));
vi.mock('@/app/market/components/ItemModal', () => ({ ItemModal: () => <div data-testid="modal" /> }));

import Portfolio from './Portfolio';

beforeEach(() => {
  authState.user = null;
  authState.status = 'idle';
  authState.openLogin.mockReset();
  holdingsState.zchain = queryResult();
  holdingsState.eth = queryResult();
});

describe('Portfolio', () => {
  it('prompts sign in when signed out', () => {
    render(<Portfolio />);
    expect(screen.getByRole('heading', { name: /sign in to see your holdings/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(authState.openLogin).toHaveBeenCalledTimes(1);
  });

  it('shows a loading state while the session restores', () => {
    authState.status = 'restoring';
    render(<Portfolio />);
    expect(screen.getByRole('status')).toHaveTextContent(/loading your portfolio/i);
  });

  it('renders both wallet sections with real items and empty states when signed in', () => {
    authState.user = { displayName: 'Nova', handle: null, zeroWalletAddress: '0xzero' };
    holdingsState.zchain = queryResult({ data: { items: [{ identifier: 'z1' }, { identifier: 'z2' }], batchBase: 0 } });
    holdingsState.eth = queryResult({ data: { items: [], batchBase: 0 } });
    render(<Portfolio />);
    expect(screen.getByRole('heading', { name: /your wilder world items/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /your linked wallet items/i })).toBeInTheDocument();
    expect(screen.getByTestId('grid')).toHaveTextContent('z1');
    expect(screen.getByText(/nothing here yet/i)).toBeInTheDocument();
  });

  it('sits under the account tabs with Portfolio current and a breadcrumb back to the account', () => {
    authState.user = { displayName: 'Nova', handle: null, zeroWalletAddress: '0xzero' };
    render(<Portfolio />);
    const tabs = within(screen.getByRole('navigation', { name: 'Account sections' }));
    expect(tabs.getByRole('link', { name: 'Portfolio' })).toHaveAttribute('aria-current', 'page');
    expect(tabs.getByRole('link', { name: 'Wallets' })).toHaveAttribute('href', '/store/account');
    expect(screen.getByRole('link', { name: 'Your account' })).toHaveAttribute('href', '/store/account');
  });

  it('shows no account tabs when signed out', () => {
    render(<Portfolio />);
    expect(screen.queryByRole('navigation', { name: 'Account sections' })).toBeNull();
  });

  it('hides the Z-Chain section when the account has no ZERO wallet', () => {
    authState.user = { displayName: 'Nova', handle: null, zeroWalletAddress: null };
    render(<Portfolio />);
    expect(screen.queryByRole('heading', { name: /your wilder world items/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /your linked wallet items/i })).toBeInTheDocument();
  });
});
