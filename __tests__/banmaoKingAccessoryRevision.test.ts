import { previewSvg } from '../app/collection/banmaoking/smil-preview';
import expansion from '../app/collection/banmaoking/expansion.json';
import royal from '../app/collection/banmaoking/royal-contract.json';
import { BACKGROUND_TRAITS } from '../app/collection/banmaoking/traits';

const render = (accessory: number) => previewSvg({body:7,expression:0,accessory,background:1},1,'revision');
test.each([15,17])('accessory %i follows both right arm and wrist', accessory => {
  const svg=render(accessory);
  for (const part of ['arm','wrist']) {
    const animation=(id:string)=>svg.match(new RegExp(`<animateTransform href="#revision-smil-king-${id}"[^>]+>`))?.[0].replace(/href="[^"]+"/,'');
    expect(animation(`held-${part}`)).toBeDefined();
    expect(animation(`held-${part}`)).toBe(animation(`${part}-right`));
    expect(svg.match(new RegExp(`id="revision-smil-king-held-${part}"`,'g'))).toHaveLength(1);
  }
});
test.each(Array.from({length:21},(_,i)=>i))('coffee stays on the upright held-prop rig for expression %i', expression => {
  const svg=previewSvg({body:7,expression,accessory:17,background:1},1,'coffee');
  expect(svg).toContain('data-upright-coffee="true"');
  expect(svg).toContain('data-coffee-bean="true"');
  expect(svg).toContain('data-coffee-handle="true"');
  for(const part of ['arm','wrist','lean']) {
    expect(svg).toContain(`id="coffee-smil-king-shield-counter-${part}"`);
    expect(svg).toContain(`href="#coffee-smil-king-shield-counter-${part}"`);
  }
  expect(expansion.accessories[5].svg).toContain('cx="406" cy="333"');
  expect(expansion.accessories[5].svg).not.toContain('translate(-34 0)');
});

test.each([14,19,20])('staff %i bobs vertically independently of the hand', accessory => {
  const svg=render(accessory);
  expect(svg).toContain('data-upright-staff="true"');
  expect(svg).toContain('data-staff-bob="true"');
  expect(svg).toContain('id="revision-smil-king-staff-bob"');
  expect(svg).toContain('values="0 0;0 0;0 -10;0 12;0 -10;0 2;0 0"');
  expect(svg).not.toContain('values="0 0;0 -8;0 0"');
  expect(svg).not.toContain('id="revision-smil-king-held-arm"');
  expect(svg).not.toContain('id="revision-smil-king-held-wrist"');
  expect(svg).toContain('href="#revision-smil-king-staff-counter-lean"');
});
test('regalia keeps crown jewels outside the staff and confines staff light rings',()=>{
  expect(royal.REGALIA.indexOf('class="king-solar-regalia"')).toBeLessThan(royal.REGALIA.indexOf('data-upright-staff'));
  expect(royal.REGALIA.indexOf('translate(256 91)')).toBeLessThan(royal.REGALIA.indexOf('data-upright-staff'));
  expect(royal.REGALIA).toContain('values="18;25"');
  expect(royal.REGALIA).not.toContain('values="18;42"');
});

test('canonical props include swinging coin, enlarged shield and typed floating laptop',()=>{
  expect(expansion.accessories[1].svg).toContain('-4 256 330;4 256 330');
  expect(expansion.accessories[3].svg).toContain('1.22;1.3;1.22');
  const laptop=expansion.accessories[4].svg;
  expect(laptop).toContain('data-laptop-float');
  expect([...laptop.matchAll(/<text[^>]*>([^<]+)/g)].map(m=>m[1]).join('')).toBe('$banmao');
  expect(expansion.accessories[6].svg.match(/data-flower=/g)).toHaveLength(9);
  expect(BACKGROUND_TRAITS[1].name).toBe('Cyberpunk Nexus');
});
test.each([13,14,15,16,17,18,19,20])('accessory %i has balanced SVG nesting', accessory=>{
  const svg=accessory===20?royal.REGALIA:expansion.accessories[accessory-12].svg;
  const stack:string[]=[];
  for(const [,close,name,tail] of svg.matchAll(/<(\/?)([\w-]+)([^>]*)>/g)) {
    if(close) expect(stack.pop()).toBe(name);
    else if(!tail.endsWith('/')) stack.push(name);
  }
  expect(stack).toEqual([]);
});


test.each(Array.from({length:21}, (_,i)=>i))('flower ring surrounds the body in expression %i', expression => {
  const svg = previewSvg({body:7, expression, accessory:18, background:1},1,'flower');
  const rear = svg.indexOf('data-flower-crown-rear');
  const body = svg.indexOf('id="flower-banana-shell"');
  const front = svg.indexOf('data-flower-crown-front');
  expect(rear).toBeGreaterThan(-1);
  expect(body).toBeGreaterThan(rear);
  expect(front).toBeGreaterThan(body);
  expect(svg.match(/data-flower=/g)).toHaveLength(9);
  expect(expansion.accessories[6].svg).not.toContain('<ellipse cx="256" cy="117"');
});

test('ETH rays travel outward and switch fully off between bursts', () => {
  const svg = expansion.accessories[2].svg;
  expect(svg.match(/data-eth-burst=/g)).toHaveLength(8);
  expect(svg).not.toContain('M357 244L');
  expect(svg.match(/values="0;0;.85;0;0"/g)).toHaveLength(1);
  expect(svg.match(/keyTimes="0;.4;1"/g)).toHaveLength(1);
});
test.each(Array.from({length:21}, (_,i)=>i))('shield cancels rotation for expression %i', expression => {
  const svg = previewSvg({body:7, expression, accessory:15, background:1},1,'upright');
  const angles = (id: string) => {
    const tag = svg.match(new RegExp(`<animateTransform href="#upright-smil-king-${id}"[^>]+>`))?.[0];
    expect(tag).toBeDefined();
    return tag!.match(/values="([^"]+)"/)![1].split(';').map(v=>Number(v.split(' ')[0]));
  };
  for (const [source, counter] of [['held-arm','arm'],['held-wrist','wrist'],['character-motion','lean']]) {
    const original = angles(source), inverse = angles(`shield-counter-${counter}`);
    original.forEach((value, i)=>expect(value + inverse[i]).toBe(0));
  }
  expect(svg).toContain('scale(1.18 1)');
});
