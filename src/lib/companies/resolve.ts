import { COMPANIES, DEFAULT_COMPANY, DOMAIN_TO_COMPANY } from './registry';
import type { CompanyConfig, CompanyKey } from './types';

function isCompanyKey(value: string): value is CompanyKey {
  return value in COMPANIES;
}

/** Returns the value as a valid CompanyKey, or null if unknown/missing. */
export function normalizeCompany(value: string | null | undefined): CompanyKey | null {
  return value && isCompanyKey(value) ? value : null;
}

/**
 * Resolves a request host (e.g. "zode.org", "www.zode.org:443",
 * "zode.localhost:3000") to a company key. Falls back to the default company.
 *
 * Dev convenience: a leading subdomain that matches a company key works too,
 * so `zode.localhost:3000` resolves to `zode` without real DNS.
 */
export function resolveCompanyKey(host: string | null | undefined): CompanyKey {
  if (!host) return DEFAULT_COMPANY;
  const hostname = host.split(':')[0].toLowerCase();

  if (DOMAIN_TO_COMPANY[hostname]) return DOMAIN_TO_COMPANY[hostname];

  const sub = hostname.split('.')[0];
  if (isCompanyKey(sub)) return sub;

  return DEFAULT_COMPANY;
}

/**
 * Returns the full company config for a key (or the value of the `x-company`
 * header). Falls back to the default company for unknown/missing values.
 */
export function getCompanyConfig(key: string | null | undefined): CompanyConfig {
  if (key && isCompanyKey(key)) return COMPANIES[key];
  return COMPANIES[DEFAULT_COMPANY];
}
