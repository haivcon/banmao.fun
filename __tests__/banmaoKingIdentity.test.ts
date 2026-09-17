import { compositionCode, parseCompositionCode, compositionWatermark, metadataTraits } from "../app/collection/banmaoking/composition";
import { identifiedKingImage, kingSharePath, parseKingId } from '../app/collection/banmaoking/identity';
import { TOTAL_COMBINATIONS } from '../app/collection/banmaoking/traits';
import { tokenBadgeSvg } from '../app/collection/banmaoking/badge';

test('King catalogue has 123165 preview combinations, not minted supply', () => {
  expect(TOTAL_COMBINATIONS).toBe(123165);
});
test('IDs normalize safely and share without losing precision', () => {
  expect(parseKingId(' #0042 ')).toBe(42n);
  expect(kingSharePath(42n)).toContain('?token=42#king-lookup');
  for (const value of ['0', '-1', '1.2', '1e3', '<svg>', String(1n << 256n)]) expect(() => parseKingId(value)).toThrow();
});
test('watermark is bottom right and presentation injection is idempotent', () => {
  expect(compositionWatermark({ body: 0, expression: 1, accessory: 2, background: 1 })).toContain('x="490" y="497"');
  const image = 'data:image/svg+xml;base64,' + btoa('<svg></svg>');
  const result = identifiedKingImage(image, { body: 0, expression: 1, accessory: 2, background: 1 });
  expect(atob(result.split(',')[1])).toContain('banmao-01020302</text>');
  expect(identifiedKingImage(result, { body: 0, expression: 1, accessory: 2, background: 1 })).toBe(result);
});
test('composition label has no panel and matches token ID color on every background', () => {
  for (let background = 0; background < 16; background++) {
    const watermark = compositionWatermark({ body: 0, expression: 0, accessory: 0, background });
    const color = background === 3 || background === 4 ? '#ffe9a0' : '#634323';
    expect(watermark).not.toContain('<rect');
    expect(watermark).toContain(`fill="${color}"`);
    expect(tokenBadgeSvg(42, background)).toContain(`fill="${color}"`);
  }
});
test('logo shrinks to half size while retaining 75 cells and 45 logo tiles', () => {
  const svg = tokenBadgeSvg(42);
  expect(svg.match(/<rect /g)).toHaveLength(75);
  expect(svg.match(/--logo-lit:1/g)).toHaveLength(45);
  expect(svg).toContain('values="4;4;4.5;4.5;4;4"');
});

test('all 123165 compositions round trip without collisions', () => {
  const seen = new Set<string>();
  for (let body = 0; body < 15; body++) for (let expression = 0; expression < 21; expression++) for (let accessory = 0; accessory < 23; accessory++) for (let background = 0; background < 17; background++) {
    const traits = { body, expression, accessory, background };
    const code = compositionCode(traits);
    if (JSON.stringify(parseCompositionCode(code)) !== JSON.stringify(traits)) throw new Error(code);
    seen.add(code);
  }
  expect(seen.size).toBe(123165);
});
test('codes reject missing, zero, overflow and malformed groups', () => {
  for (const code of ['banmao-00010101', 'banmao-18010101', 'banmao-01220101', 'banmao-01012401', 'banmao-01010118', 'banmao-1232', 'banmao-01aa0101']) expect(() => parseCompositionCode(code)).toThrow();
  expect(parseCompositionCode(' BANMAO-01020302 ')).toEqual({ body: 0, expression: 1, accessory: 2, background: 1 });
  expect(() => metadataTraits([])).toThrow();
  expect(metadataTraits([{ trait_type: 'Body', value: 'Golden Banana' }, { trait_type: 'Expression', value: 'Joy' }, { trait_type: 'Accessory', value: 'Red Bow' }, { trait_type: 'Background', value: 'Cyberpunk Nexus' }])).toEqual({ body: 0, expression: 1, accessory: 2, background: 1 });
});
