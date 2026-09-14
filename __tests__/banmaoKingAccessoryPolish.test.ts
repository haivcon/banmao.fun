import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ACCESSORY_SVGS } from '../app/collection/banmaoking/scene';
import { previewSvg } from '../app/collection/banmaoking/smil-preview';

test('generated artwork and its generator never reintroduce the on-chain motion freeze', () => {
  for (const file of ['contracts/BanmaoKing/Lib/BanmaoKingMotionLib.sol', 'app/collection/banmaoking/smil.ts']) {
    const source = readFileSync(resolve(process.cwd(), file), 'utf8');
    expect(source).not.toContain('@media(prefers-reduced-motion:reduce)');
    expect(source).toContain('<animateTransform');
  }
  const client = readFileSync(resolve(process.cwd(), 'app/collection/banmaoking/BanmaoKingClient.tsx'), 'utf8');
  expect(client).not.toContain('motionOverride === true');
});

test('party stripes are thin, clipped, and outlined last with scoped references', () => {
  const markup = previewSvg({body:0,expression:0,accessory:5,background:0},0,'party');
  expect(markup).toContain('<clipPath id="party-king-party-clip">');
  const clipped = markup.match(/<g clip-path="url\(#party-king-party-clip\)">([\s\S]*?)<\/g>(<path[^>]+>)/)!;
  expect(clipped).not.toBeNull();
  expect(clipped[1]).toContain('stroke="#ffe878" stroke-width="4.5"');
  expect(clipped[2]).toContain('stroke-width="3.5"');
});

test.each([[5,'king-party-hat'],[6,'king-chain-pendant'],[7,'king-leaf-sway']] as const)('accessory %i has grouped animation and generated parity', (id, target) => {
  const traits = {body:0,expression:0,accessory:id,background:0};
  const markup = previewSvg(traits,0,'test');
  expect(markup).toContain(`href="#test-smil-${target}"`);
  expect(markup).toContain(`id="test-smil-${target}" class="${target}"`);
  expect(markup).not.toContain('prefers-reduced-motion');
  expect(previewSvg(traits,0,'static')).toContain('<animate');
  const source = readFileSync(resolve(process.cwd(),'contracts/BanmaoKing/Lib/BanmaoKingAccessoryLib.sol'),'utf8');
  const generated = source.match(new RegExp(`if \\(id == ${id}\\) return '([^\\n]*)';`))![1];
  expect(generated.replace(/ id="smil-[^"]+"/g,'')).toBe(ACCESSORY_SVGS[id]);
});


test('halo layers share motion clocks and the glint has a rest interval', () => {
  const markup = previewSvg({body:0,expression:0,accessory:10,background:0},0,'halo');
  const timelines = (id: string) => [...markup.matchAll(new RegExp(`<animateTransform href="#halo-smil-${id}"[^>]+>`, 'g'))].map(m => m[0].replace(id,'group'));
  expect(timelines('king-halo-float')).toHaveLength(2);
  expect(timelines('king-halo-float')).toEqual(timelines('king-halo-float-rear'));
  expect(markup).toContain('values="0 0;0 -4;0 0"');
  expect(markup).toContain('values="0;1;0;0" keyTimes="0;.2;.45;1"');
  expect(markup).toContain('pathLength="100" stroke-dasharray="14 110"');
  expect(markup).not.toContain('prefers-reduced-motion');
  expect(markup).not.toContain('!important');
  expect(previewSvg({body:0,expression:0,accessory:10,background:0},0,'still')).toContain('<animate');
});
