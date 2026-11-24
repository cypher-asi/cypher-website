import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ProductImage, clothingThumbnail } from './ProductCard';
import type { MarketProduct } from './catalog';

const ORIGINAL = 'https://assets.wilderworldinfra.net/clothing/images/CONCEPT-TPWR_001-01.png';
const THUMB = 'https://assets.wilderworldinfra.net/clothing/thumbs/CONCEPT-TPWR_001-01.webp';
const product = {
  id: 'TPWR_001',
  name: 'Open Pattern',
  department: 'clothing',
  image: ORIGINAL,
  variants: [{ id: 'CONCEPT-TPWR_001-01', name: 'One', image: ORIGINAL, swatch: '#000000', status: 'x' }],
} as unknown as MarketProduct;

describe('clothingThumbnail', () => {
  it('maps a CDN clothing image to its small copy', () => {
    expect(clothingThumbnail(ORIGINAL)).toBe(THUMB);
    expect(clothingThumbnail('https://assets.wilderworldinfra.net/clothing/images/MAT-X-oxide.webp')).toBe(
      'https://assets.wilderworldinfra.net/clothing/thumbs/MAT-X-oxide.webp'
    );
  });

  it('leaves other images alone', () => {
    expect(clothingThumbnail('/images/local.webp')).toBeUndefined();
    expect(clothingThumbnail('https://example.com/clothing/images/x.png')).toBeUndefined();
  });
});

describe('ProductImage grid tile', () => {
  it('uses the small copy, then falls back to the original, then to the placeholder', () => {
    render(<ProductImage product={product} compact />);
    const img = screen.getByRole('img', { name: 'Open Pattern' });
    expect(img).toHaveAttribute('src', THUMB);
    fireEvent.error(img);
    expect(screen.getByRole('img', { name: 'Open Pattern' })).toHaveAttribute('src', ORIGINAL);
    fireEvent.error(screen.getByRole('img', { name: 'Open Pattern' }));
    expect(screen.queryByRole('img', { name: 'Open Pattern' })).toBeNull();
    expect(screen.getByText('Image coming soon')).toBeInTheDocument();
  });

  it('keeps the full-size image on product pages', () => {
    render(<ProductImage product={product} />);
    expect(screen.getByRole('img', { name: 'Open Pattern' })).toHaveAttribute('src', ORIGINAL);
  });
});
