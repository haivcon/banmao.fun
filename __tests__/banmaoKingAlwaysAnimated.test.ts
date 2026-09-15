import { readFileSync } from 'fs';
import { join } from 'path';
import { previewSvg } from '../app/collection/banmaoking/smil-preview';
import { KING_PRESET } from '../app/collection/banmaoking/king-regalia';

test('Theme Lab and downloads always request animated SVG without motion controls', () => {
  const read = (file: string) => readFileSync(join(process.cwd(), 'app/collection/banmaoking', file), 'utf8');
  const studio = read('KingExperience.tsx');
  const download = read('KingComposition.tsx');
  for (const source of [studio, download]) {
    expect(source).not.toMatch(/useReducedMotion|motionOverride|motionEnabled|king-motion-toggle/);
  }
  expect(studio).toContain('previewSvg(traits, tokenId, prefix)');
  expect(studio).toContain('data-animated="true"');
  expect(download).toContain("previewSvg(traits, 0, 'composition-export')");
  expect(previewSvg(KING_PRESET, 0, 'always')).toContain('<animateMotion');
});
