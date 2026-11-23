import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  storeMint,
  StoreMintRequestError,
  type MintLine,
  type MintLineResult,
} from './mint';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv('STORE_MINT_URL', 'https://store-tx-testnet.example.net');
  vi.stubEnv('STORE_MINT_API_KEY', 'sk-test-store-mint');
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function mintLine(settlementId: string): MintLine {
  return { settlementId, editionId: `0x${'a'.repeat(64)}`, recipient: `0x${'1'.repeat(40)}` };
}

function resultFor(line: MintLine, over: Partial<MintLineResult> = {}): MintLineResult {
  return {
    ...line,
    status: 'minted',
    reason: null,
    transactionHash: `0x${'d'.repeat(64)}`,
    tokenId: '1',
    error: null,
    ...over,
  };
}

/** A Response-like with a status plus a json/text body. */
function response(status: number, body?: unknown): Response {
  return {
    status,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body ?? '')),
  } as unknown as Response;
}

/** A 200 whose body echoes the request's lines as the given results. */
function okEchoing(lines: MintLineResult[], orderId = 'ord_1'): Response {
  return response(200, { error: null, data: { orderId, lines } });
}

describe('storeMint request shape', () => {
  it('posts orderId + lines with the x-api-key header to /api/v2/store/mint', async () => {
    const line = mintLine(`0x${'0'.repeat(64)}`);
    fetchMock.mockResolvedValueOnce(okEchoing([resultFor(line)]));

    const results = await storeMint('ord_1', [line]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://store-tx-testnet.example.net/api/v2/store/mint');
    expect(init.method).toBe('POST');
    expect(init.headers['x-api-key']).toBe('sk-test-store-mint');
    expect(JSON.parse(init.body)).toEqual({ orderId: 'ord_1', lines: [line] });
    expect(results[0].status).toBe('minted');
  });
});

describe('storeMint response parsing', () => {
  it('surfaces each per-line status and reason verbatim', async () => {
    const lines = [0, 1, 2, 3].map((n) => mintLine(`0x${String(n).repeat(64)}`));
    fetchMock.mockResolvedValueOnce(
      okEchoing([
        resultFor(lines[0], { status: 'minted' }),
        resultFor(lines[1], { status: 'already_settled' }),
        resultFor(lines[2], { status: 'failed', reason: 'sold_out', transactionHash: null, tokenId: null }),
        resultFor(lines[3], { status: 'pending', reason: null, transactionHash: null, tokenId: null }),
      ]),
    );

    const results = await storeMint('ord_1', lines);
    expect(results.map((r) => [r.status, r.reason])).toEqual([
      ['minted', null],
      ['already_settled', null],
      ['failed', 'sold_out'],
      ['pending', null],
    ]);
  });
});

describe('storeMint unknown outcomes become pending (never discarded)', () => {
  it('on a timeout, returns pending for the line', async () => {
    fetchMock.mockRejectedValueOnce(Object.assign(new Error('timed out'), { name: 'TimeoutError' }));
    const line = mintLine(`0x${'0'.repeat(64)}`);
    const results = await storeMint('ord_1', [line]);
    expect(results).toEqual([
      { ...line, status: 'pending', reason: null, transactionHash: null, tokenId: null, error: null },
    ]);
  });

  it('on a 5xx, returns pending', async () => {
    fetchMock.mockResolvedValueOnce(response(503, 'upstream down'));
    const line = mintLine(`0x${'0'.repeat(64)}`);
    expect((await storeMint('ord_1', [line]))[0].status).toBe('pending');
  });

  it('on a network error, returns pending', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    const line = mintLine(`0x${'0'.repeat(64)}`);
    expect((await storeMint('ord_1', [line]))[0].status).toBe('pending');
  });

  it('on an unexpected 2xx body, returns pending', async () => {
    fetchMock.mockResolvedValueOnce(response(200, { error: 'boom', data: null }));
    const line = mintLine(`0x${'0'.repeat(64)}`);
    expect((await storeMint('ord_1', [line]))[0].status).toBe('pending');
  });

  it('on a line-count mismatch, returns pending', async () => {
    const line = mintLine(`0x${'0'.repeat(64)}`);
    fetchMock.mockResolvedValueOnce(okEchoing([])); // asked for 1, got 0
    expect((await storeMint('ord_1', [line]))[0].status).toBe('pending');
  });
});

describe('storeMint fails loud on a bad request', () => {
  it.each([401, 422, 400])('throws StoreMintRequestError on %i', async (status) => {
    fetchMock.mockResolvedValueOnce(response(status, 'nope'));
    const line = mintLine(`0x${'0'.repeat(64)}`);
    await expect(storeMint('ord_1', [line])).rejects.toBeInstanceOf(StoreMintRequestError);
  });

  it('throws loudly when STORE_MINT_URL is unset (config, not a transient failure)', async () => {
    vi.stubEnv('STORE_MINT_URL', '');
    const line = mintLine(`0x${'0'.repeat(64)}`);
    await expect(storeMint('ord_1', [line])).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('storeMint batching (max 20 lines per request)', () => {
  it('splits 25 lines into a 20 + 5 pair and merges the results', async () => {
    const lines = Array.from({ length: 25 }, (_, n) => mintLine(`0x${n.toString(16).padStart(64, '0')}`));
    // Echo each chunk's lines back as minted.
    fetchMock.mockImplementation(async (_url: string, init: { body: string }) => {
      const sent = JSON.parse(init.body).lines as MintLine[];
      return okEchoing(sent.map((l) => resultFor(l)));
    });

    const results = await storeMint('ord_1', lines);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).lines).toHaveLength(20);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).lines).toHaveLength(5);
    expect(results).toHaveLength(25);
    expect(results.every((r) => r.status === 'minted')).toBe(true);
  });

  it('marks the failed chunk and every remaining line pending when a later chunk is unavailable', async () => {
    const lines = Array.from({ length: 25 }, (_, n) => mintLine(`0x${n.toString(16).padStart(64, '0')}`));
    fetchMock
      .mockResolvedValueOnce(okEchoing(lines.slice(0, 20).map((l) => resultFor(l)))) // chunk 1 delivers
      .mockResolvedValueOnce(response(503, 'down')); // chunk 2 unavailable

    const results = await storeMint('ord_1', lines);

    expect(results).toHaveLength(25);
    expect(results.slice(0, 20).every((r) => r.status === 'minted')).toBe(true);
    expect(results.slice(20).every((r) => r.status === 'pending')).toBe(true);
  });
});
