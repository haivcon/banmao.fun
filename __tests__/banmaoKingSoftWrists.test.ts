import { forearmGeometry } from '../app/collection/banmaoking/forearm-geometry';
import { direction, wristLeft } from '../app/collection/banmaoking/motion-direction';
import profiles from '../app/collection/banmaoking/choreography.json';
import rig from '../app/collection/banmaoking/neutral-rig.json';
import { cyborgBody } from '../app/collection/banmaoking/body-effects';
import { secondaryMotionSvg } from '../app/collection/banmaoking/secondary-motion';
import { previewSvg } from '../app/collection/banmaoking/smil-preview';

test('grip tangent follows the shoulder-to-palm axis instead of bending vertically down', () => {
  const curve = nums(forearmGeometry('right', 0, 0, true).contour.split('C')[2].split('M')[0]);
  const dx = curve[4] - curve[2], dy = curve[5] - curve[3];
  // Shoulder center (338,306) to attachment (369,345): about 38.5 degrees
  // from vertical. Allow a soft transition, but reject the old vertical wrist.
  const alignment = (dx * 31 + dy * 39) / (Math.hypot(dx, dy) * Math.hypot(31, 39));
  expect(alignment).toBeGreaterThan(Math.cos(12 * Math.PI / 180));
});

test.each([6, 9, 14, 15, 17, 19, 20])('accessory %i shares the tilted palm socket in both body rigs', accessory => {
  for (const body of [0, 7]) {
    const svg = previewSvg({ body, accessory, expression: 5, background: 0 }, 1, 'socket');
    expect(svg).toContain('.king-arm-right .king-paw-alignment-cupped{transform:rotate(-28deg);transform-origin:0px -12px}');
    const propRule = '[id$="smil-king-held-wrist"]{transform:rotate(-28deg)!important;transform-origin:0px -12px}';
    expect(svg).not.toContain(propRule);
    const tracks = svg.match(/<animateTransform[^>]*href="#socket-smil-king-held-wrist"[^>]*>/g) || [];
    expect(tracks).toHaveLength(2);
    expect(tracks[0]).toContain('values="0 0 -12;-8 0 -12;108 0 -12;120 0 -12;50 0 -12;6 0 -12;0 0 -12"');
    expect(tracks[1]).toContain('additive="sum"');
    expect(svg).toContain('[data-accessory="6"] [data-ak-grip]{display:none}');
    expect(svg).toContain('id="socket-smil-king-held-wrist"');
    const offset = svg.match(/\[id\$="smil-king-held-arm"\]>g\{transform:translate\(([\d.]+)px,([\d.]+)px\)\}/)!;
    expect(offset).not.toBeNull();
    // Undo palm rotation/scaling: the prop pivot must land inside the
    // distal palm at (0,4), not at the wrist (0,-12) or outside the fingers.
    const dx = Number(offset[1]) - 369;
    // Undo the additional 3-unit lift before checking the anatomical anchor.
    expect(Number(offset[1])).toBeCloseTo(377.26, 2);
    expect(Number(offset[2])).toBeCloseTo(369.54, 2);
    const dy = Number(offset[2]) + 3 - 12 - 345;
    const angle = -28 * Math.PI / 180;
    expect((dx * Math.cos(angle) + dy * Math.sin(angle)) / 1.1).toBeCloseTo(0, 2);
    expect((-dx * Math.sin(angle) + dy * Math.cos(angle)) / 1.1 - 12).toBeCloseTo(4, 2);
    expect(svg).not.toContain('translate(373px,352px)');
    expect(svg).not.toContain('translate(376px,352px)');
    // The nudge belongs to the prop socket, not the anatomical palm anchor.
    expect(svg).toContain('translate(369 357)');
    expect(svg).toContain(forearmGeometry('right', 0, 0, true).contour);
  }
});

// Inspect assembled, prefixed scenes, not just the isolated geometry helper.
test.each([6, 9, 14, 15, 17, 19, 20])('accessory %i keeps all inverse prop rotations locked in normal and Cyborg previews', accessory => {
  for (const body of [0, 7]) {
    const svg = previewSvg({ body, accessory, expression: 5, background: 0 }, 1, 'grip-test');
    for (const target of ['shield-counter-arm', 'shield-counter-lean', 'staff-counter-arm', 'staff-counter-lean', 'staff-counter-turn']) {
      expect(svg).toContain(`[id$="smil-king-${target}"]`);
    }
    expect(svg).toContain('[id$="smil-king-staff-counter-turn"]){transform:none!important}');
    expect(svg).toContain('id="grip-test-smil-king-held-arm"');
    expect(svg).toContain('href="#grip-test-smil-king-arm-right"');
  }
});

