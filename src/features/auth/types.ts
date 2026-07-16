/** The authenticated ZERO user, as surfaced to the client (no token). */
export interface AuthUser {
  /** ZERO userId. */
  id: string;
  /** EIP-4337 smart account, when the account has one. Null accounts can browse
   * and log in but cannot trade (the marketplace routes 409 without it). */
  zeroWalletAddress: string | null;
  /** Display handle / primary ZID, when set. */
  handle: string | null;
}
