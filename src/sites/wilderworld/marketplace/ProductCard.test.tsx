import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductCard } from './ProductCard';
import { featuredMaterial, findMarketProduct, productHref, type Variant } from './catalog';
import { getProposedEdition, LIMITED_EDITION_PROPOSAL } from './limited-editions';
import { getEditionQuantity } from './edition-quantities';
import projection from './edition-quantities.json';

vi.mock('./WildPriceQuote', () => ({ default: () => null }));

const product = findMarketProduct('furniture-sofa')!;
function expectVariant(variant: Variant) {
  const card = within(screen.getByRole('article', { name: product.name }));
  const stock = within(card.getByLabelText(`${variant.name} edition supply`));
  expect(stock.getByText(getProposedEdition(product.id, variant.id)!.proposedSupplyCap.toLocaleString('en-US'))).toBeVisible();
  // The "Remaining" row is hidden for v1 (no live inventory feed); only Quantity shows.
  expect(stock.queryByLabelText('Remaining stock unavailable')).toBeNull();
  expect(card.getByRole('img')).toHaveAttribute('src', variant.thumbnail ?? variant.image);
  for (const link of card.getAllByRole('link')) expect(link).toHaveAttribute('href', productHref(product, variant));
}

describe('collection card edition quantities', () => {
  it('matches the displayed default finish, then a filtered finish, in grid and list views', () => {
    const first = featuredMaterial(product)!;
    const alternate = product.variants.find(v => v.image && getProposedEdition(product.id, v.id)?.proposedSupplyCap !== getProposedEdition(product.id, first.id)?.proposedSupplyCap)!;
    expect(alternate).toBeDefined();
    const view = render(<ProductCard product={product}/>);
    expectVariant(first);
    view.rerender(<ProductCard product={product} preferredFinish={alternate.name.toLowerCase()} list/>);
    expectVariant(alternate);
    view.rerender(<ProductCard product={product} preferredFinish="all"/>);
    expectVariant(first);
  });

  it('does not substitute another edition or invent remaining stock for an unknown variant', () => {
    const variant = { ...product.variants[0], id: 'unapproved-finish', name: 'Unapproved finish' };
    render(<ProductCard product={{ ...product, variants: [variant] }} preferredFinish={variant.name}/>);
    const stock = within(screen.getByLabelText('Unapproved finish edition supply'));
    // Only the Quantity row remains (Remaining is hidden for v1); an unknown variant shows one em-dash.
    expect(stock.getAllByText('—')).toHaveLength(1);
    expect(getEditionQuantity('unknown-product', product.variants[0].id)).toBeNull();
    expect(getEditionQuantity(product.id, 'constructor')).toBeNull();
    expect(getEditionQuantity('constructor', 'prototype')).toBeNull();
  });

  it('keeps the small browse projection identical to every exact edition in the proposal', () => {
    expect(projection.version).toBe(LIMITED_EDITION_PROPOSAL.version);
    const expected = Object.fromEntries(LIMITED_EDITION_PROPOSAL.products.map(p => [p.productId, Object.fromEntries(p.variants.map(v => [v.variantId, v.proposedSupplyCap]))]));
    expect(projection.products).toEqual(expected);
    for (const p of LIMITED_EDITION_PROPOSAL.products) for (const v of p.variants) {
      expect(getEditionQuantity(p.productId, v.variantId)).toBe(v.proposedSupplyCap);
    }
  });
});