test.each(profiles.map((_, i) => i))('wrist %i has no independent palm scaling or reversed distal contour', id => {
  expect(secondaryMotionSvg(id)).not.toMatch(/<animateTransform[^>]*href="#king-paw-/);
  for (const side of ['left', 'right'] as const) {
    const wrists = (side === 'left' ? wristLeft[id] : direction[id][3]).split(';').map(Number);
    const shoulders = profiles[id][side].split(';').map(Number);
    for (const grip of side === 'left' ? [false] : [false, true]) {
      for (let beat = 0; beat < 6; beat++) for (let sample = 0; sample <= 10; sample++) {
        const t = sample / 10;
        const w = wrists[beat] * (1 - t) + wrists[beat + 1] * t;
        const s = shoulders[beat] * (1 - t) + shoulders[beat + 1] * t;
        const curves = forearmGeometry(side, w, s, grip).contour.split('C');
        const outer = nums(curves[2].split('M')[0]);
        const inner = nums(curves[3]);
        // Distal handles progress toward the palm rather than doubling back.
        expect(outer[1]).toBeLessThan(outer[3]);
        expect(outer[3]).toBeLessThan(outer[5]);
        expect(inner[1]).toBeGreaterThan(inner[3]);
        expect(inner[3]).toBeGreaterThan(inner[5]);
      }
    }
  }
});

test('gripping forearm stays rigid at every raised-arm beat and between beats', () => {
  const neutral = forearmGeometry('right', 0, 0, true);
  profiles.forEach((profile, id) => {
    const wrists = direction[id][3].split(';').map(Number);
    const shoulders = profile.right.split(';').map(Number);
    for (let beat = 0; beat < 6; beat++) for (let sample = 0; sample <= 10; sample++) {
      const t = sample / 10;
      expect(forearmGeometry('right', wrists[beat] * (1 - t) + wrists[beat + 1] * t,
        shoulders[beat] * (1 - t) + shoulders[beat + 1] * t, true)).toEqual(neutral);
    }
  });
  expect(forearmGeometry('right', 12, 90)).not.toEqual(forearmGeometry('right', 0, 0));
});

test.each([false, true])('grip-only wrist lock includes props and inverse wrist tracks (cyborg=%s)', cyborg => {
  const svg = cyborg ? cyborgBody(rig.rear) : rig.rear;
  const selector = ':is([data-accessory="6"],[data-accessory="9"],[data-accessory="14"],[data-accessory="15"],[data-accessory="17"],[data-accessory="19"],[data-accessory="20"])';
  expect(svg).toContain(`${selector} :is([id$="smil-king-wrist-right"],[id$="smil-king-shield-counter-wrist"],[id$="smil-king-staff-counter-wrist"]){transform:none!important}`);
});

test.each([false, true])('palms and forearms share seam-free paint (cyborg=%s)', cyborg => {
  const svg = cyborg ? cyborgBody(rig.rear) : rig.rear;
  const paths: string[] = svg.match(/<path\b[^>]*>/g) || [];
  const arms = paths.filter(tag => /id="king-forearm-(?:left|right|right-grip)"/.test(tag));
  const palms = paths.filter(tag => tag.includes('C10-18-10-18-10-16Z'));
  expect(arms).toHaveLength(3);
  expect(palms).toHaveLength(8);
  expect(arms[0]).toContain('fill="#e99a50"');
  for (const arm of arms.slice(1)) expect(arm).toContain(`fill="${cyborg ? '#71889b' : '#e99a50'}"`);
  palms.forEach((palm, i) => {
    expect(palm).toContain(`fill="${cyborg && i >= 4 ? '#71889b' : '#e99a50'}"`);
    expect(palm).not.toMatch(/\bstroke="(?!none)/);
  });
  // Other fur still retains its shading; no global palette flattening.
  expect(svg).toContain('fill="url(#bk-fur)"');
});

test('all palm contours meet forearms with equal widths, tangent overlap and no round seam caps', () => {
  const contours = rig.rear.match(/<path class="king-paw-contour"[^>]*>/g) || [];
  expect(contours).toHaveLength(8);
  for (const tag of contours) {
    const width = Number(tag.match(/stroke-width="([^"]+)"/)![1]);
    expect(width * 1.1).toBeCloseTo(2.8, 8);
    expect(tag).toContain('stroke-linecap="butt"');
    expect(tag).toContain('M-10-16.6L-10-16C-10');
    expect(tag).toContain('10-16L10-16.6"');
  }
  const forearms = rig.rear.match(/<path id="king-forearm-contour-[^"]+"[^>]*>/g) || [];
  expect(forearms).toHaveLength(3);
  for (const tag of forearms) expect(tag).toContain('stroke-linecap="butt"');
});

const nums = (s: string) => (s.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
test.each(profiles.map((_, i) => i))('wrist %i meets the palm with a continuous tangent', id => {
  for (const side of ['left', 'right'] as const) {
    const left = side === 'left';
    const wrists = (left ? wristLeft[id] : direction[id][3]).split(';').map(Number);
    for (const grip of left ? [false] : [false, true]) {
      wrists.forEach((w, beat) => {
        const g = forearmGeometry(side, w, Number(profiles[id][side].split(';')[beat]), grip);
        const curve = nums(g.contour.split('C')[2].split('M')[0]);
        expect(g.contour.match(/C/g)).toHaveLength(4);
        const angle = (grip ? (left ? 28 : -28) : (left ? 36 : -36) + w) * Math.PI / 180;
        const px = left ? -11 : 11;
        const expected = [(left ? 143 : 369) + px * Math.cos(angle) + 4.4 * Math.sin(angle), 345 + px * Math.sin(angle) - 4.4 * Math.cos(angle)];
        expect(Math.hypot(curve[4] - expected[0], curve[5] - expected[1])).toBeLessThan(.008);
        const dx = curve[4] - curve[2], dy = curve[5] - curve[3];
        expect(Math.abs(dx * Math.cos(angle) + dy * Math.sin(angle))).toBeLessThan(.02);
        expect(g.contour).not.toContain('Q');
        expect(nums(g.fill).every(Number.isFinite)).toBe(true);
      });
    }
  }
});
test('all eight palm poses have a shallow rounded overlap, not a projecting wrist tab', () => {
  expect(rig.rear).not.toContain('L10-24Q0-32-10-24Z');
  expect(rig.rear.match(/C10-18-10-18-10-16Z/g)).toHaveLength(8);
  // Cubic cap is tangent to the vertical palm edges, with just 1.65px
  // overlap after enlargement (the previous cap extended 13.2px).
  for (let step = 0; step <= 100; step++) {
    const t = step / 100;
    const y = -16 * (1 - t) ** 3 - 54 * (1 - t) ** 2 * t
      - 54 * (1 - t) * t ** 2 - 16 * t ** 3;
    expect((-16 - y) * 1.1).toBeLessThanOrEqual(1.650001);
  }
});

test.each(profiles.map((_, i) => i))('wrist %i stays within overlap tolerance between beats', id => {
  for (const side of ['left', 'right'] as const) {
    const wrists = (side === 'left' ? wristLeft[id] : direction[id][3]).split(';').map(Number);
    const shoulders = profiles[id][side].split(';').map(Number);
    for (const grip of side === 'left' ? [false] : [false, true]) {
      for (let beat = 0; beat < 6; beat++) {
        const endpoint = (w: number, s: number) => nums(forearmGeometry(side, w, s, grip).contour.split('C')[2].split('M')[0]).slice(4, 6);
        const a = endpoint(wrists[beat], shoulders[beat]);
        const b = endpoint(wrists[beat + 1], shoulders[beat + 1]);
        // Both tracks share spline easing, so sample its complete output range.
        for (let step = 0; step <= 20; step++) {
          const t = step / 20;
          const actual = endpoint(wrists[beat] * (1 - t) + wrists[beat + 1] * t, shoulders[beat] * (1 - t) + shoulders[beat + 1] * t);
          expect(Math.hypot(...actual.map((v, axis) => v - a[axis] * (1 - t) - b[axis] * t))).toBeLessThan(.35);
        }
      }
    }
  }
});

test('both smaller feet preserve floor height and separate step transforms', () => {
  for (const side of ['left', 'right']) {
    expect(rig.rear).toContain(`<g id="king-step-${side}"><g data-foot-size="${side}" transform="scale(.9 1)">`);
  }
  expect(rig.rear.match(/data-foot-size=/g)).toHaveLength(2);
  expect(rig.rear.match(/data-palm-size=/g)).toHaveLength(2);
  for (const side of ['left', 'right']) {
    expect(rig.rear).toContain(`data-palm-size="${side}" transform="translate(0 -12) scale(1.1) translate(0 12)"`);
  }
  expect(rig.rear).toContain('class="king-grip-forearm"');
});
