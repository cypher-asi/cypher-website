import type { ReactNode } from 'react';
import { VehiclesComingSoon } from '@/sites/wilderworld/VehiclesComingSoon';

/**
 * Launch gate for the vehicles funnel.
 *
 * Until VEHICLES_LIVE=true, the store, detail, and checkout all render the
 * coming-soon teaser, so the unfinished purchase flow (payment + on-chain mint
 * still in progress) is never publicly usable. Set the env var per environment
 * to open it (e.g. on staging to run the end-to-end while prod stays gated),
 * then flip it in prod to go live.
 */
export default function VehiclesLayout({ children }: { children: ReactNode }) {
  const live = process.env.VEHICLES_LIVE === 'true';
  return live ? <>{children}</> : <VehiclesComingSoon />;
}
