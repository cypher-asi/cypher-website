import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { fetchEthPrice } from '../api/fetchers';

/** Current ETH/USD price used to render prices in USD. */
export function useEthPriceQuery(): UseQueryResult<number | null> {
  return useQuery({
    queryKey: ['market', 'eth-price'],
    queryFn: fetchEthPrice,
    staleTime: 5 * 60_000,
  });
}
