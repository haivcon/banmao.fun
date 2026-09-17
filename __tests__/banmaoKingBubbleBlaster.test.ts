import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { BUBBLE_BLASTER_SVG } from '../app/collection/banmaoking/bubble-blaster';
import flights from '../app/collection/banmaoking/bubble-flight-smil.json';
import { previewSvg } from '../app/collection/banmaoking/smil-preview';
import { ACCESSORY_TRAITS } from '../app/collection/banmaoking/traits';

test('contract-owned dual blasters retain trait IDs without inherited particles', () => {
  expect(ACCESSORY_TRAITS[19]).toBe('Bubble Blaster');
  expect(ACCESSORY_TRAITS[20]).toBe('Imperial Regalia');
  expect(BUBBLE_BLASTER_SVG.match(/href="#blaster-gun"/g)).toHaveLength(2);
  expect(BUBBLE_BLASTER_SVG).not.toMatch(/animateMotion|data-blaster-bubble/);
  expect(fs.readFileSync(path.resolve('app/collection/banmaoking/KingAnimatedSvg.tsx'), 'utf8')).not.toMatch(/startBubbleFlight|requestAnimationFrame/);
});

test('canonical artwork and baked launch data remain synchronized', () => {
  for (const file of ['sync-king-bubble-blaster.cjs', 'bake-king-bubble-launch.cjs']) {
    expect(execFileSync(process.execPath, [path.resolve('tools', file), '--check'], { encoding: 'utf8' })).toMatch(/synchronized|PASS/);
  }
});

test.each(Array.from({ length: 21 }, (_,i) => i))('expression %i uses root-level script-free particles with scoped references', expression => {
  const svg = previewSvg({ body: 0, expression, accessory: 19, background: 0 }, 1, 'bubble');
  const stack: string[] = [];
  for (const tag of svg.match(/<\/?g\b[^>]*>/g) ?? []) {
    if (tag.startsWith('</')) stack.pop();
    else {
      if (tag.includes('data-bubble-world')) expect(stack).toHaveLength(0);
      stack.push(tag);
    }
  }
  const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  expect(new Set(ids).size).toBe(ids.length);
  for (const [,id] of svg.matchAll(/href="#([^"]+)"/g)) expect(ids).toContain(id);
  expect(svg).not.toMatch(/<script|undefined|NaN|data-blaster-bubble/);
  const motions = [...flights[expression].matchAll(/<animateMotion[^>]*begin="([^"]+)" dur="([^"]+)"/g)];
  expect(motions.length % 2).toBe(0);
  expect(5 * motions.length / parseFloat(motions[0][2])).toBeGreaterThan(19);
  expect(5 * motions.length / parseFloat(motions[0][2])).toBeLessThan(21);
  expect(flights[expression]).toContain('data-free-bubble="0"');
  expect(flights[expression]).toContain('data-free-bubble="1"');
});
