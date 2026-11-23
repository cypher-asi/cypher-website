import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MarketNft } from '@/lib/opensea';
import { NftCard } from './NftCard';

const nft: MarketNft = {
  identifier: '42',
  name: 'Wilder Wheel #42',
  image: 'https://example.com/42.png',
  collectionSlug: 'wilder-wheels',
  contract: '0xabc',
  chain: 'ethereum',
  priceEth: 1.5,
  traits: [],
};

describe('NftCard', () => {
  it('renders the token name', () => {
    render(<NftCard nft={nft} ethUsd={null} animationDelayMs={0} onOpen={() => {}} />);
    expect(screen.getByText('Wilder Wheel #42')).toBeInTheDocument();
  });

  it('calls onOpen with the token identifier when clicked', async () => {
    const onOpen = vi.fn();
    render(<NftCard nft={nft} ethUsd={null} animationDelayMs={0} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onOpen).toHaveBeenCalledWith('42');
  });
});
