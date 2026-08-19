import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { VehiclesComingSoon } from '@/sites/wilderworld/VehiclesComingSoon';
import { isPreviewToken, previewCookieName, vehiclesLive } from '@/features/vehicles/preview';

/**
 * Launch gate for the vehicles funnel.
 *
 * Until VEHICLES_LIVE=true, the store, detail, and checkout all render the
 * coming-soon teaser, so the unfinished purchase flow (payment + on-chain mint
 * still in progress) is never publicly usable. Set the env var per environment
 * to open it (e.g. on staging to run the end-to-end while prod stays gated),
 * then flip it in prod to go live.
 *
 * A holder of the preview token (see /api/vehicles/preview) gets through while
 * it stays closed to everyone else, so the funnel can be reviewed in place on
 * the real domain without being published.
 *
 * The live check runs first and returns without touching cookies, so once the
 * funnel is public these pages can still render statically — only the gated
 * path opts into dynamic rendering.
 */
export default async function VehiclesLayout({ children }: { children: ReactNode }) {
  if (vehiclesLive()) return <>{children}</>;

  const jar = await cookies();
  if (isPreviewToken(jar.get(previewCookieName())?.value)) return <>{children}</>;

  return <VehiclesComingSoon />;
}
