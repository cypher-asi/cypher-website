import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import VehicleCheckout from '@/sites/wilderworld/VehicleCheckout';
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

export default async function VehicleCheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pass = getVehiclePass(id);
  if (!pass) notFound();
  return <VehicleCheckout pass={pass} />;
}
