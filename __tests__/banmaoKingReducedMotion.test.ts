import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { previewSvg } from '../app/collection/banmaoking/smil-preview';

const root = join(process.cwd(), 'app/collection/banmaoking');
test('NFT runtime has no reduced-motion branch, hook, freeze utility or override', () => {
  expect(existsSync(join(root, 'useReducedMotion.ts'))).toBe(false);
  for (const file of readdirSync(root).filter(file => /\.(ts|tsx|css)$/.test(file) && file !== 'contract-directory.ts')) {
    expect(readFileSync(join(root, file), 'utf8')).not.toMatch(/prefers-reduced-motion|freezeChoreography|reducedMotion|reducedStyle|data-motion-override/);
  }
});

test.each(Array.from({ length: 21 }, (_, i) => i))('expression %i always exports looping animation', expression => {
  expect(previewSvg).toHaveLength(3);
  const svg = previewSvg({ body: 16, expression, accessory: 20, background: 16 }, 1, 'animated');
  expect(svg).toContain('<animateTransform');
  expect(svg).toContain('repeatCount="indefinite"');
  expect(svg).not.toContain('prefers-reduced-motion');
});
