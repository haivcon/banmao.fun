import { ACCESSORY_SVGS, accessoryRearSvg } from '../app/collection/banmaoking/scene';
import { previewSvg } from '../app/collection/banmaoking/smil-preview';
import { WAND_SVG } from '../app/collection/banmaoking/accessory-action';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

test('wizard retains rear hat brim and front scarf, book, crystal and hat badge', () => {
  const rear = accessoryRearSvg(9), front = ACCESSORY_SVGS[9];
  expect(rear).toContain('king-wizard-brim-rear');
  expect(rear).not.toMatch(/data-wizard-(cloak|robe|wrap|panel)/);
  expect(rear).not.toContain('king-wizard-tip');
  for (const part of ['collar', 'book', 'crystal', 'hat-badge', 'orbit']) {
    expect(front).toContain(`data-wizard-${part}="true"`);
  }
  expect(front).not.toContain('data-wizard-cloak');
  expect(WAND_SVG).toContain('id="smil-king-held-wrist"');
  expect(WAND_SVG).toContain('translate(369 357)');
});

test.each([0, 7])('wizard layers and unique IDs survive all expressions on body %i', body => {
  for (let expression = 0; expression < 21; expression++) {
    const svg = previewSvg({ body, expression, accessory: 9, background: 0 }, 1, 'wizard');
    expect(svg).not.toMatch(/data-wizard-(cloak|robe|wrap|panel)/);
    expect(svg.match(/data-wizard-collar=/g)).toHaveLength(1);
    const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(svg).not.toMatch(/undefined|NaN/);
    expect(svg).toContain('translate(377.26px,369.54px)');
  }
});

test('neck scarf, larger Bitcoin book and independent sparkling flight are present', () => {
  const front = ACCESSORY_SVGS[9];
  expect(front).toContain('data-wizard-collar="true"');
  expect(front).not.toMatch(/data-wizard-(cloak|robe|wrap|panel)/);
  expect(front).toContain('data-wizard-book-size="1.3"');
  expect(front).toContain('data-wizard-bitcoin="true"');
  expect(front).toContain('values="0 7;5 -12;0 7;-5 -7;0 7"');
  expect(front).toContain('data-wizard-book-rock="true"');
  expect(front.match(/data-wizard-sparkle=/g)).toHaveLength(8);
  expect(WAND_SVG).toContain('data-wizard-wand-axis="true" transform="rotate(20)"');
  expect(WAND_SVG).toContain('d="M0-99L9-83 0-67-9-83Z"');
  expect(WAND_SVG).toContain('translate(0 -83)');
  const svg = previewSvg({ body: 0, expression: 0, accessory: 9, background: 0 }, 1, 'wrap');
  expect(svg.indexOf('data-wizard-collar')).toBeGreaterThan(svg.indexOf('id="wrap-smil-king-arm-right"'));
});

test('wizard SVG is well formed and rasterizes', async () => {
  const sharp = require('sharp');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${previewSvg({ body: 0, expression: 0, accessory: 9, background: 0 }, 1, 'raster')}</svg>`;
  const { info } = await sharp(Buffer.from(svg)).png().toBuffer({ resolveWithObject: true });
  expect(info.width).toBe(512);
  expect(info.height).toBe(512);
});

test('other accessories do not receive wizard outfit', () => {
  for (const accessory of [0, 5, 6, 10]) {
    expect(previewSvg({ body: 0, expression: 0, accessory, background: 0 }, 1, 'other')).not.toContain('data-wizard-');
  }
});

test('Solidity front and rear exactly match canonical wizard artwork', () => {
  expect(execFileSync(process.execPath, [path.resolve('tools/sync-king-wizard.cjs'), '--check'], { encoding: 'utf8' })).toContain('synchronized');
});
