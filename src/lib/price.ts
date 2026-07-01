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
