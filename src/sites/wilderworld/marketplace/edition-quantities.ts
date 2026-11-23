import quantities from './edition-quantities.json';

// Small browse projection of the existing proposal. Not inventory or mint authorization.
// Regenerate with scripts/generate-edition-quantities.mjs after edition changes.
const products: Record<string, Record<string, number>> = quantities.products;

export function getEditionQuantity(productId: string, variantId: string): number | null {
  if (!Object.hasOwn(products, productId)) return null;
  const variants = products[productId];
  if (!Object.hasOwn(variants, variantId)) return null;
  const quantity = variants[variantId];
  return Number.isSafeInteger(quantity) && quantity >= 0 ? quantity : null;
}
