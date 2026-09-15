import { expressionSvg } from '../app/collection/banmaoking/artwork';
import { animatedExpressionSvg } from '../app/collection/banmaoking/motion';
import { previewSvg } from '../app/collection/banmaoking/smil-preview';
import profiles from '../app/collection/banmaoking/choreography.json';
import { EXPRESSION_TRAITS } from '../app/collection/banmaoking/traits';
import expansion from '../app/collection/banmaoking/expansion.json';

const ids = Array.from({ length: 21 }, (_, id) => id);
describe('complete expression catalogue', () => {
  test('has exactly 21 unique names, faces and tail keyframes', () => {
    expect(EXPRESSION_TRAITS).toHaveLength(21);
    expect(new Set(EXPRESSION_TRAITS).size).toBe(21);
    expect(new Set(ids.map(expressionSvg)).size).toBe(21);
    expect(new Set(profiles.map(profile => profile.tail)).size).toBe(21);
    expect(EXPRESSION_TRAITS[20]).toBe('Royal Decree');
  });
  test.each(ids)('expression %i has local mouth/detail motion and valid morph topology in every pose', id => {
    const face = animatedExpressionSvg(id);
    expect(face).toContain(`data-mouth-motion="${id}"`);
    expect(face).toContain(`data-detail="${id}"`);
    for (const [, values] of face.matchAll(/attributeName="d" values="([^"]+)"/g)) {
      const frames = values.split(';');
      const topology = (d: string) => d.match(/[a-df-z]/ig)?.join('');
      expect(new Set(frames.map(topology)).size).toBe(1);
      expect(frames[0]).toBe(frames[frames.length - 1]);
    }
    for (let pose = 0; pose < 6; pose++) {
      const svg = previewSvg({ body: 0, expression: id, accessory: 0, background: 0 }, pose, `e${id}p${pose}`);
      expect(svg).not.toMatch(/undefined|NaN/);
      const targets = [...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
      expect(new Set(targets).size).toBe(targets.length);
      for (const [, target] of svg.matchAll(/href="#([^"]+)"/g)) expect(targets).toContain(target);
      expect(svg).toContain('<animate');
    }
    if (id >= 12) expect(expansion.expressions[id - 12].svg.replace(/ id="smil-[^"]+"/g, '')).toBe(face);
  });
  test.each(ids)('expression %i retains both whisker sides outside animated eyes and mouth', id => {
    const check = (markup: string) => {
      expect(markup.match(/class="king-whiskers"/g)).toHaveLength(1);
      for (const side of ['left', 'right']) {
        const paths = [...markup.matchAll(new RegExp(`<path[^>]*class="king-whiskers-${side}"[^>]*d="([^"]+)"`, 'g'))];
        expect(paths).toHaveLength(1);
        expect(paths[0][1].match(/M/g)).toHaveLength(3);
      }
      // Track actual group nesting, including Royal Decree's nested eye groups.
      const stack: string[] = [];
      for (const [tag] of markup.matchAll(/<g\b[^>]*>|<\/g>/g)) {
        if (tag === '</g>') stack.pop();
        else {
          if (tag.includes('class="king-whiskers"')) {
            expect(stack[stack.length - 1]).toMatch(/id="[^"]*expression"/);
          }
          stack.push(tag);
        }
      }
      expect(markup.match(/<g[^>]*class="king-whiskers">([\s\S]*?)<\/g>/)?.[1]).not.toContain('<animate');
    };
    check(expressionSvg(id));
    check(animatedExpressionSvg(id));
    for (let pose = 0; pose < 6; pose++) {
      for (let accessory = 0; accessory < 21; accessory++) {
        check(previewSvg({ body: 0, expression: id, accessory, background: 0 }, pose, 'whiskers'));
      }
    }
  });
  test.each([-1, 21, 255, 1.5, NaN])('rejects invalid expression %s', id => {
    expect(() => expressionSvg(id)).toThrow(RangeError);
  });
});
