/**
 * Shared HTTP helpers for the custodial marketplace routes: strict input
 * parsing (uint256 values arrive as decimal strings — a JSON number can't hold
 * a uint256 precisely), address-format validation, and error mapping.
 *
 * Fail-loud: anything malformed is rejected with a 400 before it can reach the
 * chain; auth failures carry their own status; everything else is logged and
 * returned as an opaque 500.
 */
import { NextResponse } from 'next/server';
import { MarketplaceAuthError } from './auth';

const MAX_UINT256 = BigInt(2) ** BigInt(256) - BigInt(1);
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const UINT_RE = /^\d+$/;

/** A malformed or out-of-range request input. Maps to HTTP 400. */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * An expected, user-facing marketplace condition — e.g. the listing is no longer
 * active (sold/cancelled since the grid loaded), or an attempted self-buy. Its
 * message is safe to show the user; it maps to the given status, not the opaque
 * 500 reserved for genuine internal failures.
 */
export class MarketplaceError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'MarketplaceError';
  }
}

/** Parse the request body as a JSON object, or throw {@link ValidationError}. */
export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ValidationError('Request body must be valid JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new ValidationError('Request body must be a JSON object');
  }
  return raw as Record<string, unknown>;
}

/**
 * Parse a uint256 supplied as a decimal string. Rejects non-strings, negatives,
 * decimals, and values above the uint256 maximum. `min` bounds the low end
 * (1 for amounts/prices, 0 for token/listing ids).
 */
export function parseUint(value: unknown, field: string, min: number): bigint {
  if (typeof value !== 'string' || !UINT_RE.test(value)) {
    throw new ValidationError(`${field} must be a non-negative integer string`);
  }
  const parsed = BigInt(value);
  if (parsed < BigInt(min)) {
    throw new ValidationError(`${field} must be >= ${min}`);
  }
  if (parsed > MAX_UINT256) {
    throw new ValidationError(`${field} exceeds the uint256 maximum`);
  }
  return parsed;
}

/**
 * Validate an EVM address by format (0x + 40 hex, any case) and return it. A
 * well-formed but wrong address fails on-chain — format is all we enforce here.
 */
export function parseAddress(value: unknown, field: string): string {
  if (typeof value !== 'string' || !ADDRESS_RE.test(value)) {
    throw new ValidationError(`${field} must be a valid address`);
  }
  return value;
}

/** Map any thrown error to a JSON response with the appropriate status code. */
export function marketplaceErrorResponse(err: unknown): NextResponse {
  if (err instanceof MarketplaceAuthError) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode });
  }
  if (err instanceof ValidationError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof MarketplaceError) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode });
  }
  // Execution / config / unknown failure: fail loud in the logs, opaque to the
  // client (we never leak internal error detail or secrets).
  console.error('[marketplace] request failed:', err);
  return NextResponse.json({ error: 'internal_error' }, { status: 500 });
}
