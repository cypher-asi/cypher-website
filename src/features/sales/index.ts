/**
 * Provider-agnostic sales/CRM boundary.
 *
 * This is a stub: the default provider drops captured leads. Wire a real
 * provider (CRM, lead pipeline, etc.) via `setSalesProvider`.
 */
import type { CompanyKey } from '@/lib/companies/types';

export interface Lead {
  email: string;
  company?: CompanyKey;
  source?: string;
  meta?: Record<string, unknown>;
}

export interface SalesProvider {
  capture(lead: Lead): Promise<void>;
}

const noopProvider: SalesProvider = {
  async capture() {},
};

let provider: SalesProvider = noopProvider;

export function setSalesProvider(next: SalesProvider): void {
  provider = next;
}

export function captureLead(lead: Lead): Promise<void> {
  return provider.capture(lead);
}
