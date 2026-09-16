import profiles from '../app/collection/banmaoking/choreography.json';
import { choreographySvg } from '../app/collection/banmaoking/choreography';
import { previewSvg } from '../app/collection/banmaoking/smil-preview';
import { actionPoseSvg } from '../app/collection/banmaoking/anatomy';

describe('expression-owned choreography', () => {
  test('21 unique actions and motion tracks', () => {
    expect(profiles).toHaveLength(21);
    expect(new Set(profiles.map(p => p.name)).size).toBe(21);
    expect(new Set(profiles.map((_, i) => choreographySvg(i))).size).toBe(21);
    expect(actionPoseSvg(1)).toBe(actionPoseSvg(500));
  });
  test.each(profiles.map((p,i) => [i,p.name] as const))('%i: %s owns its joints for every accessory', (expression) => {
    for(let accessory=0; accessory<21; accessory++) {
      const traits = { body:16, expression, accessory, background:16 };
      const scene = previewSvg(traits,1,'check');
      for(const joint of ['king-arm-left','king-arm-right','king-leg-left','king-leg-right','king-tail','king-character-motion']) {
        expect((scene.match(new RegExp(`id="check-smil-${joint}"`, 'g')) || []).length).toBe(1);
        expect((scene.match(new RegExp(`<animateTransform href="#check-smil-${joint}"`, 'g')) || []).length).toBe(1);
      }
      // Whole arms must be painted behind the banana shell, never in front-paws.
      expect(scene.indexOf('id="check-smil-king-arm-left"')).toBeLessThan(scene.indexOf('id="check-banana-shell"'));
      expect(scene.indexOf('id="check-smil-king-arm-right"')).toBeLessThan(scene.indexOf('id="check-banana-shell"'));
      expect(scene).not.toContain('id="check-front-paws"');
      expect(scene).toContain('class="king-forearm"');
      expect(scene).toMatch(/id="check-king-forearm-left"[^>]*d="M164 302C150 300/);
      for (const side of ['left', 'right']) {
        expect(scene).toContain(`id="check-smil-king-wrist-${side}"`);
        expect(scene).toContain(`<animateTransform href="#check-smil-king-wrist-${side}"`);
        for (const shape of ['relaxed', 'open', 'cupped']) {
          expect(scene).toContain(`id="check-king-paw-${shape}-${side}"`);
          expect(scene).toContain(`<animate href="#check-king-paw-${shape}-${side}"`);
        }
      }
      expect(scene).not.toContain('data-pose=');
      expect(scene).not.toContain('undefined');
      expect(scene).toContain('repeatCount="indefinite"');
    }
  });
});
