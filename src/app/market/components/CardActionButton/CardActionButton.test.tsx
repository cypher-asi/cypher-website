import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { MarketNft } from '@/lib/opensea';

vi.mock('@/features/auth/store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ user: { id: 'u1', zeroWalletAddress: '0xzero' }, openLogin: vi.fn() }),
}));
vi.mock('@/features/marketplace/tradeStore', () => ({
  useTradeStore: (selector: (s: unknown) => unknown) => selector({ start: vi.fn() }),
}));
vi.mock('@/features/marketplace/processingStore', () => ({ useProcessing: () => undefined }));

import { CardActionButton } from './CardActionButton';

function nft(overrides: Partial<MarketNft>): MarketNft {
  return {
    identifier: '1',
    name: 'Asset 1',
    image: null,
    collectionSlug: 'wilderworld',
    contract: '0xcontract',
    chain: 'ethereum',
    traits: [],
    ...overrides,
  } as MarketNft;
}

afterEach(cleanup);

describe('CardActionButton — listable chain gate', () => {
  it('renders no List action for an owned ETH-mainnet holding', () => {
    render(<CardActionButton nft={nft({ owned: true, chain: 'ethereum' })} onOpen={() => {}} className="x" />);
    expect(screen.queryByRole('button', { name: 'List' })).not.toBeInTheDocument();
    // No listing + not listable → renders nothing at all.
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders List for an owned Z-Chain asset', () => {
    render(<CardActionButton nft={nft({ owned: true, chain: 'zchain' })} onOpen={() => {}} className="x" />);
    expect(screen.getByRole('button', { name: 'List' })).toBeInTheDocument();
  });
});
