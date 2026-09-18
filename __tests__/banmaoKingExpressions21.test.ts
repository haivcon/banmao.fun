import { expressionSvg } from '../app/collection/banmaoking/artwork';
import { animatedExpressionSvg } from '../app/collection/banmaoking/motion';
import { previewSvg } from '../app/collection/banmaoking/smil-preview';
import profiles from '../app/collection/banmaoking/choreography.json';
import { ACCESSORY_IDS, EXPRESSION_TRAITS } from '../app/collection/banmaoking/traits';
import { expectSvgReferences, svgGroupByClass } from './helpers/banmaoKingSvg';
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
      const svg = previewSvg({ body: 0, expression: id, accessory: 1, background: 0 }, pose, `e${id}p${pose}`);
      expectSvgReferences(svg);
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
      expect(svgGroupByClass(markup, 'king-whiskers').parent).toMatch(/id="[^"]*expression"/);
      // Whisker sway (animateTransform rotate) is permitted; expression morphing is not.
      const whiskerBody = svgGroupByClass(markup, 'king-whiskers').markup;
      expect(whiskerBody).not.toMatch(/<animate\s+attributeName="d"/);
      expect(whiskerBody).not.toMatch(/<animate\s+attributeName="opacity"/);
    };
    check(expressionSvg(id));
    check(animatedExpressionSvg(id));
    for (let pose = 0; pose < 6; pose++) {
      for (const accessory of ACCESSORY_IDS) {
        check(previewSvg({ body: 0, expression: id, accessory, background: 0 }, pose, 'whiskers'));
      }
    }
  });
  test.each([-1, 21, 255, 1.5, NaN])('rejects invalid expression %s', id => {
    expect(() => expressionSvg(id)).toThrow(RangeError);
  });
});
