import { NextResponse } from 'next/server';
import { getEntryBySlug } from '@/lib/wilderCollections';
import { openseaFetch } from '@/lib/opensea';

export const revalidate = 300;

export type TraitCategory = {
  type: string;
  values: Array<{ value: string; count: number }>;
};

type OpenSeaTraitsResponse = {
  // OpenSea returns: { categories: {...}, counts: { <trait_type>: { <value>: count } } }
  counts?: Record<string, Record<string, number>>;
};

/**
 * GET /api/market/traits?slug=<collection>
 * Returns aggregated trait categories + value counts for a collection so the
 * market can render an OpenSea-style trait filter panel.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const entry = slug ? getEntryBySlug(slug) : undefined;
  if (!entry) return NextResponse.json({ categories: [] });

  const data = await openseaFetch<OpenSeaTraitsResponse>(
    `/traits/${encodeURIComponent(entry.slug)}`
  );

  if (!data?.counts) return NextResponse.json({ categories: [] });

  const categories: TraitCategory[] = Object.entries(data.counts)
    .map(([type, values]) => ({
      type,
      values: Object.entries(values)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => a.type.localeCompare(b.type));

  return NextResponse.json({ categories });
}
