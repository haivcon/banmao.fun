import { svgGroupByClass } from './helpers/banmaoKingSvg';
import { expressionSvg, ACTION_NAMES } from '../app/collection/banmaoking/artwork';
import { animatedExpressionSvg } from '../app/collection/banmaoking/motion';
import { angryExpression } from '../app/collection/banmaoking/angry-motion';
import { EXPRESSION_TRAITS } from '../app/collection/banmaoking/traits';
import { previewSvg } from '../app/collection/banmaoking/smil-preview';
import expansion from '../app/collection/banmaoking/expansion.json';
import { angryGroundEffects } from '../app/collection/banmaoking/angry-effects';
import { secondaryMotionSvg } from '../app/collection/banmaoking/secondary-motion';

describe('Angry replaces Blushing at ID 17', () => {
  const svg = animatedExpressionSvg(17);
  test('catalogue keeps 21 IDs and renames the action', () => {
    expect(EXPRESSION_TRAITS).toHaveLength(21);
    expect(EXPRESSION_TRAITS[17]).toBe('Angry');
    expect(EXPRESSION_TRAITS).not.toContain('Blushing');
    expect(ACTION_NAMES[17]).toBe('Furious Stomp');
  });
  test('static and animated routing share the authored face', () => {
    expect(expressionSvg(17)).toBe(angryExpression('', false));
    expect(svg).toBe(angryExpression('', true));
    expect(expressionSvg(17)).not.toMatch(/<animate/);
  });
  test.each(['eye', 'brows', 'mouth', 'fangs', 'heat', 'rage'])('contains angry %s', marker => {
    expect(svg).toContain(`data-angry-${marker}=`);
  });
  test('morphs and timing form valid closed loops', () => {
    const tags = (svg + angryGroundEffects()).match(/<animate(?:Transform)?\b[^>]*\/>/g)!;
    expect(tags.length).toBeGreaterThan(8);
    for (const tag of tags) {
      const values = tag.match(/values="([^"]+)"/)![1].split(';');
      const times = tag.match(/keyTimes="([^"]+)"/)![1].split(';').map(Number);
      expect(times).toHaveLength(values.length);
      expect(times[0]).toBe(0);
      expect(times.at(-1)).toBe(1);
      expect(times).toEqual([...times].sort((a, b) => a - b));
      expect(values[0]).toBe(values.at(-1));
      expect(tag).toContain('dur="4.8s"');
      if (tag.includes('attributeName="d"')) {
        expect(new Set(values.map(d => d.match(/[a-z]/ig)?.join(''))).size).toBe(1);
      }
    }
  });
  test('whiskers remain isolated from face opacity and morphs', () => {
    expect(svg.match(/data-whisker-mood="17"/g)).toHaveLength(2);
    const whiskers = svgGroupByClass(svg, 'king-whiskers').markup;
    expect(whiskers).not.toMatch(/attributeName="(?:d|opacity)"/);
  });
  test('generated expansion contains Angry rather than bashful geometry', () => {
    expect(expansion.expressions[5].name).toBe('Angry');
    expect(expansion.expressions[5].svg).toContain('data-angry-rage');
    expect(expansion.expressions[5].svg).not.toContain('bashful');
  });
  test('steam is staggered, heat layered and rage double-bounces', () => {
    expect(svg.match(/data-angry-steam=/g)).toHaveLength(2);
    expect(svg).toContain('keyTimes="0;.4;.43;.51;.66;.82;1"');
    expect(svg).toContain('keyTimes="0;.43;.46;.54;.69;.85;1"');
    expect(svg.match(/data-angry-heat-layer=/g)).toHaveLength(2);
    expect(svg).toContain('values="1;1;1.35;1.05;1.22;1.02;1;1;1"');
    expect(svg).toContain('data-angry-clench');
    expect(svg).toMatch(/data-angry-fangs[^>]*>[\s\S]*?attributeName="d"/);
  });
  test('impact stays on the floor and only appears for Angry', () => {
    const ground = angryGroundEffects();
    expect(ground.match(/data-angry-dust=/g)).toHaveLength(4);
    expect(ground).toContain('keyTimes="0;.42;.43;.5;.62;.82;1"');
    expect(ground).toContain('values="0;0;.7;.45;0;0;0"');
    expect(secondaryMotionSvg(17)).toContain(ground);
    expect(secondaryMotionSvg(16)).not.toContain('data-angry-ground');
    expect(secondaryMotionSvg(17)).toContain('values="0 0;0 0;0 -10;0 0;0 0;0 0;0 0"');
    const preview = previewSvg({ body: 0, expression: 17, accessory: 1, background: 0 }, 0, 'angry-floor');
    expect(preview.indexOf('data-angry-ground')).toBeLessThan(preview.indexOf('data-action="17"'));
    expect(preview.match(/data-angry-steam=/g)).toHaveLength(2);
    // XML parsing and actual transform ancestry are checked in Chrome by test-king-angry-browser.cjs.
  });
  test('composed preview retains face and action', () => {
    const preview = previewSvg({ body: 0, expression: 17, accessory: 1, background: 0 }, 0, 'angry-test');
    expect(preview).toContain('data-angry-rage');
    expect(preview).not.toMatch(/undefined|NaN/);
  });
});
