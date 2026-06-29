/**
 * Provider-agnostic analytics boundary.
 *
 * This is a stub: it is a no-op until a real provider (PostHog, Plausible,
 * etc.) is wired via `setAnalyticsProvider`. Call sites import `track` /
 * `pageview` and never depend on a specific vendor.
 */
import type { CompanyKey } from '@/lib/companies/types';

export interface AnalyticsEvent {
  name: string;
  company?: CompanyKey;
  props?: Record<string, unknown>;
}

export interface AnalyticsProvider {
  track(event: AnalyticsEvent): void;
  pageview(path: string, company?: CompanyKey): void;
}

const noopProvider: AnalyticsProvider = {
  track: () => {},
  pageview: () => {},
};

let provider: AnalyticsProvider = noopProvider;

export function setAnalyticsProvider(next: AnalyticsProvider): void {
  provider = next;
}

export function track(name: string, props?: Record<string, unknown>): void {
  provider.track({ name, props });
}

export function pageview(path: string, company?: CompanyKey): void {
  provider.pageview(path, company);
}
