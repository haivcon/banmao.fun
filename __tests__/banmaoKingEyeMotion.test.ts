import { eyeProfiles } from '../app/collection/banmaoking/eye-motion';
import { expressionSvg } from '../app/collection/banmaoking/artwork';
import { animatedExpressionSvg } from '../app/collection/banmaoking/motion';
import { previewSvg } from '../app/collection/banmaoking/smil-preview';

const ids = Array.from({ length: 14 }, (_, i) => i + 7);
describe('expression-specific eye choreography', () => {
  test('each requested expression has its own closed-loop gaze', () => {
    expect(Object.keys(eyeProfiles).map(Number)).toEqual(ids);
    expect(new Set(ids.map(id => eyeProfiles[id].gaze)).size).toBe(14);
    for (const id of ids) {
      const frames = eyeProfiles[id].gaze.split(';');
      expect(frames[0]).toBe(frames.at(-1));
    }
  });
  test.each(ids)('expression %i keeps valid timing and animated preview', id => {
    const svg = animatedExpressionSvg(id);
    expect(svg).toContain(`data-eye-motion="${eyeProfiles[id].name}"`);
    for (const [, tag] of svg.matchAll(/(<animate(?:Transform)?\b[^>]*\/>)/g)) {
      const values = tag.match(/values="([^"]+)"/)?.[1].split(';');
      const times = tag.match(/keyTimes="([^"]+)"/)?.[1].split(';').map(Number);
      if (times && values) {
        expect(times).toHaveLength(values.length);
        expect(times[0]).toBe(0);
        expect(times.at(-1)).toBe(1);
        expect([...times].sort((a, b) => a - b)).toEqual(times);
      }
    }
    const still = previewSvg({ body: 0, expression: id, accessory: 1, background: 0 }, 0, 'eye-preview');
    expect(still).toContain('<animate');
    expect(still).not.toMatch(/undefined|NaN/);
  });
  test('Royal Decree has two wide gold eyes with independently phased highlights', () => {
    const still = expressionSvg(20);
    expect(still.match(/data-royal-eye=/g)).toHaveLength(2);
    expect(still.match(/rx="23" ry="28"/g)).toHaveLength(2);
    expect(still.match(/data-eye-glint=/g)).toHaveLength(4);
    expect(still).toContain('#f7cf6c');
    const animated = animatedExpressionSvg(20);
    expect(animated).toContain('begin="-0.9s"');
    expect(animated).toContain(`keyTimes="${eyeProfiles[20].blink}"`);
  });
});
