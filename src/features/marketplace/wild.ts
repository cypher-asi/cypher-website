/**
 * Read-only WILD (settlement token) helpers. Server-only: the RPC + client
 * config it uses carries secrets (see config.ts), so this never reaches the
 * browser — the client reads a wallet's balance via the /api/marketplace/balance
 * route instead.
 */
import 'server-only';
import { getContract, readContract } from 'thirdweb';
import { getReadContext } from './custody';

const BALANCE_OF_METHOD = 'function balanceOf(address account) view returns (uint256)';

/** The wallet's WILD balance in raw base units (18 decimals). Public on-chain
 *  data, so no auth is needed to read it — callers gate on their own auth. */
export async function readWildBalance(address: string): Promise<bigint> {
  const { client, chain, config } = getReadContext();
  const wild = getContract({ client, chain, address: config.wildAddress });
  return readContract({
    contract: wild,
    method: BALANCE_OF_METHOD,
    params: [address],
  });
}
