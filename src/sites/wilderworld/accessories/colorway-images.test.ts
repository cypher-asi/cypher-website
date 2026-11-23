import { describe, expect, it } from 'vitest';
import colorways from './colorway-images.json';

// Every colour swatch is filled from its variant's `primary`. An empty value renders an
// empty swatch box, which is how Off-Record (EYWR_015) and FTWR_N30 lost theirs when the
// full 160-product / 1440-colourway catalogue was swapped in. Guard against a repeat.
describe('colorway swatch colours', () => {
  it('gives every variant of every product a swatch colour', () => {
    const missing = Object.entries(colorways as Record<string, { id: string; primary: string }[]>).flatMap(
      ([product, variants]) =>
        variants.filter((v) => !/^#[0-9A-Fa-f]{6}$/.test(v.primary)).map((v) => `${product}: ${v.id}`)
    );
    expect(missing).toEqual([]);
  });

  it('uses the standard finish palette for Off-Record and FTWR_N30, like the other eyewear and footwear', () => {
    const palette = {
      oxide: '#A34F36',
      glacier: '#90AFBC',
      ultraviolet: '#62537D',
      moss: '#526147',
      chrome: '#ADB4BB',
      acid: '#BAC762',
    };
    const byId = Object.fromEntries(
      Object.values(colorways as Record<string, { id: string; primary: string }[]>)
        .flat()
        .map((v) => [v.id, v.primary])
    );
    for (const product of ['EYWR_015', 'FTWR_N30', 'EYWR_014', 'FTWR_010']) {
      for (const [finish, colour] of Object.entries(palette)) {
        expect(byId[`MAT-${product}-${finish}`]).toBe(colour);
      }
    }
  });
});
