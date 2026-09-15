import sharp from 'sharp';
import { previewSvg } from '../app/collection/banmaoking/smil-preview';
import { accessoryLabEffects } from '../app/collection/banmaoking/accessory-lab';
import { KING_PRESET } from '../app/collection/banmaoking/king-regalia';
import { compositionCode, parseCompositionCode } from '../app/collection/banmaoking/composition';
import { TOTAL_COMBINATIONS } from '../app/collection/banmaoking/traits';

test('King is an append-only, shareable four-layer preset', () => {
  expect(parseCompositionCode(compositionCode(KING_PRESET))).toEqual({body:16,expression:20,accessory:20,background:16});
  expect(TOTAL_COMBINATIONS).toBe(127449);
  const svg = previewSvg(KING_PRESET, 0, 'king');
  expect(svg.indexOf('class="king-imperial-mantle"')).toBeLessThan(svg.indexOf('id="king-body"'));
  expect(svg).toContain('king-imperial-regalia');
  expect(svg).toContain('king-royal-decree');
});
test('nineteen accessories have distinct added choreography; None stays empty', () => {
  expect(accessoryLabEffects(0)).toBe('');
  const effects = Array.from({length:19}, (_,i)=>accessoryLabEffects(i+1));
  expect(new Set(effects).size).toBe(19);
  effects.forEach(svg=>expect(svg).toContain('<animate'));
});
test.each(Array.from({length:21},(_,i)=>i))('accessory %i renders valid SVG across all six poses with scoped references', async accessory => {
  for(let pose=0;pose<6;pose++) {
    const svg = previewSvg({...KING_PRESET, accessory},pose,'audit');
    const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every(id=>id.startsWith('audit-'))).toBe(true);
    for(const [,ref] of svg.matchAll(/(?:href="#|url\(#)([^"\)]+)/g)) expect(ids).toContain(ref);
    expect(svg).not.toMatch(/undefined|NaN|__MOOD__/);
    const image = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${svg}</svg>`)).resize(128,128).png().toBuffer();
    expect(image.length).toBeGreaterThan(1000);
  }
});
