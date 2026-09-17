import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import royal from '../app/collection/banmaoking/royal-contract.json';
import { previewSvg } from '../app/collection/banmaoking/smil-preview';
import { compositionWatermark } from '../app/collection/banmaoking/composition';
import { identityInk, identityOutline } from '../app/collection/banmaoking/contract-identity';
import { BODY_TRAITS, BACKGROUND_TRAITS } from '../app/collection/banmaoking/traits';

const root = path.resolve(__dirname, '..');
test('royal artwork and identity are generated downstream from Solidity', () => {
  for (const tool of ['sync-king-royal.cjs', 'sync-king-identity.cjs']) {
    execFileSync(process.execPath, [path.join(root, 'tools', tool), '--check'], { cwd: root });
  }
  const source = fs.readFileSync(path.join(root, 'app/collection/banmaoking/smil-preview.ts'), 'utf8');
  expect(source).not.toContain("from './king-solar'");
  expect(source).not.toContain("from './king-regalia'");
  expect(BODY_TRAITS[13].name).toBe(royal.BODY_NAME);
  expect(BACKGROUND_TRAITS[16].name).toBe(royal.BACKGROUND_NAME);
});
test.each([0, 1, 2, 3, 4, 5])('royal composition retains its layers and unique gradient in pose %i', pose => {
  const svg = previewSvg({ body: 13, expression: 20, accessory: 20, background: 16 }, pose, 'royal');
  expect(svg).toContain('king-imperial-mantle');
  expect(svg).toContain('king-imperial-regalia');
  expect(svg).toContain('king-solar-emblem');
  expect(svg.match(/id="royal-bk-peel"/g)).toHaveLength(1);
  expect(svg.indexOf('king-imperial-mantle')).toBeLessThan(svg.indexOf('id="royal-body"'));
  expect(svg).toContain('banmao-14212117');
  expect(svg).toContain('<animate');
});
test.each(Array.from({ length: 17 }, (_, i) => i))('watermark is compact, inset and contrasting on background %i', background => {
  const svg = compositionWatermark({ body: 0, expression: 0, accessory: 0, background });
  expect(svg).toContain('x="506" y="505"');
  expect(svg).toContain('font-size="11"');
  expect(svg).toContain(`fill="${identityInk(background)}"`);
  expect(svg).toContain(`stroke="${identityOutline(background)}"`);
  expect(identityInk(background)).not.toBe(identityOutline(background));
});
