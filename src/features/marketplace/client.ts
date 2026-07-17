/**
 * Client-side calls to our marketplace trade routes (same-origin, so the session
 * cookie is sent automatically). Each resolves only after the tx is mined — a
 * returned hash is a settled trade — or throws with a user-facing message.
 */
async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data?.error || fallback;
  } catch {
    return fallback;
  }
}

async function execute(path: string, listingId: string, fallback: string): Promise<string> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listingId }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, fallback));
  const data = (await res.json()) as { transactionHash?: string };
  if (!data.transactionHash) throw new Error(fallback);
  return data.transactionHash;
}

/** Buy a listing outright. Returns the settled tx hash. */
export function buyListing(listingId: string): Promise<string> {
  return execute('/api/marketplace/buy', listingId, 'The purchase could not be completed');
}

/** Cancel your own listing. Returns the settled tx hash. */
export function cancelListing(listingId: string): Promise<string> {
  return execute('/api/marketplace/cancel', listingId, 'The listing could not be cancelled');
}
