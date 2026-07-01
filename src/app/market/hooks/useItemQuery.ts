import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { MarketItem } from '@/app/api/market/item/route';
import type { MarketNft } from '@/lib/opensea';
import { fetchItem } from '../api/fetchers';

/** Full onchain detail for a single NFT, fetched lazily when a modal opens. */
export function useItemQuery(
  slug: string,
  nft: MarketNft | null
): UseQueryResult<MarketItem> {
  return useQuery({
    queryKey: [
      'market',
      'item',
      slug,
      nft?.identifier ?? '',
      nft?.contract ?? '',
      nft?.chain ?? '',
    ],
    enabled: Boolean(nft),
    queryFn: () =>
      fetchItem({
        slug,
        identifier: nft!.identifier,
        contract: nft!.contract,
        chain: nft!.chain,
      }),
  });
}
