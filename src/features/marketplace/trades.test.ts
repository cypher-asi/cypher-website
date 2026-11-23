import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the custodial rail, the balance read, and thirdweb so the trade logic is
// tested on its own. The real MarketplaceError (./http) is used so status codes
// are asserted against the true class.
vi.mock('server-only', () => ({}));
vi.mock('./config', () => ({ getMarketplaceConfig: vi.fn() }));

const h = vi.hoisted(() => ({
  getCustodialSigner: vi.fn(),
  sendCustodialCalls: vi.fn(),
  readWildBalance: vi.fn(),
  getContract: vi.fn(),
  prepareContractCall: vi.fn(),
  prepareEvent: vi.fn(),
  parseEventLogs: vi.fn(),
  readContract: vi.fn(),
  waitForReceipt: vi.fn(),
}));
vi.mock('./custody', () => ({ getCustodialSigner: h.getCustodialSigner, sendCustodialCalls: h.sendCustodialCalls }));
vi.mock('./wild', () => ({ readWildBalance: h.readWildBalance }));
vi.mock('thirdweb', () => ({
  getContract: h.getContract,
  prepareContractCall: h.prepareContractCall,
  prepareEvent: h.prepareEvent,
  parseEventLogs: h.parseEventLogs,
  readContract: h.readContract,
  waitForReceipt: h.waitForReceipt,
}));

import { executeBuy, executeCancel, executeList } from './trades';
import { MarketplaceError } from './http';

const IDENTITY = { userId: 'u1', zeroWalletAddress: '0xBUYER' };
const SIGNER = { account: {}, client: 'C', chain: 'CH', config: { marketplaceAddress: '0xMARKET', wildAddress: '0xWILD' } };
const PRICE = BigInt('1000');

/** A listing tuple: [seller, nft, tokenId, amount, price, tokenType, active]. */
function listing(seller: string, active: boolean, price = PRICE) {
  return [seller, '0xNFT', BigInt(1), BigInt(1), price, 0, active];
}

async function thrown(fn: () => Promise<unknown>): Promise<MarketplaceError> {
  try {
    await fn();
  } catch (err) {
    return err as MarketplaceError;
  }
  throw new Error('expected the trade to throw, but it resolved');
}

beforeEach(() => {
  h.getCustodialSigner.mockReset().mockResolvedValue(SIGNER);
  h.sendCustodialCalls.mockReset().mockResolvedValue('0xTX');
  h.readWildBalance.mockReset().mockResolvedValue(BigInt('5000'));
  h.getContract.mockReset().mockImplementation((args: { address: string }) => ({ address: args.address }));
  // Tag each prepared call by method + params so the ordered sequence is assertable.
  h.prepareContractCall.mockReset().mockImplementation((args: { method: string; params: unknown[] }) => ({ method: args.method, params: args.params }));
  h.readContract.mockReset().mockResolvedValue(listing('0xSELLER', true));
  h.waitForReceipt.mockReset().mockResolvedValue({ logs: [] });
  h.parseEventLogs.mockReset().mockReturnValue([]);
});

describe('executeBuy', () => {
  it('approves the exact on-chain price then buys, as one ordered sequence', async () => {
    const hash = await executeBuy(IDENTITY, BigInt(7));
    expect(hash).toBe('0xTX');

    const [, calls] = h.sendCustodialCalls.mock.calls[0];
    expect(calls).toHaveLength(2);
    // Approve uses the price read from the contract (never a client value), on the marketplace.
    expect(calls[0].params).toEqual(['0xMARKET', PRICE]);
    // Then buy the listing.
    expect(calls[1].params).toEqual([BigInt(7)]);
  });

  it('reads the price from the listing, so a different on-chain price is what gets approved', async () => {
    h.readContract.mockResolvedValueOnce(listing('0xSELLER', true, BigInt('777')));
    await executeBuy(IDENTITY, BigInt(7));
    expect(h.sendCustodialCalls.mock.calls[0][1][0].params).toEqual(['0xMARKET', BigInt('777')]);
  });

  it('refuses an inactive listing with 409 and sends nothing', async () => {
    h.readContract.mockResolvedValueOnce(listing('0xSELLER', false));
    const err = await thrown(() => executeBuy(IDENTITY, BigInt(7)));
    expect(err.statusCode).toBe(409);
    expect(h.sendCustodialCalls).not.toHaveBeenCalled();
  });

  it('refuses to buy your own listing with 400', async () => {
    h.readContract.mockResolvedValueOnce(listing('0xBUYER', true)); // seller == buyer
    const err = await thrown(() => executeBuy(IDENTITY, BigInt(7)));
    expect(err.statusCode).toBe(400);
    expect(h.sendCustodialCalls).not.toHaveBeenCalled();
  });

  it('refuses when the WILD balance is below the price with 400, before approving', async () => {
    h.readWildBalance.mockResolvedValueOnce(BigInt('500')); // < 1000
    const err = await thrown(() => executeBuy(IDENTITY, BigInt(7)));
    expect(err.statusCode).toBe(400);
    expect(h.sendCustodialCalls).not.toHaveBeenCalled();
  });
});

describe('executeCancel', () => {
  it('cancels with a single call and no approval', async () => {
    const hash = await executeCancel(IDENTITY, BigInt(7));
    expect(hash).toBe('0xTX');
    const [, calls] = h.sendCustodialCalls.mock.calls[0];
    expect(calls).toHaveLength(1);
    expect(calls[0].params).toEqual([BigInt(7)]);
  });
});

describe('executeList', () => {
  const params = { nftContract: '0xNFT', tokenId: BigInt(3), amount: BigInt(1), price: PRICE };

  it('approves the operator then lists, and reads the new listingId from the event', async () => {
    h.parseEventLogs.mockReturnValueOnce([{ address: '0xMARKET', args: { listingId: BigInt(42) } }]);
    const result = await executeList(IDENTITY, params);

    expect(result).toEqual({ transactionHash: '0xTX', listingId: '42' });
    const [, calls] = h.sendCustodialCalls.mock.calls[0];
    expect(calls).toHaveLength(2); // setApprovalForAll + list
    expect(calls[0].params).toEqual(['0xMARKET', true]);
  });

  it('still returns the (already-settled) hash with a null listingId when the receipt read fails', async () => {
    h.waitForReceipt.mockRejectedValueOnce(new Error('rpc blip'));
    const result = await executeList(IDENTITY, params);
    expect(result).toEqual({ transactionHash: '0xTX', listingId: null });
  });
});
