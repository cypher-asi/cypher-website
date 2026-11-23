import 'server-only';
import { storeMintApiKey, storeMintUrl } from './config';

/** A unit to deliver: the three fields the mint endpoint settles against. */
export type MintLine = {
  settlementId: string;
  editionId: string;
  recipient: string;
};

export type MintStatus = 'minted' | 'already_settled' | 'pending' | 'failed';
export type MintFailureReason =
  | 'sold_out'
  | 'unknown_edition'
  | 'paused'
  | 'invalid_recipient'
  | 'mint_failed';

/**
 * The per-line outcome. The shape the mint endpoint returns, plus the same shape we
 * synthesize (status 'pending') for a line whose request outcome is unknown.
 */
export type MintLineResult = MintLine & {
  status: MintStatus;
  reason: MintFailureReason | null;
  transactionHash: string | null;
  tokenId: string | null;
  error: string | null;
};

/** Longer than the service's 90s proxy, so a slow call ends in their clear 504, not our abort. */
const CLIENT_TIMEOUT_MS = 120_000;
/** The endpoint's hard cap. Larger orders are split into sequential requests. */
const MAX_LINES_PER_REQUEST = 20;

/**
 * The call could not be completed, so the outcome is UNKNOWN (timeout, 504, any 5xx,
 * a network error, or an unexpected body). The lines may still have minted, so they
 * must be retried with the same settlementIds, never refunded.
 */
export class StoreMintUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StoreMintUnavailableError';
  }
}

/**
 * The request was rejected before any line was processed (401 bad key, 422
 * malformed, 400 duplicate/zero settlementId). This is our bug or a config/ops
 * problem, not a transient one, so it fails loud rather than being retried blindly.
 */
export class StoreMintRequestError extends Error {
  constructor(
    readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = 'StoreMintRequestError';
  }
}

/** An unknown-outcome (pending) result for a line we could not deliver this attempt. */
function pendingResult(line: MintLine): MintLineResult {
  return {
    ...line,
    status: 'pending',
    reason: null,
    transactionHash: null,
    tokenId: null,
    error: null,
  };
}

/**
 * One request for up to MAX_LINES_PER_REQUEST lines. Returns the per-line results,
 * throws StoreMintUnavailableError when the outcome is unknown (retry), or
 * StoreMintRequestError on a 4xx (fail loud).
 */
async function storeMintRequest(orderId: string, lines: MintLine[]): Promise<MintLineResult[]> {
  // Resolve config BEFORE the try, so a missing STORE_MINT_URL / STORE_MINT_API_KEY
  // fails loud rather than being swallowed into an "unknown outcome" that retries.
  const endpoint = `${storeMintUrl()}/api/v2/store/mint`;
  const apiKey = storeMintApiKey();

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ orderId, lines }),
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      throw new StoreMintUnavailableError(`store mint timed out after ${CLIENT_TIMEOUT_MS}ms`);
    }
    throw new StoreMintUnavailableError(err instanceof Error ? err.message : String(err));
  }

  // 5xx and the proxy's 504 mean the outcome is unknown. Retry with the same body.
  if (res.status >= 500) {
    throw new StoreMintUnavailableError(`store mint returned ${res.status}`);
  }
  // 4xx means no lines were processed: a bad key, a malformed body, or a duplicate
  // settlementId. Our bug or config, so fail loud rather than retry.
  if (res.status >= 400) {
    const detail = await res.text().catch(() => '');
    throw new StoreMintRequestError(res.status, `store mint rejected the request (${res.status}): ${detail}`);
  }

  const body = (await res.json().catch(() => null)) as {
    error: string | null;
    data: { orderId: string; lines: MintLineResult[] } | null;
  } | null;

  // A 2xx that is not the documented shape, or carries a request-level error, or does
  // not echo one result per line: outcome unknown, safe to retry (never refunded).
  if (
    !body ||
    body.error ||
    !body.data ||
    !Array.isArray(body.data.lines) ||
    body.data.lines.length !== lines.length
  ) {
    throw new StoreMintUnavailableError(`store mint returned an unexpected body (${res.status})`);
  }
  return body.data.lines;
}

/**
 * Deliver all units for an order, splitting into requests of at most
 * MAX_LINES_PER_REQUEST and returning a per-unit result for EVERY input line.
 *
 * Never throws away a paid purchase. A request whose outcome is unknown (timeout,
 * 504, 5xx, network, or an unexpected body) yields `pending` results for its lines
 * and for any not-yet-attempted lines, so the caller records the order undelivered
 * and retries with the same settlementIds rather than refunding. A 4xx is a loud
 * StoreMintRequestError (retrying an invalid request would never help), and a
 * missing STORE_MINT_URL / STORE_MINT_API_KEY throws loudly from the config readers.
 */
export async function storeMint(orderId: string, lines: MintLine[]): Promise<MintLineResult[]> {
  const results: MintLineResult[] = [];
  for (let i = 0; i < lines.length; i += MAX_LINES_PER_REQUEST) {
    const chunk = lines.slice(i, i + MAX_LINES_PER_REQUEST);
    try {
      results.push(...(await storeMintRequest(orderId, chunk)));
    } catch (err) {
      if (err instanceof StoreMintUnavailableError) {
        // The service is unreachable for this chunk, so mark it and every
        // remaining line pending rather than hammering a service that is down.
        for (const line of lines.slice(i)) results.push(pendingResult(line));
        return results;
      }
      throw err;
    }
  }
  return results;
}
