import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import GhostlineCheckout from '@/sites/wilderworld/GhostlineCheckout';
import { VEHICLE_PASSES, getVehiclePass } from '@/sites/wilderworld/vehicles';

export function generateStaticParams() {
  return VEHICLE_PASSES.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pass = getVehiclePass(id);
  return { title: pass ? `Checkout — ${pass.name}` : 'Checkout — Ghostline' };
}

export default async function GhostlineCheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pass = getVehiclePass(id);
  if (!pass) notFound();
  return <GhostlineCheckout pass={pass} />;
}
