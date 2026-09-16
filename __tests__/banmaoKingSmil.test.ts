import { previewSvg } from '../app/collection/banmaoking/smil-preview';
import { smilMarkup } from '../app/collection/banmaoking/smil';
import { tokenBadgeSvg } from '../app/collection/banmaoking/badge';
import { animatedExpressionSvg } from '../app/collection/banmaoking/motion';
import { expressionSvg } from '../app/collection/banmaoking/artwork';
import { wateryTears } from '../app/collection/banmaoking/expression-effects';
import { choreographySvg } from '../app/collection/banmaoking/choreography';
import { secondaryMotionSvg } from '../app/collection/banmaoking/secondary-motion';
import profiles from '../app/collection/banmaoking/choreography.json';

describe('shared SMIL preview', () => {
  test.each(Array.from({length:24},(_,i)=>i))('valid unique scoped animated targets %i', i => {
    const traits={body:i%8,expression:i%12,accessory:i%12,background:i%8};
    const svg=previewSvg(traits,i,'preview');
    const ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every(id=>id.startsWith('preview-'))).toBe(true);
    for (const [, target] of svg.matchAll(/href="#([^"]+)"/g)) expect(ids).toContain(target);
    expect(svg).not.toMatch(/__MOOD__|undefined|@keyframes|animation:/);
    expect(svg).toContain('additive="sum"');
    expect(svg).toContain('<animate');
    expect(previewSvg(traits,i,'preview')).toBe(svg);
  });
  test.each(Array.from({length:12},(_,i)=>i))('preserves eye geometry for mood %i', i => {
    const animated = animatedExpressionSvg(i);
    // The watery expression replaces static tear geometry, not the eyes or mouth.
    const neutral = expressionSvg(i).replace(/<g class="king-tears">[\s\S]*?<\/g>/, '');
    for (const [, d] of neutral.matchAll(/\bd="([^"]+)"/g)) expect(animated).toContain(`d="${d}"`);
    if (i === 7) expect(animated).toContain(wateryTears());
    expect(smilMarkup(i)).not.toMatch(/__MOOD__|undefined/);
  });
  test.each(Array.from({length:12},(_,i)=>i))('bounded breathing and expression-specific blush %i', i => {
    const motion = smilMarkup(i);
    // Whole-body lean belongs to choreography; volume breathing has its own wrapper.
    expect(motion).not.toContain('href="#smil-king-character-motion"');
    expect(choreographySvg(i).match(/href="#smil-king-character-motion"/g)).toHaveLength(1);
    const volume = secondaryMotionSvg(i).match(/<animateTransform href="#king-volume-motion"[^>]+/)!;
    expect(volume).not.toBeNull();
    expect(volume[0]).toContain('type="scale"');
    expect(volume[0]).toContain(`dur="${profiles[i].duration}s"`);
    const scales = volume[0].match(/values="([^"]+)"/)![1].split(';').map(frame => frame.split(' ').map(Number));
    expect(scales[0]).toEqual(scales.at(-1));
    for (const [x, y] of scales) {
      expect(x * y).toBeCloseTo(1, 3);
      expect(y).toBeGreaterThanOrEqual(.98);
      expect(y).toBeLessThanOrEqual(1.03);
    }
    const timing = ['4','2','3.2','2.8','7','2.2','5','6','2.4','7','2.6','8'][i];
    expect(motion).toContain(`dur="${timing}s"`);
    const face = animatedExpressionSvg(i);
    const cheeks = [...face.matchAll(/<ellipse[^>]*class="king-blush">(.*?)<\/ellipse>/g)];
    expect(cheeks).toHaveLength([0,1,3].includes(i) ? 2 : 0);
    for (const [, animation] of cheeks) {
      expect(animation).toContain('attributeName="opacity"');
      expect(animation).toContain('values=".3;.44;.3"');
      expect(animation).toContain('dur="5.2s"');
      expect(animation).toContain('keyTimes="0;.5;1"');
    }
    const svg = previewSvg({body:0,expression:i,accessory:0,background:0},0,'animated');
    expect(svg).toContain('<animate');
  });
  test('stronger mouth peaks preserve neutral shapes and closed morph loops', () => {
    expect(animatedExpressionSvg(0)).toContain('M241 255q15 22 30 0');
    expect(animatedExpressionSvg(8)).toContain('M250 273q22-3 25 14q-17 18-25-14Z');
    for (let id = 0; id < 12; id++) {
      const mouth = animatedExpressionSvg(id).match(/<g class="king-mouth"[^>]*>(.*?)<\/g>/)![1];
      for (const [, attribute, values] of mouth.matchAll(/<animate attributeName="(d|ry)" values="([^"]+)"/g)) {
        const frames = values.split(';');
        expect(frames.at(-1)).toBe(frames[0]);
        if (attribute === 'd') {
          const topology = (d: string) => d.match(/[a-z]/gi)?.join('');
          frames.forEach(frame => expect(topology(frame)).toBe(topology(frames[0])));
        } else {
          expect(Number(frames[1]) - Number(frames[0])).toBe(Number(frames[0]) > 5 ? 5 : 2);
        }
      }
    }
  });
  test('badge has bounded translate/opacity/size SMIL and unchanged static digits',()=>{
    const badge=tokenBadgeSvg(9216);
    expect(badge.match(/<animateTransform /g)).toHaveLength(75);
    expect(badge.match(/<animate /g)).toHaveLength(225);
    expect(badge).toContain('keyTimes="0;.2;.3;.42;.64;.76;.88;1"');
    expect(tokenBadgeSvg(10000)).not.toContain('<animate');
  });
});
