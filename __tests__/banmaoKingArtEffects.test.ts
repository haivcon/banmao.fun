import { animatedExpressionSvg } from '../app/collection/banmaoking/motion';
import { bodySvg } from '../app/collection/banmaoking/artwork';
import { BODY_TRAITS } from '../app/collection/banmaoking/traits';
import { previewSvg } from '../app/collection/banmaoking/smil-preview';
import { backgroundEffects } from '../app/collection/banmaoking/background-effects';

describe('Banmao King authored art effects', () => {
  test('six staggered falling tears and independent dream bubbles', () => {
    expect(animatedExpressionSvg(7).match(/data-tear=/g)).toHaveLength(6);
    expect(animatedExpressionSvg(19).match(/data-dream-bubble=/g)).toHaveLength(3);
  });
  test('diamond facets have five to ten deterministic outward rays per eye', () => {
    const counts = new Set<number>();
    for (let tokenId=0; tokenId<36; tokenId++) {
      const svg=previewSvg({body:4,expression:13,accessory:0,background:1},tokenId,'rays');
      for (const x of [218,294]) {
        const count=(svg.match(new RegExp(`data-diamond-ray="${x}-`, 'g')) || []).length;
        expect(count).toBeGreaterThanOrEqual(5);
        expect(count).toBeLessThanOrEqual(10);
        counts.add(count);
      }
      expect(svg).toBe(previewSvg({body:4,expression:13,accessory:0,background:1},tokenId,'rays'));
    }
    expect(counts.size).toBe(6);
    expect(animatedExpressionSvg(13)).toContain('stroke-width=".8"');
  });
  test('diamond light packets travel outward and fully extinguish between bursts', () => {
    const svg=previewSvg({body:4,expression:13,accessory:0,background:1},1,'burst');
    const rays=[...svg.matchAll(/<path data-diamond-ray=[\s\S]*?<\/path>/g)].map(m=>m[0]);
    expect(rays).toHaveLength(15);
    for(const ray of rays){
      expect(ray).toContain('opacity="0"');
      expect(ray).toContain('stroke-dasharray="16 184"');
      expect(ray).toContain('values="0;0;.7;.45;0;0"');
      expect(ray).toContain('values="0;0;-15;-70;-100;-100"');
      expect(ray.match(/keyTimes="0;.08;.2;.48;.6;1"/g)).toHaveLength(2);
      expect(ray).not.toContain('type="rotate"');
    }
  });
  test.each([1,6,7,8,9,12])('suit %i has a compact glowing badge with accessory-aware placement', body => {
    for(let accessory=0;accessory<=22;accessory++) {
      const svg=previewSvg({body,expression:0,accessory,background:1},1,'suit');
      expect(svg).toContain('scale(.82)');
      expect(svg).toContain('data-suit-aura="true"');
      expect(svg).toContain(`data-accessory="${accessory}"`);
      expect(svg).toContain('class="king-crypto-badge" transform="translate(272 470) scale(.5)"');
      expect(svg).not.toContain('d="M258 462');
      expect(svg).not.toContain('d="M264 468');
      expect(svg.match(/class="king-crypto-badge"/g)).toHaveLength(1);
    }
  });
  test.each([15,16])('shallow eye %i clips its highlights', id => {
    const svg = animatedExpressionSvg(id);
    expect(svg.match(/<clipPath /g)).toHaveLength(2);
    expect(svg.match(/<g clip-path=/g)).toHaveLength(2);
  });
  test('cosmic eyes keep stationary silhouette; code lines stay clipped', () => {
    const cosmic = animatedExpressionSvg(12);
    expect(cosmic).toContain('data-cosmic-orbit=');
    expect(cosmic).not.toContain('values="0 0;1 -2;-1 -2;-1 0;0 0"');
    expect(animatedExpressionSvg(14).match(/data-code-line=/g)).toHaveLength(8);
    expect(animatedExpressionSvg(14).match(/clip-path="url\(#code-eye-/g)).toHaveLength(2);
    expect(animatedExpressionSvg(18).match(/data-flame-eye=/g)).toHaveLength(2);
  });
  test('Cyborg keeps ordinal and locally articulated mechanical limbs', () => {
    expect(BODY_TRAITS[4].name).toBe('Cyborg Suit');
    const body=bodySvg(BODY_TRAITS[4].color,BODY_TRAITS[4].shade);
    for(const part of ['arm-right','leg-right','ear-right','tail']) expect(body).toMatch(new RegExp(`class="[^"]*king-${part}[^>]*>[\\s\\S]*?fill="url\\(#bk-cyber-metal\\)"`));
    expect(body).toContain('url(#bk-fur)');
    expect(body).toContain('url(#bk-cyber-split)');
  });
  test.each(Array.from({length:21},(_,i)=>i))('Cyborg expression %i keeps valid scoped SVG', expression => {
    const svg=previewSvg({body:4,expression,accessory:0,background:expression%17},1,'art');
    const ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    for(const [,ref]of svg.matchAll(/(?:href="#|url\(#)([^"\)]+)/g)) expect(ids).toContain(ref);
  });
  test.each(Array.from({length:14},(_,i)=>i))('body/background %i is identifiable and animated', id => {
    expect(bodySvg(BODY_TRAITS[id].color,BODY_TRAITS[id].shade)).toContain(`data-body-effect="${id}"`);
    expect(backgroundEffects(id)).toContain('<animate');
    expect(backgroundEffects(id)).toContain(`data-background-effect="${id}"`);
  });
});
