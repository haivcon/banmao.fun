import { miniTraits } from '../app/collection/banmaoking/mini-companions';
import { previewSvg } from '../app/collection/banmaoking/smil-preview';
import { utils } from 'ethers';

describe('Mini Companions accessory 21', () => {
  test('independent deterministic selections cover the catalog without recursion', () => {
    const bodies = new Set(), expressions = new Set(), accessories = new Set();

    for (let tokenId = 0; tokenId < 250; tokenId++) {
      for (const slot of [0, 1]) {
        const t = miniTraits(tokenId, slot);
        expect(t).toEqual(miniTraits(tokenId, slot));
        expect(t.accessory).toBeGreaterThanOrEqual(0);
        expect(t.accessory).not.toBe(21);
        bodies.add(t.body); expressions.add(t.expression); accessories.add(t.accessory);
      }

    }
    expect(bodies.size).toBe(15); expect(expressions.size).toBe(21); expect(accessories.size).toBe(22);
    expect(accessories.has(0)).toBe(true);
    expect(miniTraits(4801, 0)).not.toEqual(miniTraits(4801, 1));
    expect(() => miniTraits(1, 2)).toThrow();
  });
  test('embeds exactly two isolated self-contained SVG characters, not dragons', () => {
    const svg = previewSvg({body:0, expression:0, accessory:21, background:0}, 42, 'mini-test');
    const images = [...svg.matchAll(/<image data-mini="([01])"[^>]+href="data:image\/svg\+xml;base64,([^"]+)"/g)];
    expect(images).toHaveLength(2);
    for (const [slot, image] of images.entries()) {
      expect(image[0]).toContain(`x="${slot === 0 ? 24 : 348}" y="334" width="140" height="140"`);
      expect(image.index).toBeGreaterThan(svg.indexOf('id="mini-test-king-action-root"'));
      expect(image.index).toBeGreaterThan(svg.indexOf('<rect'));
    }
    // Nothing is painted after the pair, including badges and world effects.
    expect(svg.endsWith(images[1][0] + '/>')).toBe(true);
    expect(svg).not.toContain('baby-dragon');
    for (const image of images) {
      const child = utils.toUtf8String(utils.base64.decode(image[2]));
      const t = miniTraits(42, Number(image[1]));
      expect(child).toContain(`data-accessory="${t.accessory}"`);
      expect(child).not.toContain('data-mini=');
      expect(child).not.toContain('<script');
      expect(child).not.toContain('undefined');
      expect(child).not.toContain('<g class="king-particles"');
      const ids = [...child.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
