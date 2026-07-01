import { redirect } from 'next/navigation';

/**
 * The item detail is now shown as an in-page modal on /market. Any deep link to
 * the old per-item route redirects into the market with the modal open so the
 * back button returns to the collection with scroll preserved.
 */
export default async function MarketItemRedirect({
  params,
}: {
  params: Promise<{ slug: string; tokenId: string }>;
}) {
  const { slug, tokenId } = await params;
  redirect(`/market?c=${encodeURIComponent(slug)}&token=${encodeURIComponent(tokenId)}`);
}
