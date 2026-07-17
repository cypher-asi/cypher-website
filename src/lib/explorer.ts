/** Z-Chain block explorer (Blockscout). */
export const ZCHAIN_EXPLORER_URL = 'https://zscan.live';

/** Explorer page for a Z-Chain transaction hash. */
export function zscanTxUrl(txHash: string): string {
  return `${ZCHAIN_EXPLORER_URL}/tx/${txHash}`;
}
