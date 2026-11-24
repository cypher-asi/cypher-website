import { render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { findMarketProduct, marketProducts } from './catalog';
import GameProductDetails from './GameProductDetails';
import EditionSummary from './EditionSummary';
import { websiteProductDescription } from './website-product-copy';

describe('website copy is separate from locked product data', () => {
  it('leaves the entire catalog unchanged while using independent editorial paragraphs', () => {
    const before = JSON.stringify(marketProducts);
    const changed = marketProducts.filter(product => websiteProductDescription(product) !== product.description);
    expect(changed).toHaveLength(55);
    expect(changed.every(product => product.department !== 'clothing')).toBe(true);
    expect(JSON.stringify(marketProducts)).toBe(before);

    const rim = findMarketProduct('rim-preview-wertone-wantide-2010')!;
    expect(rim.description).toContain('product photography');
    expect(websiteProductDescription(Object.freeze({ ...rim }))).toContain('slender radial spokes');
    expect(websiteProductDescription({ id: 'constructor', description: 'Locked description' })).toBe('Locked description');
  });

  it('restores the product Story and agreed clothing delivery copy without replacing the selected finish', () => {
    render(<GameProductDetails productId="JCKT_001" variantId="CONCEPT-JCKT_001-01" specifications={[
      { label: 'Collection', value: '' },
      { label: 'Finish', value: 'Pit Ash' },
    ]}/>);
    expect(screen.getByText('Story')).toBeInTheDocument();
    expect(screen.getByText(findMarketProduct('JCKT_001')!.description)).toBeInTheDocument();
    expect(screen.getByText('Availability & delivery')).toBeInTheDocument();
    expect(screen.getByText('Accessible in your in-game inventory once purchased.')).toBeInTheDocument();
    expect(screen.getByText('Please make sure your Epic Games account is properly linked to your profile.')).toBeInTheDocument();
    expect(screen.queryByText('Style an eligible avatar in Wilder World. Compatibility must be confirmed for the released item.')).not.toBeInTheDocument();
    expect(screen.queryByText('Collection')).not.toBeInTheDocument();
    expect(screen.getByText('Pit Ash')).toBeInTheDocument();
    expect(screen.getByText('CONCEPT-JCKT_001-01')).toBeInTheDocument();
    expect(screen.queryByText(/not available to purchase/)).not.toBeInTheDocument();
  });

  it('preserves an authored story and unavailable state for pages without purchasing', () => {
    render(<GameProductDetails productId="furniture-sofa" story="Existing authored story."/>);
    expect(screen.getByText('Story')).toBeInTheDocument();
    expect(screen.getByText('Existing authored story.')).toBeInTheDocument();
    expect(screen.getByText('Availability & delivery')).toBeInTheDocument();
    expect(screen.getByText('Coming soon. Purchasing and in-game delivery are not yet available.')).toBeInTheDocument();
    expect(screen.queryByText(/Epic Games account/)).not.toBeInTheDocument();
  });

  it('retains all four collapsed sections and the correct delivery policy across the catalog', () => {
    const before = JSON.stringify(marketProducts);
    for (const product of marketProducts) {
      const host = document.createElement('div');
      host.innerHTML = renderToStaticMarkup(<>
        <EditionSummary productId={product.id} variantId={product.variants[0]?.id}/>
        <GameProductDetails productId={product.id} variantId={product.variants[0]?.id}/>
      </>);
      const summaries = [...host.querySelectorAll('summary')].map(node => node.textContent?.replace(/\s*\+$/, '').trim());
      expect(summaries, product.id).toEqual(['Edition details', 'Story', 'What’s included', 'Availability & delivery']);
      expect(host.querySelectorAll('details[open]'), product.id).toHaveLength(0);
      const paragraphs = [...host.querySelectorAll('p')].map(node => node.textContent);
      expect(paragraphs, product.id).toContain(websiteProductDescription(product));
      expect(paragraphs.includes('Accessible in your in-game inventory once purchased.'), product.id).toBe(product.department === 'clothing');
      expect(paragraphs.includes('Please make sure your Epic Games account is properly linked to your profile.'), product.id).toBe(product.department === 'clothing');
      expect(paragraphs.includes('Coming soon. Purchasing and in-game delivery are not yet available.'), product.id).toBe(product.department !== 'clothing');
    }
    expect(JSON.stringify(marketProducts)).toBe(before);
  });
});
