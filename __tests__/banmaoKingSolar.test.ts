import sharp from 'sharp';
import { previewSvg } from '../app/collection/banmaoking/smil-preview';
import { KING_PRESET } from '../app/collection/banmaoking/king-regalia';

const plain = { body: 0, expression: 0, accessory: 0, background: 0 };
test('solar materials and choreography remain independent when mixing layers', () => {
  const markers = { body: '#74364a', expression: 'king-solar-blink', accessory: 'king-solar-regalia', background: 'king-solar-emblem' };
  for (const [layer, marker] of Object.entries(markers)) {
    const key = layer as keyof typeof plain;
    const svg = previewSvg({ ...plain, [key]: KING_PRESET[key] }, 0, 'mix');
    expect(svg).toContain(marker);
    for (const other of Object.values(markers).filter(value => value !== marker)) expect(svg).not.toContain(other);
  }
  expect(previewSvg(KING_PRESET, 0, 'solar')).toContain('dur="16s"');
});
test('spectacle animates immediately with bounded independent particle layers', () => {
  const svg = previewSvg(KING_PRESET, 0, 'spectacle');
  expect(svg).toContain('king-golden-rain');
  expect(svg).toContain('king-scepter-vortex');
  expect(svg.match(/<animateMotion /g)).toHaveLength(7);
  expect(svg).toContain('dur="24s"');
  expect(svg).toContain('dur="36s"');
  expect(svg.indexOf('king-solar-spectacle')).toBeLessThan(svg.indexOf('id="spectacle-body"'));
  expect(previewSvg({ ...plain, accessory: 20 }, 0, 'mix')).not.toContain('king-golden-rain');
  expect(previewSvg({ ...plain, background: 16 }, 0, 'mix')).not.toContain('king-scepter-vortex');
  expect(previewSvg(KING_PRESET, 0, 'animated')).toContain('<animate');
});
test.each([0, 1, 2, 3, 4, 5])('solar King pose %i has valid animated output', async pose => {
    const svg = previewSvg(KING_PRESET, pose, 'solar');
    expect(svg).toContain('<animate');
    const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const [, ref] of svg.matchAll(/(?:href="#|url\(#)([^"\)]+)/g)) expect(ids).toContain(ref);
    const image = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${svg}</svg>`)).png().toBuffer();
    expect(image.length).toBeGreaterThan(1000);
});
