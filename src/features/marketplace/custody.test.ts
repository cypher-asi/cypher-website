import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stub config, the token signer, and thirdweb so the custodial reconstruction and
// dispatch logic can be tested without real keys or network.
vi.mock('server-only', () => ({}));

const h = vi.hoisted(() => ({
  getMarketplaceConfig: vi.fn(),
  signAuthToken: vi.fn(),
  createThirdwebClient: vi.fn(),
  defineChain: vi.fn(),
  sendBatchTransaction: vi.fn(),
  toSerializableTransaction: vi.fn(),
  inAppWallet: vi.fn(),
}));
vi.mock('./config', () => ({ getMarketplaceConfig: h.getMarketplaceConfig }));
vi.mock('./thirdweb-auth-token', () => ({ signAuthToken: h.signAuthToken }));
vi.mock('thirdweb', () => ({
  createThirdwebClient: h.createThirdwebClient,
  defineChain: h.defineChain,
  sendBatchTransaction: h.sendBatchTransaction,
  toSerializableTransaction: h.toSerializableTransaction,
}));
vi.mock('thirdweb/wallets', () => ({ inAppWallet: h.inAppWallet }));

import { getCustodialSigner, sendCustodialCalls, getReadContext } from './custody';

const IDENTITY = { userId: 'u1', zeroWalletAddress: '0xWALLET' };

/** Make inAppWallet().connect() resolve an account with the given address. */
function connectReturns(address: string) {
  const account = { address, sendTransaction: vi.fn().mockResolvedValue({ transactionHash: '0xSINGLE' }) };
  h.inAppWallet.mockReturnValue({ connect: vi.fn().mockResolvedValue(account) });
  return account;
}

async function thrown(fn: () => Promise<unknown>): Promise<Error> {
  try {
    await fn();
  } catch (err) {
    return err as Error;
  }
  throw new Error('expected a throw, but it resolved');
}

beforeEach(() => {
  h.getMarketplaceConfig.mockReset().mockReturnValue({
    thirdwebClientId: 'cid',
    thirdwebSecretKey: 'sec',
    chainId: 1,
    rpcUrl: 'https://rpc.test',
    authSigningSecret: 'auth-secret',
  });
  h.signAuthToken.mockReset().mockResolvedValue('TOKEN');
  h.createThirdwebClient.mockReset().mockReturnValue('CLIENT');
  h.defineChain.mockReset().mockReturnValue('CHAIN');
  h.sendBatchTransaction.mockReset().mockResolvedValue({ transactionHash: '0xBATCH' });
  h.toSerializableTransaction.mockReset().mockResolvedValue('SERIALIZED');
  h.inAppWallet.mockReset();
});

describe('getReadContext', () => {
  it('builds the client and chain from config, with no auth round-trip', () => {
    const ctx = getReadContext();
    expect(h.createThirdwebClient).toHaveBeenCalledWith({ clientId: 'cid', secretKey: 'sec' });
    expect(h.defineChain).toHaveBeenCalledWith({ id: 1, rpc: 'https://rpc.test' });
    expect(ctx).toMatchObject({ client: 'CLIENT', chain: 'CHAIN' });
    expect(h.signAuthToken).not.toHaveBeenCalled();
  });
});

describe('getCustodialSigner', () => {
  it('reconstructs the signer and returns it when the address matches the ZERO wallet', async () => {
    const account = connectReturns('0xWALLET');
    const signer = await getCustodialSigner(IDENTITY);
    expect(signer.account).toBe(account);
  });

  it('signs a short-lived token carrying the userId (never a client-supplied id)', async () => {
    connectReturns('0xWALLET');
    await getCustodialSigner(IDENTITY);
    expect(h.signAuthToken).toHaveBeenCalledWith('u1', 'auth-secret');
  });

  it('overrides the smart account to the ZERO wallet and sponsors gas', async () => {
    connectReturns('0xWALLET');
    await getCustodialSigner(IDENTITY);
    const walletArgs = h.inAppWallet.mock.calls[0][0];
    expect(walletArgs.smartAccount.sponsorGas).toBe(true);
    expect(walletArgs.smartAccount.overrides.accountAddress).toBe('0xWALLET');
  });

  it('THROWS when the reconstructed address is not the ZERO wallet (the drain defense)', async () => {
    connectReturns('0xSOMEONEELSE');
    const err = await thrown(() => getCustodialSigner(IDENTITY));
    expect(err.message).toMatch(/does not match ZERO wallet/i);
  });

  it('accepts a match that differs only in case', async () => {
    connectReturns('0xWALLET'.toUpperCase());
    await expect(getCustodialSigner(IDENTITY)).resolves.toBeDefined();
  });
});

describe('sendCustodialCalls', () => {
  const signer = { account: { sendTransaction: vi.fn() }, client: 'CLIENT', chain: 'CHAIN', config: {} } as never;

  it('throws when given no calls', async () => {
    expect((await thrown(() => sendCustodialCalls(signer, []))).message).toMatch(/no calls/i);
  });

  it('sends a single call directly (serialize then send), never batched', async () => {
    const s = { account: { sendTransaction: vi.fn().mockResolvedValue({ transactionHash: '0xSINGLE' }) }, client: 'CLIENT', chain: 'CHAIN', config: {} } as never;
    const call = { tag: 'cancel' };
    const hash = await sendCustodialCalls(s, [call] as never);
    expect(hash).toBe('0xSINGLE');
    expect(h.toSerializableTransaction).toHaveBeenCalledWith({ transaction: call, from: (s as { account: unknown }).account });
    expect(h.sendBatchTransaction).not.toHaveBeenCalled();
  });

  it('sends multiple calls as one atomic batched transaction, never serialized singly', async () => {
    const calls = [{ tag: 'approve' }, { tag: 'buy' }];
    const hash = await sendCustodialCalls(signer, calls as never);
    expect(hash).toBe('0xBATCH');
    expect(h.sendBatchTransaction).toHaveBeenCalledWith({ account: (signer as { account: unknown }).account, transactions: calls });
    expect(h.toSerializableTransaction).not.toHaveBeenCalled();
  });
});
