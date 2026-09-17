import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BODY_TRAITS, ACCESSORY_TRAITS, TOTAL_COMBINATIONS } from '../app/collection/banmaoking/traits';
import { previewSvg } from '../app/collection/banmaoking/smil-preview';
import { bodyEffects } from '../app/collection/banmaoking/body-effects';
import frost from '../app/collection/banmaoking/frost-suit-contract.json';
import { miniTraits } from '../app/collection/banmaoking/mini-companions';

const source = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
test('Frost is appended, plant retired, supply and NFT mixed radix agree', () => {
  expect(BODY_TRAITS[14]).toEqual({ name: 'Frost Suit', color: '#b4efff', shade: '#4e9fc9' });
  expect(ACCESSORY_TRAITS).toHaveLength(23);
  expect(ACCESSORY_TRAITS[19]).toBe('Bubble Blaster');
  expect(ACCESSORY_TRAITS[20]).toBe('Imperial Regalia');
  expect(TOTAL_COMBINATIONS).toBe(123165);
  const nft = source('contracts/BanmaoKing/NFT/BanmaoKingNFT.sol');
  expect(nft).toContain('15 * 21 * 23 * 17');
  expect(nft).toContain('combination % 15');
  expect(nft).toContain('combination % 23');
  expect(nft).toContain('combination /= 15');
  expect(nft).toContain('combination /= 23');
  expect(source('contracts/BanmaoKing/Lib/BanmaoKingAccessoryExpansion.sol')).not.toMatch(/Carnivorous|carnivorous|_plant/);
  expect(bodyEffects(14)).toBe(frost);
});
test('Frost renders with every expression and accessory without broken SVG references', () => {
  for (let expression = 0; expression < 21; expression++) {
    for (let accessory = 0; accessory < 23; accessory++) {
      const svg = previewSvg({ body: 14, expression, accessory, background: 0 }, 123165, 'frost');
      expect(svg).toContain('data-frost-suit="true"');
      expect(svg.match(/data-frost-stem="true"/g)).toHaveLength(1);
      expect(svg).toContain('data-frost-stem-cut="true"');
      expect(svg.match(/data-body-tip="frost"/g)).toHaveLength(1);
      expect(svg).toContain('stroke="#285674"');
      expect(svg).not.toContain('M233 36L239 12');
      expect(svg).toContain('#b4efff');
      expect(svg).not.toMatch(/undefined|NaN|<script|carnivorous/);
      const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
      expect(new Set(ids).size).toBe(ids.length);
    }
  }
});
test('mini catalogue cannot emit retired plant and includes Frost', () => {
  const bodies = new Set<number>();
  for (let id = 0; id < 300; id++) for (const slot of [0, 1]) {
    const t = miniTraits(id, slot);
    expect(t.accessory).toBeLessThan(23);
    expect(t.accessory).not.toBe(21);
    bodies.add(t.body);
  }
  expect(bodies.has(14)).toBe(true);
});
