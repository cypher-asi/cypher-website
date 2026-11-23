import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const h = vi.hoisted(() => ({ getReadContext: vi.fn(), getContract: vi.fn(), readContract: vi.fn() }));
vi.mock('./custody', () => ({ getReadContext: h.getReadContext }));
vi.mock('thirdweb', () => ({ getContract: h.getContract, readContract: h.readContract }));

import { readWildBalance } from './wild';

beforeEach(() => {
  h.getReadContext.mockReset().mockReturnValue({ client: 'C', chain: 'CH', config: { wildAddress: '0xWILD' } });
  h.getContract.mockReset().mockReturnValue({ contract: 'wild' });
  h.readContract.mockReset().mockResolvedValue(BigInt(123));
});

describe('readWildBalance', () => {
  it('reads balanceOf on the configured WILD token for the given address', async () => {
    const balance = await readWildBalance('0xUSER');
    expect(balance).toBe(BigInt(123));
    expect(h.getContract).toHaveBeenCalledWith({ client: 'C', chain: 'CH', address: '0xWILD' });
    expect(h.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        contract: { contract: 'wild' },
        method: 'function balanceOf(address account) view returns (uint256)',
        params: ['0xUSER'],
      }),
    );
  });

  it('returns the raw bigint base units, not a formatted number', async () => {
    h.readContract.mockResolvedValueOnce(BigInt('1000000000000000000')); // 1 WILD in wei
    await expect(readWildBalance('0xUSER')).resolves.toBe(BigInt('1000000000000000000'));
  });
});
