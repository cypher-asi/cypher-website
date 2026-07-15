/**
 * Server-only marketplace configuration for the custodial trade-execution path.
 *
 * Every value here drives auth + signing and MUST stay server-side: on mainnet
 * `ZCHAIN_RPC_URL` carries the gateway.fm API key, and `THIRDWEB_SECRET_KEY` is
 * a secret. None of these are `NEXT_PUBLIC_` — they never reach the browser.
 *
 * The active chain is selected by `MARKETPLACE_CHAIN_ID`. The WILD settlement
 * token is an immutable property of each chain, so it lives in code; the
 * deployed `NFTMarketplace` address is a per-deploy artifact (mainnet is not
 * deployed yet), so it lives in env.
 *
 * NOTE: `THIRDWEB_CLIENT_ID` MUST be the ZW_THIRDWEB project (the one whose
 * Thirdweb custom-auth endpoint is wired to zos-api `/thirdweb/verify-payload`),
 * NOT ww-tx-server's session-key project — the `auth_endpoint` strategy fails on
 * a project without that endpoint.
 */
import 'server-only';

// WILD ERC-20 settlement token per chain (verified on-chain; see plan §1).
const WILD_BY_CHAIN: Record<number, string> = {
  9369: '0x376F41Bb278253457A0073e0ce93Ec457F09fc00', // Z-Chain mainnet
  1417429182: '0xb2A7e1eC5a9b7F1b1bFE4041b4523aD4a20e3bc6', // Zephyr testnet
};

export interface MarketplaceConfig {
  chainId: number;
  rpcUrl: string;
  thirdwebClientId: string;
  thirdwebSecretKey: string;
  /** Deployed NFTMarketplace contract address on the active chain. */
  marketplaceAddress: string;
  /** WILD ERC-20 settlement token on the active chain. */
  wildAddress: string;
  /** Base URL of zos-api (no trailing slash), used for auth + wallet lookup. */
  zosApiUrl: string;
}

/**
 * Read and validate the marketplace config from the environment. Throws loudly
 * on any missing or invalid value — we never execute a custodial trade against a
 * half-configured environment.
 */
export function getMarketplaceConfig(): MarketplaceConfig {
  const chainId = Number(process.env.MARKETPLACE_CHAIN_ID);
  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new Error('MARKETPLACE_CHAIN_ID is missing or not a positive integer');
  }

  const wildAddress = WILD_BY_CHAIN[chainId];
  if (!wildAddress) {
    throw new Error(`No known WILD token for chain ${chainId} — update WILD_BY_CHAIN`);
  }

  return {
    chainId,
    wildAddress,
    rpcUrl: requireEnv('ZCHAIN_RPC_URL'),
    thirdwebClientId: requireEnv('THIRDWEB_CLIENT_ID'),
    thirdwebSecretKey: requireEnv('THIRDWEB_SECRET_KEY'),
    marketplaceAddress: requireEnv('NFT_MARKETPLACE_ADDRESS'),
    zosApiUrl: requireEnv('ZOS_API_URL').replace(/\/+$/, ''),
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}
