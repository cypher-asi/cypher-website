import {describe,expect,it} from 'vitest';
import {curatedSourceProducts,findMarketProduct} from './catalog';
import {reviewedBottomwearPresentation} from './bottomwear-presentation';
import {resolveBagProduct} from '../accessories/useDemoBag';

describe('reviewed bottomwear color refresh',()=>{
  // Clothing now carries its full real colourway set, so the reviewed-photo refresh
  // (which matched the old local source images) no longer fires and is intentionally
  // inert. Products expose their real colourways directly.
  it('is inert now that products carry their real colourways',()=>{
    const source=curatedSourceProducts.find(p=>p.id==='BTWR_007')!;
    const originals=source.variants.flatMap(v=>v.image?[v.image]:[]);
    expect(reviewedBottomwearPresentation(source.id,originals)).toBeUndefined();
    const product=findMarketProduct('BTWR_007')!;
    expect(product.variants).toHaveLength(9);
    expect(new Set(product.variants.map(v=>v.id)).size).toBe(9);
  });
  it('keeps saved bag identities and resolves the colour photo and name',()=>{
    const product=findMarketProduct('BTWR_007')!;
    for(const variant of product.variants){
      const resolved=resolveBagProduct({productId:product.id,colorwayId:variant.id})!;
      expect(resolved.image).toBe(variant.image);
      expect(resolved.detail).toBe(variant.name);
      expect(resolved.href).toContain(encodeURIComponent(variant.id));
    }
  });
});
