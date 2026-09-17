import { KING_THEME_PRESETS, filterKingPresets, THEME_CATEGORIES } from '../app/collection/banmaoking/theme-presets';
import { BODY_TRAITS, EXPRESSION_TRAITS, ACCESSORY_TRAITS, BACKGROUND_TRAITS } from '../app/collection/banmaoking/traits';

describe('curated King Theme Lab', () => {
  it('provides 24 unique, valid combinations without removed accessory 23', () => {
    expect(KING_THEME_PRESETS).toHaveLength(24);
    expect(new Set(KING_THEME_PRESETS.map(p => p.name)).size).toBe(24);
    expect(new Set(KING_THEME_PRESETS.map(p => `${p.body}/${p.expression}/${p.accessory}/${p.background}`)).size).toBe(24);
    for (const p of KING_THEME_PRESETS) {
      [p.body, p.expression, p.accessory, p.background].forEach((id, index) => {
        expect(Number.isInteger(id)).toBe(true);
        expect(id).toBeGreaterThanOrEqual(0);
        expect(id).toBeLessThan([BODY_TRAITS, EXPRESSION_TRAITS, ACCESSORY_TRAITS, BACKGROUND_TRAITS][index].length);
      });
      expect(p.accessory).not.toBe(23);
    }
  });
  it('repairs historical body offsets without remapping trait IDs', () => {
    expect(KING_THEME_PRESETS.find(p => p.name === 'Cosmic')?.body).toBe(5);
    expect(KING_THEME_PRESETS.find(p => p.name === 'Nature')?.body).toBe(11);
    expect(KING_THEME_PRESETS.find(p => p.name === 'Royal')?.accessory).toBe(19);
    expect(KING_THEME_PRESETS.find(p => p.name === 'King')).toMatchObject({ body: 13, expression: 20, accessory: 20, background: 16 });
    expect(KING_THEME_PRESETS.find(p => p.name === 'Frost Monarch')?.body).toBe(14);
  });
  it('filters categories, names and traits, including empty searches', () => {
    expect(filterKingPresets('all', '  FROST  ').length).toBeGreaterThan(0);
    expect(filterKingPresets('all', 'not-a-theme')).toEqual([]);
    expect(filterKingPresets('all', ' ')).toHaveLength(24);
    for (const category of THEME_CATEGORIES.slice(1)) {
      const result = filterKingPresets(category, '');
      expect(result.length).toBeGreaterThan(0);
      expect(result.every(p => p.category === category)).toBe(true);
    }
  });
});
