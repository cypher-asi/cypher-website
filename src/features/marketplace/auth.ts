/**
 * ZERO authentication for the custodial marketplace routes.
 *
 * The caller presents a ZERO session token (Bearer). We validate it by calling
 * zos-api `GET /api/users/current` — that endpoint both proves the token and
 * returns the identity the custodial signer needs:
 *   - `id`               → the ZERO userId for the Thirdweb `auth_endpoint`.
 *   - `zeroWalletAddress` → the EIP-4337 smart account (verified in zos-api as
 *                           the wallet with `isThirdWeb && walletType==='EIP4337'`).
 *                           It is the `accountAddress` override for the signer
 *                           AND the wallet that holds/trades assets in v1.
 *
 * Fail-loud: a missing/invalid token, an unreachable auth service, or a user
 * with no ZERO wallet all throw — we never sign for an ambiguous identity.
 */
import { getMarketplaceConfig } from './config';

const FETCH_TIMEOUT_MS = 10_000;

export class MarketplaceAuthError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'MarketplaceAuthError';
  }
}

/** Identity resolved from a validated ZERO session token. */
export interface ZeroIdentity {
  userId: string;
  /** EIP-4337 smart account — accountAddress override + v1 trading wallet. */
  zeroWalletAddress: string;
}

// Shape of zos-api GET /api/users/current (verified in zos-api src/controllers/user.ts:
// `zeroWalletAddress` = the EIP-4337 smart-account wallet's publicAddress, or null).
interface ZosUserResponse {
  id?: string;
  zeroWalletAddress?: string | null;
}

/**
 * Validate the request's ZERO Bearer token and resolve the caller's identity.
 * Throws {@link MarketplaceAuthError} on any failure.
 */
export async function authenticate(request: Request): Promise<ZeroIdentity> {
  const { zosApiUrl } = getMarketplaceConfig();

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new MarketplaceAuthError(401, 'Missing or invalid Authorization header');
  }
  const token = authHeader.slice(7);
  if (!token) {
    throw new MarketplaceAuthError(401, 'Missing bearer token');
  }

  let response: Response;
  try {
    response = await fetch(`${zosApiUrl}/api/users/current`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    throw new MarketplaceAuthError(503, 'Authentication service unavailable');
  }

  if (response.status === 401) {
    throw new MarketplaceAuthError(401, 'Invalid or expired token');
  }
  if (!response.ok) {
    throw new MarketplaceAuthError(503, 'Authentication service error');
  }

  let user: ZosUserResponse;
  try {
    user = (await response.json()) as ZosUserResponse;
  } catch {
    throw new MarketplaceAuthError(503, 'Malformed response from auth service');
  }
  if (!user.id) {
    throw new MarketplaceAuthError(401, 'Invalid user data from auth service');
  }
  if (!user.zeroWalletAddress) {
    throw new MarketplaceAuthError(
      409,
      'User has no ZERO wallet — cannot execute a custodial trade',
    );
  }

  return { userId: user.id, zeroWalletAddress: user.zeroWalletAddress };
}
