import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import expansion from '../app/collection/banmaoking/expansion.json';
import { previewSvg } from '../app/collection/banmaoking/smil-preview';

describe('expanded animated backgrounds', () => {
  test.each(expansion.backgrounds.map((bg, i) => [i, bg] as const))('renders background %i with scoped references and Solidity parity', async (i, bg) => {
    const source = readFileSync(join(process.cwd(), 'contracts/BanmaoKing/Lib/BanmaoKingBackgroundExpansion.sol'), 'utf8');
    expect(source).toContain(`if(id==${i + 8}) return ${JSON.stringify(bg.svg)};`);
    expect(bg.svg).toContain('<animate');
    const fragment = previewSvg({ body: 0, expression: 0, accessory: 0, background: i + 8 }, 0, 'bg-test');
    const ids = [...fragment.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const match of fragment.matchAll(/(?:href="#|url\(#)([^"\)]+)/g)) expect(ids).toContain(match[1]);
    expect(fragment).not.toMatch(/undefined|NaN|<script|foreignObject/);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">${fragment}</svg>`;
    const { info } = await sharp(Buffer.from(svg)).resize(128, 128).png().toBuffer({ resolveWithObject: true });
    expect(info.width).toBe(128);
  });

  test.each(['btc', 'eth', 'okb'])('%s has exactly three coins on a continuous orbit', kind => {
    const svg = expansion.backgrounds.find(bg => bg.svg.includes(`id="king-${kind}-coin"`))!.svg;
    expect([...svg.matchAll(new RegExp(`<use href="#king-${kind}-coin"`, 'g'))]).toHaveLength(3);
    expect(svg).toContain('<g transform="translate(256 256)"><g class="king-coin-orbit"><animateTransform attributeName="transform" type="rotate" values="0;360" dur="18s" begin="-0s" repeatCount="indefinite"/>');
    for (const angle of [0, 120, 240]) expect(svg).toContain(`<g transform="rotate(${angle})"><g transform="translate(0 -209)">`);
    expect(svg).not.toMatch(/<script\b|<foreignObject\b|<image\b|\bon\w+=|href="(?!#)/i);
    expect(svg.match(/class="king-coin-upright"/g)).toHaveLength(3);
    expect(svg.match(/values="0;-360" dur="18s"/g)).toHaveLength(3);
    for (const angle of [0, 120, 240]) expect(svg).toContain(`transform="rotate(${-angle})"><g class="king-coin-upright"`);
    // Even the back rim stays inside the frame throughout rotation.
    expect(209 + (38 + 4) * .9).toBeLessThan(256);
  });

  test.each([1, 2, 3])('crypto accessory %i is self-contained on every background with Solidity parity', async i => {
    const accessory = expansion.accessories[i];
    const source = readFileSync(join(process.cwd(), 'contracts/BanmaoKing/Lib/BanmaoKingAccessoryExpansion.sol'), 'utf8');
    expect(source).toContain(`if(id==${i + 12}) return ${JSON.stringify(accessory.svg)};`);
    expect(accessory.svg).not.toMatch(/<text|<script|<foreignObject|<image|\bon\w+=|href="(?!#)/i);
    for (let background = 0; background < 16; background++) {
      const fragment = previewSvg({ body: 8 + i, expression: 0, accessory: 12 + i, background }, 0, 'crypto-test');
      const ids = [...fragment.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
      expect(new Set(ids).size).toBe(ids.length);
      for (const match of fragment.matchAll(/(?:href="#|url\(#)([^"\)]+)/g)) expect(ids).toContain(match[1]);
    }
    const { info } = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">${accessory.svg}</svg>`)).png().toBuffer({ resolveWithObject: true });
    expect(info.width).toBe(512);
    if (i === 3) expect(accessory.svg.match(/width="10" height="10"/g)).toHaveLength(5);
  });

  test('OKB emblem has exactly five equal squares in an X, not text', () => {
    const svg = expansion.backgrounds[3].svg;
    const emblems = [...svg.matchAll(/<g class="king-okb-emblem"[^>]*>(.*?)<\/g>/g)];
    expect(emblems).toHaveLength(2); // coin definition and corner mark
    for (const [, emblem] of emblems) {
      const squares = [...emblem.matchAll(/x="(-?\d+)" y="(-?\d+)" width="10" height="10"/g)];
      expect(squares.map(m => [Number(m[1]) + 5, Number(m[2]) + 5])).toEqual([[-10, -10], [10, -10], [0, 0], [-10, 10], [10, 10]]);
    }
    expect(svg).toContain('X LAYER / 196');
    expect(svg).toContain('href="#king-okb-coin"');
    expect(expansion.backgrounds[1].svg).not.toContain('>BTC</text>');
  });
});
