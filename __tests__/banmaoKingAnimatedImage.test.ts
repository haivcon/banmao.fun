import { animatedKingImage } from '../app/collection/banmaoking/animated-image';

const image = (svg: string) => 'data:image/svg+xml;base64,' + btoa(svg);
describe('animated minted NFT presentation', () => {
  test('overrides reduced motion without stripping any SVG animation', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite"/></svg>';
    const result = animatedKingImage(image(svg));
    expect(atob(result.split(',')[1])).toBe(svg.replace('<svg', '<svg data-motion-override="true"'));
    expect(animatedKingImage(result)).toBe(result);
  });
  test('replaces an existing override', () => {
    const result = animatedKingImage(image('<svg data-motion-override="false"><animateTransform /></svg>'));
    expect(atob(result.split(',')[1])).not.toContain('"false"');
  });
  test('rejects raster, malformed and static images instead of displaying a static fallback', () => {
    for (const value of ['https://example.com/image.png', image('<svg/>'), image('<svg><path/></svg>')]) {
      expect(() => animatedKingImage(value)).toThrow();
    }
  });
});
