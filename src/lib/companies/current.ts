import { headers } from 'next/headers';
import { getCompanyConfig } from './resolve';
import type { CompanyConfig } from './types';

/**
 * Server-only helper. Reads the `x-company` header set by middleware and
 * returns the resolved company config. Use in server layouts, pages, and
 * route handlers.
 */
export async function getCurrentCompany(): Promise<CompanyConfig> {
  const h = await headers();
  return getCompanyConfig(h.get('x-company'));
}
