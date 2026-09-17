import { BODY_TRAITS, ACCESSORY_TRAITS, TOTAL_COMBINATIONS } from '../app/collection/banmaoking/traits';
import { bodyEffects } from '../app/collection/banmaoking/body-effects';
import { previewSvg } from '../app/collection/banmaoking/smil-preview';
import { KING_PRESET } from '../app/collection/banmaoking/king-regalia';
import { traitLabels } from '../app/collection/banmaoking/i18n/traits';
import accessories from '../app/collection/banmaoking/new-accessories-contract.json';

describe('BanmaoKing catalog v2', () => {
  test('removes old bodies and keeps contiguous IDs and matching localized labels', () => {
    expect(BODY_TRAITS.map(x => x.name)).toEqual(['Golden Banana', 'Ripe Sunshine', 'Lime Banana', 'Peach Banana', 'Cyborg Suit', 'Cosmic Suit', 'Bitcoin Suit', 'Ethereum Suit', 'OKB Suit', 'Developer Suit', 'Office Suit', 'Nature Suit', 'Royal Suit', "King's Gold", "Frost Suit"]);
    expect(KING_PRESET.body).toBe(13);
    expect(TOTAL_COMBINATIONS).toBe(15 * 21 * 23 * 17);
    for (const groups of Object.values(traitLabels)) expect(groups[0]).toHaveLength(15);
  });
  test('preserves accessory 19/20 and appends approved props', () => {
    expect(ACCESSORY_TRAITS.slice(19)).toEqual(['Bubble Blaster', 'Imperial Regalia', 'Mini Companions', 'Boxing Gloves']);
    for (let accessory = 21; accessory <= 22; accessory++) {
      if (accessory !== 21) expect(accessories[accessory - 21]).toContain('<animate');
      expect(accessories[accessory - 21]).not.toContain('<script');
      for (let body = 0; body < 15; body++) {
        expect(previewSvg({body, accessory, expression: 0, background: 0}, 1, 'catalog')).toContain('data-prop=');
      }
    }
  });
  test('new props have distinct attachments and localized names', () => {
    expect(traitLabels.vi[2].slice(21)).toEqual(['Cặp bạn mini', 'Găng boxing']);
    expect(accessories[0]).toContain('data-prop="mini-companions"');
    expect(accessories[0]).not.toContain('smil-king-held-arm');
    expect(accessories[1]).toContain('id="smil-king-held-arm-left"');
    expect(accessories[1]).toContain('id="smil-king-held-arm"');
    expect(accessories[1]).toContain('id="smil-king-prop-wrist-left"');
    expect(accessories[1]).toContain('id="smil-king-prop-wrist-right"');
    expect(accessories[1]).not.toContain('id="smil-king-held-wrist"');
    expect(accessories[1]).not.toContain('smil-king-boxing-wrist-left');
    expect(accessories[1]).toContain('data-glove-energy="true"');
    expect(accessories[0]).not.toContain('baby-dragon');
    for (const svg of accessories) expect(svg).not.toMatch(/banana-boomerang|hologram-shield|treasure-key/);
    for (let expression = 0; expression < 21; expression++) {
      for (let accessory = 21; accessory <= 22; accessory++) {
        const svg = previewSvg({ body: 0, accessory, expression, background: 0 }, 1, 'newprops');
        const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
        expect(new Set(ids).size).toBe(ids.length);
        expect(svg).not.toContain('undefined');
      }
    }
  });
  test.each([1, 6, 7, 8, 9, 12])('badge %i has an opaque backing covering stump bounds', id => {
    const svg = bodyEffects(id);
    expect(svg).toContain('translate(272 470)');
    expect(svg).toContain('<circle r="21" fill="#453545"');
    expect(svg).toContain('scale(.82)');
    // Include two SVG units of stroke margin around the reported stump bounds.
    for (const x of [256, 288]) for (const y of [460, 482]) {
      expect(Math.hypot(x - 272, y - 470)).toBeLessThan(21);
    }
  });
});
