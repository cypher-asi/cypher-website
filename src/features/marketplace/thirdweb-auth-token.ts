import { SignJWT } from 'jose';

/**
 * Signs the short-lived token sent as the Thirdweb `auth_endpoint` payload.
 *
 * The custom-auth endpoint verifies this token and derives the user id from the
 * verified claims, rather than trusting a user id sent in the request body. The
 * token is a standard HS256 JWT; the signing secret must match the secret the
 * endpoint verifies with.
 */

const ALG = 'HS256';
const DEFAULT_TTL_SECONDS = 60;

const toKey = (secret: string): Uint8Array => new TextEncoder().encode(secret);

/** Sign a short-lived token carrying `userId`, for the auth_endpoint payload. */
export function signAuthToken(
  userId: string,
  secret: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({ userId })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(toKey(secret));
}
