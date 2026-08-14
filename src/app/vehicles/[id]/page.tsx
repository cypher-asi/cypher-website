import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import GhostlineDetail from '@/sites/wilderworld/GhostlineDetail';
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
  return { title: pass ? `${pass.name} — Wilder World` : 'Ghostline — Wilder World' };
}

export default async function VehiclePassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pass = getVehiclePass(id);
  if (!pass) notFound();
  return <GhostlineDetail pass={pass} />;
}
