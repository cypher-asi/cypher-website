// @vitest-environment node
// This helper is server-only (Node) crypto. jose resolves to its WebCrypto
// build under jsdom, where its Uint8Array check mismatches across realms, so the
// test runs in the node environment to match where the code actually runs.
import { describe, expect, it } from 'vitest';
import { jwtVerify } from 'jose';
import { signAuthToken } from './thirdweb-auth-token';

const SECRET = 'a-shared-signing-secret-at-least-32-bytes-long';
const OTHER_SECRET = 'a-different-signing-secret-32-bytes-or-more!!';
const USER = '11111111-1111-1111-1111-111111111111';
const key = new TextEncoder().encode(SECRET);

describe('signAuthToken', () => {
  it('signs a token that verifies and carries the userId', async () => {
    const token = await signAuthToken(USER, SECRET);
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    expect(payload.userId).toBe(USER);
  });

  it('produces a real JWT, not a raw JSON userId', async () => {
    const token = await signAuthToken(USER, SECRET);
    expect(token).not.toBe(JSON.stringify({ userId: USER }));
    expect(token.split('.')).toHaveLength(3);
  });

  it('produces a token that fails verification when tampered with', async () => {
    const token = await signAuthToken(USER, SECRET);
    const parts = token.split('.');
    const sig = parts[2];
    parts[2] = sig.slice(0, -1) + (sig.slice(-1) === 'A' ? 'B' : 'A');
    await expect(jwtVerify(parts.join('.'), key, { algorithms: ['HS256'] })).rejects.toThrow();
  });

  it('produces a token that fails verification under a different secret', async () => {
    const token = await signAuthToken(USER, OTHER_SECRET);
    await expect(jwtVerify(token, key, { algorithms: ['HS256'] })).rejects.toThrow();
  });

  it('produces a token that fails verification once expired', async () => {
    const token = await signAuthToken(USER, SECRET, -10);
    await expect(jwtVerify(token, key, { algorithms: ['HS256'] })).rejects.toThrow();
  });
});
