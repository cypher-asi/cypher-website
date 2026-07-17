/* ---------------------------------------------------------------------------
   Price formatting helpers for the Market.

   Prices are shown in USD (converted from ETH via a live rate), while any raw
   ETH values render with a consistent number of decimals so the rail lines up.
   --------------------------------------------------------------------------- */

/** Fixed decimals for ETH so every price uses the same precision. */
export const ETH_DECIMALS = 3;

export function formatEth(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(value)) return null;
  return `${value.toFixed(ETH_DECIMALS)} ETH`;
}

/**
 * Convert an ETH amount to a formatted USD string using the given rate
 * (USD per 1 ETH). Returns null when either input is missing.
 */
export function formatUsd(
  ethValue: number | null | undefined,
  ethUsdRate: number | null | undefined
): string | null {
  if (ethValue == null || Number.isNaN(ethValue)) return null;
  if (!ethUsdRate || Number.isNaN(ethUsdRate)) return null;
  const usd = ethValue * ethUsdRate;
  const fractionDigits = usd >= 1000 ? 0 : 2;
  return usd.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/**
 * Format a WILD-denominated price for display. Z-Chain listings settle in WILD
 * and there is no WILD/USD feed, so we show the token amount directly (e.g.
 * "1.5 WILD"). `formatted` is the indexer's human-readable `priceFormatted`.
 */
export function formatWild(formatted: string | null | undefined): string | null {
  if (formatted == null || formatted === '') return null;
  return `${formatted} WILD (Z Chain)`;
}

/**
 * Parse a WILD amount entered as a decimal string (e.g. "5", "5.875") to raw
 * 18-decimal wei. Returns null if malformed, over 18 decimals, or not > 0.
 */
export function parseWildToWei(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed === '' || trimmed === '.' || !/^\d*\.?\d*$/.test(trimmed)) return null;
  const [whole, frac = ''] = trimmed.split('.');
  if (frac.length > 18) return null;
  const wei =
    BigInt(whole || '0') * BigInt(10) ** BigInt(18) +
    BigInt((frac + '0'.repeat(18)).slice(0, 18) || '0');
  return wei > BigInt(0) ? wei.toString() : null;
}
