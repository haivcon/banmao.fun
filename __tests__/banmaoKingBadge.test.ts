import { tokenBadgeSvg, BADGE_GLYPHS } from '../app/collection/banmaoking/badge';
import sharp from 'sharp';

describe('King pixel identity badge', () => {
  test.each([0, 1, 42, 999, 9216])('renders bounded, deterministic cells for #%i', async id => {
    const badge = tokenBadgeSvg(id);
    expect(badge).toBe(tokenBadgeSvg(id));
    expect(badge.match(/<rect /g)).toHaveLength(75);
    expect(badge).toContain(`<title>Token #${id}</title>`);
    expect(badge).not.toMatch(/NaN|undefined|<script/);
    const glyphs = [10, ...String(id).split('').map(Number)];
    const expected = glyphs.reduce((sum, glyph) => sum + [...BADGE_GLYPHS[glyph]].filter(x => x === '1').length, 0);
    expect(badge.match(/opacity="1" style/g)).toHaveLength(expected);
    const image = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">${badge}</svg>`)).png().toBuffer();
    expect(image.length).toBeGreaterThan(100);
  });
  test('uses a transparent, smaller top-left badge and extended hash crossbars', async () => {
    const badge = tokenBadgeSvg(9216);
    expect(badge).toContain('transform="translate(8 8) scale(.8) translate(-386 -14)"');
    expect(badge).not.toContain('rx=');
    expect(badge).not.toContain('#fffaf0');
    expect(badge).toContain('<rect x="389" y="25" width="3"');
    expect(badge).toContain('<rect x="386" y="30" width="6"');
    expect(badge).toContain('<rect x="398" y="40" width="6"');
    const { data, info } = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">${badge}</svg>`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const alpha = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3];
    expect(alpha(16, 12)).toBe(0);
    expect(alpha(400, 30)).toBe(0);
    expect(alpha(11, 18)).toBeGreaterThan(0);
  });
  test('forms five symmetric close-packed 3x3 clusters inspired by BanmaoBox', () => {
    const cells = [...tokenBadgeSvg(9216).matchAll(/<rect x="(\d+)" y="(\d+)"[^>]*--tx:(-?\d+)px;--ty:(-?\d+)px/g)];
    const origins = cells.map(c => [Number(c[1]) + Number(c[3]), Number(c[2]) + Number(c[4])]);
    const boxOrigins = [[276, 142], [444, 142], [360, 226], [276, 310], [444, 310]];
    expect(cells).toHaveLength(75);
    origins.forEach((origin, i) => {
      const [x, y] = boxOrigins[Math.floor(i / 15)];
      const cell = i % 15;
      expect(origin).toEqual([386 + (x - 276) / 84 * 30 + cell % 3 * 10, 14 + (y - 142) / 84 * 30 + Math.floor(cell % 9 / 3) * 10]);
    });
  });
  test('uses bounded fallback for full uint256 and rejects invalid IDs', () => {
    const id = (BigInt(1) << BigInt(256)) - BigInt(1);
    expect(tokenBadgeSvg(id)).toContain(`#${id}</text>`);
    expect(tokenBadgeSvg(id)).not.toContain('king-token-cells');
    expect(() => tokenBadgeSvg(-1)).toThrow();
    expect(() => tokenBadgeSvg(id + BigInt(1))).toThrow();
  });
  test('adapts contrast and scatter without changing digits', () => {
    expect(tokenBadgeSvg(42, 4)).toContain('fill="#ffe9a0"');
    expect(tokenBadgeSvg(42, 0)).toContain('fill="#634323"');
    expect(tokenBadgeSvg(42)).not.toBe(tokenBadgeSvg(43));
  });
});
