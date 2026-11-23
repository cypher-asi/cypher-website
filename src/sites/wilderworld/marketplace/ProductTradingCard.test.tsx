import {describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,within} from '@testing-library/react';
import ProductTradingCard from './ProductTradingCard';
import EditionSummary from './EditionSummary';
import {ProductMaterialPicker} from './GameProductDetails';
import {findMarketProduct} from './catalog';
import {getProposedEdition} from './limited-editions';
import {demoRecentActivity} from './demo-market';
import {formatMoney} from './market-data';

const product=findMarketProduct('vehicle-ghostline')!;
describe('compact product trading and edition selection',()=>{
  it('links to the full market and updates the exact selected edition fixture',()=>{
    const first=product.variants[0],second=product.variants[1];
    const view=render(<ProductTradingCard productId={product.id} variantId={first.id} variantName={first.name} previewPriceCents={product.priceCents}/>);
    expect(screen.getByRole('link')).toHaveAttribute('href','#product-trading');
    expect(screen.getByText('Sample data')).toBeVisible();
    const expected=demoRecentActivity({productId:product.id,variantId:first.id},product.priceCents,Date.now()).at(-1)!;
    expect(screen.getByText(formatMoney(expected.price))).toBeVisible();
    const chart=screen.getByRole('img').innerHTML;
    view.rerender(<ProductTradingCard productId={product.id} variantId={second.id} variantName={second.name} previewPriceCents={product.priceCents}/>);
    expect(screen.getByRole('link')).toHaveAccessibleName(`View ${second.name} trading activity`);
    expect(screen.getByRole('img').innerHTML).not.toBe(chart);
  });
  it('keeps edition details collapsed and never reports planned units as remaining stock',()=>{
    const first=product.variants[0],second=product.variants.at(-1)!;
    const view=render(<><ProductMaterialPicker productId={product.id} options={product.variants} selectedId={first.id} onSelect={vi.fn()}/><EditionSummary productId={product.id} variantId={first.id}/></>);
    const details=screen.getByLabelText('Limited edition details');
    expect(details).not.toHaveAttribute('open');
    fireEvent.click(within(details).getByText('Edition details'));
    expect(details).toHaveAttribute('open');
    // The "Remaining" row is hidden for v1; only the Quantity row shows.
    expect(screen.queryByLabelText('Remaining stock unavailable')).toBeNull();
    expect(within(screen.getByLabelText('Edition supply')).getByText(`${getProposedEdition(product.id,first.id)!.proposedSupplyCap}`)).toBeVisible();
    view.rerender(<ProductMaterialPicker productId={product.id} options={product.variants} selectedId={second.id} onSelect={vi.fn()}/>);
    expect(within(screen.getByLabelText('Edition supply')).getByText(`${getProposedEdition(product.id,second.id)!.proposedSupplyCap}`)).toBeVisible();
    expect(screen.queryByLabelText('Remaining stock unavailable')).toBeNull();
  });
});
