import profiles from './choreography.json';
import { angryGroundEffects } from './angry-effects';
import { direction, wristLeft } from './motion-direction';
import { forearmGeometry } from './forearm-geometry';
import rig from './neutral-rig.json';

// Authored once; sync-king-art-effects.cjs exports identical EVM SVG strings.
// Deform absolute coordinates, keeping the tail root fixed. The distal end
// follows one beat later, rather than rotating a second copy of the whole tail.
function flexPath(path: string, bend: number): string {
  let x = true;
  let lastX = 318;
  return path.replace(/-?\d+(?:\.\d+)?/g, value => {
    const n = Number(value);
    if (x) { lastX = n; x = false; return value; }
    x = true;
    const weight = Math.max(0, Math.min(1, (lastX - 330) / 105));
    return String(Number((n + bend * weight * weight).toFixed(2)));
  });
}

export function secondaryMotionSvg(expression: number): string {
  const p = profiles[expression];
  if (!p || !Number.isInteger(expression)) throw new RangeError('Invalid expression');
  const ease = Array(6).fill('.4 0 .6 1').join(';');
  const timing = ` keyTimes="${expression === 5 ? '0;.26;.3;.43;.58;.82;1' : expression === 16 ? '0;.12;.25;.5;.75;.88;1' : '0;.12;.3;.43;.58;.82;1'}" calcMode="spline" keySplines="${ease}" dur="${p.duration}s" repeatCount="indefinite"`;
  const animate = (id: string, attribute: string, values: string) => `<animate href="#${id}" attributeName="${attribute}" values="${values}"${timing}/>`;
  const lift = p.lift.split(';').map(Number);
  const lean = p.lean.split(';').map(Number);
  let result = '<g fill="#342c24"><ellipse id="king-contact-left" cx="190" cy="490" rx="24" ry="4" opacity=".12"/><ellipse id="king-contact-right" cx="322" cy="490" rx="24" ry="4" opacity=".12"/></g>';
  if (expression === 17) result += angryGroundEffects();
  result += animate('action-shadow', 'cx', lean.map(v => 256 - v * 1.5).join(';'));
  result += animate('action-shadow', 'rx', lift.map(v => Number((101 + Math.min(0, v) * 1.4).toFixed(2))).join(';'));
  result += animate('action-shadow', 'opacity', lift.map(v => Number((.18 + Math.min(0, v) * .006).toFixed(3))).join(';'));
  // Contact patches stay on the floor, not attached to airborne feet.
  for (const [side, x] of [['left', 190], ['right', 322]] as const) {
    result += animate(`king-contact-${side}`, 'cx', lean.map(v => x - v * 1.5).join(';'));
    result += animate(`king-contact-${side}`, 'opacity', lift.map(v => v < -2 ? 0 : .12).join(';'));
  }
  const tail = p.tail.split(';').map(Number);
  // Each tail follows its own action, with a delayed tip rather than two presets.
  // These gestures speak through the tip, not a broad whole-tail wag.
  const tipAccents: Record<number, number[]> = {
    0: [0,1,5,-6,6,2,0],
    4: [0,0,0,1,4,2,0],
    5: [0,0,-8,-5,3,1,0],
    6: [0,0,-3,-4,-4,-1,0],
    7: [0,1,4,7,5,2,0],
    11: [0,0,2,4,3,1,0],
    15: [0,1,5,-4,5,1,0],
    9: [0,0,-1,-2,-2,-2,0],
    10: [0,0,6,-5,6,1,0],
    16: [0,0,-6,-6,6,6,0],
    20: [0,0,-2,-5,-5,-5,0],
  };
  const bends = tipAccents[expression] ?? tail.map((v, i) => i === 0 || i === 6 ? 0 : Number((tail[i - 1] * .45 - v * .18).toFixed(2)));
  for (const kind of ['silhouette', 'stripes', 'highlight']) {
    const tag = rig.rear.match(new RegExp(`<path[^>]*data-tail-flex="${kind}"[^>]*>`))?.[0];
    const path = tag?.match(/\sd="([^"]+)"/)?.[1];
    if (!path) throw new Error(`Missing tail geometry: ${kind}`);
    // A shared deformation field carries outline, stripes and shine together.
    // Bend the distal hook first, then let the middle follow. Unlike independent
    // target contours this cannot pull the stripe endpoints towards another pose.
    const curling = [3,11,17].includes(expression);
    const tip = curling ? [0,.28,.88,1,.94,.3,0] : [0,0,0,0,0,0,0];
    const middle = curling ? [0,0,.5,1,.88,.18,0] : [0,0,0,0,0,0,0];
    const frames = bends.map((v, beat) => {
      const flexed = flexPath(path, v * (1 - middle[beat] * .8));
      if (!curling || beat === 0 || beat === 6) return flexed;
      // Local rotations, not scaling: keep the root fixed and the hook open.
      // Smooth weights avoid a visible joint at either end of the bend region.
      const smooth = (n: number) => { const t = Math.max(0, Math.min(1, n)); return t*t*(3-2*t); };
      return flexed.replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (_, xs: string, ys: string) => {
        let x = Number(xs), y = Number(ys);
        const rotate = (cx: number, cy: number, angle: number) => {
          const dx = x-cx, dy = y-cy;
          x = cx + dx*Math.cos(angle) - dy*Math.sin(angle);
          y = cy + dx*Math.sin(angle) + dy*Math.cos(angle);
        };
        const rootWeight = smooth((x-350)/50);
        const tipWeight = rootWeight * smooth((375-y)/35);
        rotate(425, 359, -Math.PI/3 * tip[beat] * tipWeight);
        rotate(380, 380, -Math.PI/18 * middle[beat] * rootWeight);
        return `${Number(x.toFixed(2))} ${Number(y.toFixed(2))}`;
      });
    });
    result += animate(`king-tail-flex-${kind}`, 'd', frames.join(';'));
  }
  // Bake the same wrist angles/timing into both sides of the forearm contour.
  // Grip variants use the existing upright palm alignment; sockets never move.
  for (const side of ['left', 'right'] as const) {
    const angles = p[side].split(';').map(Number);
    const wrists = (side === 'left' ? wristLeft[expression] : direction[expression][3]).split(';').map(Number);
    const sideTiming = ` keyTimes="${direction[expression][side === 'left' ? 0 : 1]}" calcMode="spline" keySplines="${Array(6).fill(direction[expression][2]).join(';')}" dur="${p.duration}s" repeatCount="indefinite"`;
    for (const gripping of side === 'right' ? [false, true] : [false]) {
      const suffix = gripping ? '-grip' : '';
      const frames = angles.map((angle, i) => forearmGeometry(side, wrists[i], angle, gripping));
      result += `<animate href="#king-forearm-${side}${suffix}" attributeName="d" values="${frames.map(f => f.fill).join(';')}"${sideTiming}/>`;
      result += `<animate href="#king-forearm-contour-${side}${suffix}" attributeName="d" values="${frames.map(f => f.contour).join(';')}"${sideTiming}/>`;
    }
    result += `<animate href="#king-pads-${side}" attributeName="opacity" values="1;1;.88;1;.92;1;1"${sideTiming}/>`;
  }
  // Dedicated matrix node preserves floor anchor (256,490), never overwrites lift.
  const jump = [1,5,8,10,18].includes(expression);
  const breathe = [4,6,15,19].includes(expression);
  const scales = expression === 11 ? [1,1.003,1.009,1.012,1.009,1.003,1] : expression === 7 ? [1,1.002,1.005,.998,1.004,1.001,1] : jump ? [1,.985,1.02,1.01,1.015,.99,1] : breathe ? [1,1.002,1.006,1.008,1.006,1.002,1] : [1,1,1.002,1.003,1.002,1,1];
  result += `<animateTransform href="#king-volume-motion" attributeName="transform" type="scale" values="${scales.map(y => `${Number((1/y).toFixed(4))} ${y}`).join(';')}"${timing}/>`;
  // Never scale a palm independently: that moves its seam off the forearm.
  // Local foot lifts are separate from ankle rotation and whole-body jumping.
  const steps: Record<number, [number[], number[]]> = {
    0: [[0,0,0,-4,0,0,0],[0,0,-4,0,-4,0,0]],
    2: [[0,0,0,0,0,0,0],[0,0,-5,-4,0,0,0]],
    5: [[0,0,-10,-4,0,0,0],[0,0,-8,-5,0,0,0]],
    8: [[0,0,-10,0,-10,0,0],[0,0,0,-10,0,0,0]],
    12: [[0,0,-2,-4,-2,0,0],[0,0,-3,-5,-2,0,0]],
    13: [[0,0,-5,0,-3,0,0],[0,0,0,-6,0,0,0]],
    15: [[0,0,0,-3,0,0,0],[0,0,-4,0,-4,0,0]],
    // Alternate the sneaking feet; never lift both local feet together.
    16: [[0,0,-5,-5,0,0,0],[0,0,0,0,-4,-4,0]],
    20: [[0,0,-5,0,0,0,0],[0,0,0,0,0,0,0]],
    17: [[0,0,-10,0,0,0,0],[0,0,0,0,0,0,0]],
  };
  if (steps[expression]) {
    for (const [index, side] of ['left', 'right'].entries()) {
      const values = steps[expression][index].map(y => `0 ${y}`).join(';');
      result += `<animateTransform href="#king-step-${side}" attributeName="transform" type="translate" values="${values}"${timing}/>`;
    }
  }
  if (expression === 8) {
    result += `<animateTransform href="#smil-king-staff-counter-turn" attributeName="transform" type="rotate" values="0 369 345;0 369 345;-90 369 345;-180 369 345;-270 369 345;-360 369 345;-360 369 345"${timing}/>`;
    // A complete in-plane tumble, not a mirrored front pretending to be a back.
    // The dedicated parent carries both wrists and every accessory together.
    result += `<animateTransform href="#king-full-turn" attributeName="transform" type="rotate" values="0 256 256;0 256 256;90 256 256;180 256 256;270 256 256;360 256 256;360 256 256"${timing}/>`;
  }
  return result;
}
