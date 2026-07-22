/**
 * Custodial trade execution — the core custodial signing rail.
 *
 * Reconstructs a ZERO user's EIP-4337 smart-account signer server-side from just
 * their `{ userId }` (Thirdweb `auth_endpoint`; the client id + secret must be the
 * matched project pair — see config.ts) with the `accountAddress` override set to
 * their real `zeroWalletAddress`, then sends
 * sponsored (gasless) calls — the user never signs a transaction.
 *
 * Proven end-to-end by the marketplace build-order §0 spike (single sponsored
 * call). Trades that need an approval first (list, buy) are sent as ONE atomic
 * batched UserOp via `sendBatchTransaction`, so the approval is effective for the
 * action and the whole trade reverts together on any failure.
 *
 * Fail-loud throughout: a signer whose reconstructed address doesn't match the
 * ZERO wallet, a signer that can't batch, or a send that reverts all throw —
 * never a silent degrade.
 */
import {
  createThirdwebClient,
  defineChain,
  sendBatchTransaction,
  toSerializableTransaction,
  type Chain,
  type PreparedTransaction,
  type ThirdwebClient,
} from 'thirdweb';
import { inAppWallet, type Account } from 'thirdweb/wallets';
import { getMarketplaceConfig, type MarketplaceConfig } from './config';
import type { ZeroIdentity } from './auth';

/**
 * Fresh per-reconstruction in-app-wallet storage. The signer is stateless auth
 * (`auth_endpoint`), so this only holds transient key material for one request —
 * per-call isolation avoids any cross-user collision under concurrency.
 */
function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => Promise.resolve(store.get(key) ?? null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key: string) => {
      store.delete(key);
      return Promise.resolve();
    },
  };
}

export interface CustodialSigner {
  account: Account;
  client: ThirdwebClient;
  chain: Chain;
  config: MarketplaceConfig;
}

export interface ReadContext {
  client: ThirdwebClient;
  chain: Chain;
  config: MarketplaceConfig;
}

/**
 * Client + chain + config for read-only chain calls — no custodial account, so
 * no auth round-trip. getCustodialSigner builds its signing account on top of
 * the same context.
 */
export function getReadContext(): ReadContext {
  const config = getMarketplaceConfig();
  const client = createThirdwebClient({
    clientId: config.thirdwebClientId,
    secretKey: config.thirdwebSecretKey,
  });
  const chain = defineChain({ id: config.chainId, rpc: config.rpcUrl });
  return { client, chain, config };
}

/**
 * Reconstruct the user's custodial smart-account signer. Throws if the
 * reconstructed account is not the user's real ZERO wallet (i.e. the
 * `accountAddress` override didn't take).
 */
export async function getCustodialSigner(identity: ZeroIdentity): Promise<CustodialSigner> {
  const { client, chain, config } = getReadContext();

  const wallet = inAppWallet({
    smartAccount: {
      chain,
      sponsorGas: true,
      overrides: { accountAddress: identity.zeroWalletAddress },
    },
    storage: createMemoryStorage(),
  });
  const account = await wallet.connect({
    client,
    strategy: 'auth_endpoint',
    payload: JSON.stringify({ userId: identity.userId }),
  });

  if (account.address.toLowerCase() !== identity.zeroWalletAddress.toLowerCase()) {
    throw new Error(
      `Custodial signer address ${account.address} does not match ZERO wallet ${identity.zeroWalletAddress} — accountAddress override failed`,
    );
  }

  return { account, client, chain, config };
}

/**
 * Send one or more prepared calls from the custodial signer as a single
 * sponsored transaction, returning its hash. A lone call uses `sendTransaction`
 * (the proven spike path); multiple calls (approval + action) are sent as one
 * atomic batched UserOp. Throws on any failure.
 */
export async function sendCustodialCalls(
  signer: CustodialSigner,
  calls: PreparedTransaction[],
): Promise<string> {
  if (calls.length === 0) {
    throw new Error('sendCustodialCalls: no calls provided');
  }

  const { account } = signer;

  // Single call (e.g. cancel): the proven spike path — serialize (with gas
  // estimation) and send one sponsored transaction.
  if (calls.length === 1) {
    const serialized = await toSerializableTransaction({ transaction: calls[0], from: account });
    const { transactionHash } = await account.sendTransaction(serialized);
    return transactionHash;
  }

  // Multiple calls (approval + action): send as ONE atomic batched UserOp via
  // thirdweb's batch action, which encodes each call and estimates gas on the
  // WHOLE batch. This is essential — estimating the action call independently
  // (as toSerializableTransaction does) would simulate it BEFORE its approval
  // executes and revert. The action throws if the signer can't batch.
  const { transactionHash } = await sendBatchTransaction({ account, transactions: calls });
  return transactionHash;
}
