import profiles from '../app/collection/banmaoking/choreography.json';
import { previewSvg } from '../app/collection/banmaoking/smil-preview';

test.each(profiles.map((_, i) => i))('expression %i shows palms only for its outward gesture', expression => {
  const both = [1, 3, 5, 10].includes(expression);
  for (let accessory = 0; accessory < 21; accessory++) {
    const svg = previewSvg({ body: 0, expression, accessory, background: 0 }, 0, 'palm');
    for (const side of ['left', 'right'] as const) {
      const visible = both || (side === 'right' && [0, 2].includes(expression));
      expect(svg).toContain(`<animate href="#palm-king-palm-${side}" attributeName="opacity" values="${visible ? '0;0;1;.8;.35;0;0' : '0;0;0;0;0;0;0'}"`);
      expect(svg.match(new RegExp(`id="palm-king-palm-${side}"`, 'g'))).toHaveLength(1);
      if (visible) {
        const angle = Number(profiles[expression][side].split(';')[2]) * Math.PI / 180;
        const x = (side === 'left' ? -31 : 31) * Math.cos(angle) - 78 * Math.sin(angle);
        // Keep the entire palm outside the shell, not folded over the face.
        expect(side === 'left' ? -x : x).toBeGreaterThan(65);
      }
    }
    expect(svg).not.toContain('id="palm-front-paws"');
  }
});
