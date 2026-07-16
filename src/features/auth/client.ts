/**
 * Client-side calls to our own /api/auth routes (same-origin, so the browser
 * sends the session cookie and an Origin header the CSRF guard accepts). The zos
 * access token never reaches here — these only ever see the `user`.
 */
import type { AuthUser } from './types';

async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data?.error || fallback;
  } catch {
    return fallback;
  }
}

async function postJson(path: string, body?: unknown): Promise<Response> {
  return fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Current signed-in user from the session cookie, or null. */
export async function fetchSession(): Promise<AuthUser | null> {
  try {
    const res = await fetch('/api/auth/session');
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: AuthUser | null };
    return data.user ?? null;
  } catch {
    return null;
  }
}

/** Email a one-time login code. */
export async function requestOtp(email: string): Promise<void> {
  const res = await postJson('/api/auth/otp/request', { email });
  if (!res.ok) throw new Error(await errorMessage(res, 'Could not send a login code'));
}

/** Verify an emailed code → signed-in user. */
export async function verifyOtp(email: string, code: string): Promise<AuthUser> {
  const res = await postJson('/api/auth/otp/verify', { email, code });
  if (!res.ok) throw new Error(await errorMessage(res, 'That code did not work'));
  const data = (await res.json()) as { user: AuthUser };
  return data.user;
}

/** Email + password → signed-in user. */
export async function loginWithPassword(email: string, password: string): Promise<AuthUser> {
  const res = await postJson('/api/auth/login', { email, password });
  if (!res.ok) throw new Error(await errorMessage(res, 'Could not sign in'));
  const data = (await res.json()) as { user: AuthUser };
  return data.user;
}

/** Full disconnect — clears the session cookie server-side. */
export async function logout(): Promise<void> {
  try {
    await postJson('/api/auth/logout');
  } catch {
    /* best-effort — the store clears the user regardless */
  }
}
