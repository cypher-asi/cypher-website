/**
 * Server-side zos-api client for ZERO auth. Only the server talks to zos-api —
 * the browser posts credentials to our /api/auth routes, which call these and
 * stash the resulting access token in an httpOnly cookie. Fail-loud: every
 * failure throws {@link AuthError} with a status the route maps to a response.
 */
import type { AuthUser } from './types';

const FETCH_TIMEOUT_MS = 10_000;

export class AuthError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export function zosApiUrl(): string {
  const url = process.env.ZOS_API_URL;
  if (!url) throw new AuthError(500, 'ZOS_API_URL is not configured');
  return url;
}

async function zosFetch(path: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(`${zosApiUrl()}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    throw new AuthError(503, 'Authentication service unavailable');
  }
}

async function readAccessToken(response: Response): Promise<string> {
  let data: { accessToken?: string };
  try {
    data = (await response.json()) as { accessToken?: string };
  } catch {
    throw new AuthError(502, 'Malformed response from auth service');
  }
  if (!data.accessToken) throw new AuthError(502, 'Auth service returned no token');
  return data.accessToken;
}

/** Send a one-time login code to the email. */
export async function requestOtp(email: string): Promise<void> {
  const res = await zosFetch('/api/otp/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new AuthError(res.status === 400 ? 400 : 502, 'Could not send a login code');
}

/** Exchange an email + OTP code for an access token. */
export async function verifyOtp(email: string, code: string): Promise<string> {
  const res = await zosFetch('/api/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
  if (!res.ok) throw new AuthError(401, 'That code is invalid or expired');
  return readAccessToken(res);
}

/** Exchange an email + password for an access token. */
export async function emailLogin(email: string, password: string): Promise<string> {
  const res = await zosFetch('/api/v2/accounts/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new AuthError(401, 'Incorrect email or password');
  return readAccessToken(res);
}

/**
 * Exchange an OAuth `sessionEstablishmentToken` (from the social-login redirect)
 * for an access token. zos-api brokers the provider handshake; we just redeem
 * the short-lived token it hands back. The token goes in the Authorization
 * header (not the body), and the body is empty — matching zos-api's contract.
 */
export async function establishOauthSession(sessionToken: string): Promise<string> {
  const res = await zosFetch('/api/oauth/establish-session', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sessionToken}` },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new AuthError(401, 'Could not complete social sign-in');
  return readAccessToken(res);
}

/** Resolve the user for a token, or null if the token is invalid/expired. */
export async function currentUser(token: string): Promise<AuthUser | null> {
  const res = await zosFetch('/api/users/current', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new AuthError(503, 'Authentication service error');

  let user: {
    id?: string;
    zeroWalletAddress?: string | null;
    handle?: string | null;
    primaryZID?: string | null;
  };
  try {
    user = await res.json();
  } catch {
    throw new AuthError(502, 'Malformed response from auth service');
  }
  if (!user.id) return null;
  return {
    // The EIP-4337 custody wallet only — no fallback to a primary/external EOA,
    // so this agrees with the marketplace's authenticate() (which 409s without a
    // real zeroWalletAddress). A null here means "cannot trade yet".
    id: user.id,
    zeroWalletAddress: user.zeroWalletAddress ?? null,
    handle: user.handle ?? user.primaryZID ?? null,
  };
}

/** Revoke the token's zos-api session. Best-effort — logout must not fail. */
export async function revokeSession(token: string): Promise<void> {
  try {
    const res = await zosFetch('/authentication/session', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      // The cookie is cleared regardless, so logout still works locally — but a
      // non-OK revoke means the token is still valid server-side until it
      // expires, worth surfacing rather than swallowing.
      console.warn(`[auth] zos session revoke returned ${res.status}`);
    }
  } catch {
    /* already unreachable or invalid — the cookie is cleared regardless */
  }
}
