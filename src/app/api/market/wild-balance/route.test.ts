import { describe, expect, it, vi, afterEach } from 'vitest';
import { GET } from './route';

const ADDR = '0x1111111111111111111111111111111111111111';
function req(address?: string) {
  const base = 'http://localhost/api/market/wild-balance';
  return new Request(address === undefined ? base : `${base}?address=${address}`);
}
function rpc(result: unknown, ok = true) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok, json: async () => ({ result }) }) as Response));
}
afterEach(() => vi.unstubAllGlobals());

describe('GET /api/market/wild-balance', () => {
  it('returns the WILD balance as an atomic decimal string', async () => {
    rpc('0x0de0b6b3a7640000'); // 1e18
    const res = await GET(req(ADDR));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ balance: '1000000000000000000' });
  });

  it('returns a real zero balance as "0"', async () => {
    rpc('0x0');
    expect(await (await GET(req(ADDR))).json()).toEqual({ balance: '0' });
  });

  it('rejects a missing or malformed address with 400', async () => {
    expect((await GET(req())).status).toBe(400);
    expect((await GET(req('0x123'))).status).toBe(400);
    expect((await GET(req('notanaddress'))).status).toBe(400);
  });

  it('fails loud (502, never 0) when the RPC errors or returns no result', async () => {
    rpc(null, false);
    expect((await GET(req(ADDR))).status).toBe(502);
    rpc(null, true);
    expect((await GET(req(ADDR))).status).toBe(502);
  });
});
