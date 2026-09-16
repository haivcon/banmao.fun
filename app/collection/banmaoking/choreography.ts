import { direction, wristLeft } from './motion-direction';
import profiles from './choreography.json';
export function choreographySvg(expression: number): string {
  const p = profiles[expression];
  if (!p) throw new RangeError('Invalid expression');
  const timing = ` keyTimes="0;.12;.3;.43;.58;.82;1" calcMode="spline" keySplines="${Array(6).fill('.4 0 .6 1').join(';')}" dur="${p.duration}s" repeatCount="indefinite"`;
  const d = direction[expression];
  const sideTiming = (left: boolean) => ` keyTimes="${d[left ? 0 : 1]}" calcMode="spline" keySplines="${Array(6).fill(d[2]).join(';')}" dur="${p.duration}s" repeatCount="indefinite"`;
  const targetTiming = (target: string) => target.includes('counter-lean') || target === 'king-character-motion' ? timing : sideTiming(target.endsWith('left'));
  const rotate = (target: string, beats: string, pivot: string) => `<animateTransform href="#smil-${target}" attributeName="transform" type="rotate" values="${beats.split(';').map(v => `${v} ${pivot}`).join(';')}"${targetTiming(target)}/>`;
  const inverse = (beats: string) => beats.split(';').map(v => String(-Number(v))).join(';');
  const shield = rotate('king-shield-counter-arm', inverse(p.right), '369 357') + rotate('king-shield-counter-lean', inverse(p.lean), '369 357');
  // Details inherit the arm transform, never a duplicate foreground limb.
  // Pads are children of the open paw: they cannot float over its back or cupped pose.
  const wrists = (['left', 'right'] as const).map(side => {
    const beats = d[3];
    const angles = side === 'left' ? wristLeft[expression] : beats;
    const cup = [3,4,13,17].includes(expression);
    // The supporting hand stays on its back during one-handed gestures.
    const closed = [6,15,18].includes(expression) || (side === 'left' && [0,2,4].includes(expression));
    const open = !cup && !closed ? '0;0;1;1;1;0;0' : '0;0;0;0;0;0;0';
    const cupped = cup && !closed ? '0;0;1;1;1;0;0' : '0;0;0;0;0;0;0';
    const relaxed = closed ? '1;1;1;1;1;1;1' : '1;0;0;0;0;0;1';
    const edge = closed ? '0;0;0;0;0;0;0' : '0;1;0;0;0;1;0';
    const shapes = [['relaxed',relaxed],['open',open],['cupped',cupped],['edge',edge]].map(([shape,values]) => `<animate href="#king-paw-${shape}-${side}" attributeName="opacity" values="${values}" keyTimes="${d[side === 'left' ? 0 : 1]}" calcMode="discrete" dur="${p.duration}s" repeatCount="indefinite"/>`).join('');
    return (side === 'right' ? `<animateTransform href="#smil-king-staff-bob" attributeName="transform" type="translate" values="${beats.split(';').map(v => `0 ${v}`).join(';')}"${sideTiming(false)}/>` + rotate('king-held-wrist', inverse(p.right), '0 -12') + rotate('king-held-wrist', inverse(p.lean), '0 -12').replace(sideTiming(false), timing).replace('type="rotate"', 'type="rotate" additive="sum"') + rotate('king-shield-counter-wrist', inverse(angles), '369 357') : '') + rotate(`king-wrist-${side}`, angles, '0 -12') + shapes;
  }).join('');
  return wrists + shield + rotate('king-staff-counter-arm', inverse(p.right), '369 345') + rotate('king-staff-counter-wrist', inverse(d[3]), '369 345') + rotate('king-staff-counter-lean', inverse(p.lean), '369 345') + rotate('king-arm-left', p.left, '174 302') + rotate('king-arm-right', p.right, '338 302') + rotate('king-held-arm', p.right, '338 302') + rotate('king-leg-left', p.footLeft, '190 419') + rotate('king-leg-right', p.footRight, '322 419') + rotate('king-character-motion', p.lean, '256 450') + rotate('king-tail', p.tail, '318 383') + `<animateTransform href="#king-action-root" attributeName="transform" type="translate" values="${p.lift.split(';').map(v => `0 ${v}`).join(';')}"${timing}/>`;
}
