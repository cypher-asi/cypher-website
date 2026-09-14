/** Z-Chain block explorer (Blockscout). */
export const ZCHAIN_EXPLORER_URL = 'https://zscan.live';

/** Explorer page for a Z-Chain transaction hash. */
export function zscanTxUrl(txHash: string): string {
  return `${ZCHAIN_EXPLORER_URL}/tx/${txHash}`;
}

/**
 * Explorer page for an address, opened on its holdings.
 *
 * Used at checkout so a buyer can see what is actually in the wallet the
 * vehicle is going to. Someone who has accidentally bought on a second account
 * finds it near empty, while the one they play on is full, which is a far
 * stronger signal than reading back an address they have never memorised.
 */
export function zscanAddressUrl(address: string): string {
  return `${ZCHAIN_EXPLORER_URL}/address/${address}?tab=tokens`;
}
