import { NextResponse } from 'next/server';
import { WILD_PRICE_ID } from '@/lib/wild-price';

export const revalidate = 0;

const BALANCE_OF = '0x70a08231'; // balanceOf(address)

/**
 * The WILD (ERC-20, Ethereum Mainnet) balance of a wallet, as an atomic integer
 * string (18 decimals). Read-only, no key: a single `eth_call` to the public
 * Ethereum RPC, the same source `originals-data.ts` uses. Fails loud (error, not
 * a synthetic zero) so the bridge shows "unavailable" rather than inventing 0.
 */
export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get('address') ?? '';
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: 'A valid Ethereum address is required.' }, { status: 400 });
  }
  const data = BALANCE_OF + address.slice(2).toLowerCase().padStart(64, '0');
  try {
    const response = await fetch('https://ethereum-rpc.publicnode.com', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to: WILD_PRICE_ID.contract, data }, 'latest'],
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return NextResponse.json({ error: 'Balance lookup failed.' }, { status: 502 });
    const body = (await response.json()) as { result?: string };
    if (typeof body.result !== 'string' || !/^0x[0-9a-fA-F]+$/.test(body.result)) {
      return NextResponse.json({ error: 'Balance unavailable.' }, { status: 502 });
    }
    return NextResponse.json({ balance: BigInt(body.result).toString() });
  } catch {
    return NextResponse.json({ error: 'Balance unavailable.' }, { status: 502 });
  }
}
