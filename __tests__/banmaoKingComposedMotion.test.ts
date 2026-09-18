import { expectSvgReferences } from './helpers/banmaoKingSvg';
import { animatedExpressionSvg } from '../app/collection/banmaoking/motion';
import { previewSvg } from '../app/collection/banmaoking/smil-preview';
import profiles from '../app/collection/banmaoking/choreography.json';

test.each([9,10,11])('composed expression %i has a single closed-loop face timeline', id => {
  const svg = animatedExpressionSvg(id);
  expect(svg).not.toMatch(/NaN|undefined/);
  if (id !== 9) expect(svg).not.toContain('clip-path');
  for (const [tag] of svg.matchAll(/<animate(?:Transform)?\b[^>]*\/>/g)) {
    expect(tag).toContain(`dur="${profiles[id].duration}s"`);
    const values = tag.match(/values="([^"]+)"/)![1].split(';');
    const times = tag.match(/keyTimes="([^"]+)"/)![1].split(';').map(Number);
    expect(times).toHaveLength(values.length);
    expect(times).toEqual([...times].sort((a,b)=>a-b));
    expect(values[0]).toBe(values.at(-1));
  }
  expect(profiles[id].footLeft).toBe('0;0;0;0;0;0;0');
  for (const accessory of [1,2,11,15,24,25]) {
    const composed = previewSvg({body:0,expression:id,accessory,background:0},0,'composed');
    expectSvgReferences(composed);
  }
});
test('Cool shifts reflections rather than the complete eyes', () => {
  const svg = animatedExpressionSvg(9);
  expect(svg).toContain('data-cool-glance');
  expect(svg).toContain('data-cool-smirk');
  expect(svg.match(/data-cool-sweep=/g)).toHaveLength(2);
  expect(svg.match(/data-cool-spark=/g)).toHaveLength(1);
  expect(svg).toContain('data-cool-brow');
  expect(svg).toContain('M240 268q14 5 29-8');
  expect(svg).toContain('clip-path="url(#king-cool-light-0)"><g data-cool-sweep');
  expect(svg).toContain('2 0;2 0;2 0');
});
test('Starstruck uses local 10% pulses and delayed mouth, not spinning eyes', () => {
  const svg = animatedExpressionSvg(10);
  expect(svg.match(/data-star-spark=/g)).toHaveLength(2);
  expect(svg).toContain('1;1;1.1;1.1;1;1;1');
  expect(svg).toContain('data-star-mouth');
  expect(svg).not.toContain('type="rotate"');
  expect(Math.min(...profiles[10].lift.split(';').map(Number))).toBe(-6);
});
test('Zen keeps curved closed lids without blinking or yawning', () => {
  const svg = animatedExpressionSvg(11);
  expect(svg).toContain('data-zen-lids');
  expect(svg).not.toContain('attributeName="visibility"');
  expect(profiles[11].duration).toBe('8');
  expect(profiles[11].lean).toBe('0;0;0;0;0;0;0');
});
