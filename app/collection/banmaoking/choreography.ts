import profiles from './choreography.json';
export function choreographySvg(expression: number): string {
  const p = profiles[expression];
  if (!p) throw new RangeError('Invalid expression');
  const timing = ` keyTimes="0;.12;.3;.43;.58;.82;1" calcMode="spline" keySplines="${Array(6).fill('.4 0 .6 1').join(';')}" dur="${p.duration}s" repeatCount="indefinite"`;
  const rotate = (target: string, beats: string, pivot: string) => `<animateTransform href="#smil-${target}" attributeName="transform" type="rotate" values="${beats.split(';').map(v => `${v} ${pivot}`).join(';')}"${timing}/>`;
  const inverse = (beats: string) => beats.split(';').map(v => String(-Number(v))).join(';');
  const shield = rotate('king-shield-counter-arm', inverse(p.right), '369 357') + rotate('king-shield-counter-lean', inverse(p.lean), '369 357');
  // Details inherit the arm transform, never a duplicate foreground limb.
  const both = [1, 3, 5, 10].includes(expression);
  const palm = (side: string, visible: boolean) => `<animate href="#king-palm-${side}" attributeName="opacity" values="${visible ? '0;0;1;.8;.35;0;0' : '0;0;0;0;0;0;0'}"${timing}/>`;
  const wrists = (['left', 'right'] as const).map(side => {
    const active = both || (side === 'right' && [0, 2].includes(expression));
    const beats = !active ? '0;0;0;0;0;0;0' : expression === 3 ? '0;10;14;-7;-10;2;0' : expression === 0 ? '0;0;-10;12;-10;2;0' : expression === 2 ? '0;0;-5;14;-4;1;0' : expression === 5 ? '0;0;-13;-7;-9;1;0' : '0;0;-7;8;-6;2;0';
    const angles = side === 'left' ? beats.split(';').map(v => String(-Number(v))).join(';') : beats;
    const open = active ? (expression === 3 ? '0;0;0;1;1;0;0' : '0;0;1;1;1;0;0') : '0;0;0;0;0;0;0';
    const cupped = expression === 3 ? '0;1;1;0;0;0;0' : '0;0;0;0;0;0;0';
    const relaxed = open.split(';').map((v,i) => String(1-Number(v)-Number(cupped.split(';')[i]))).join(';');
    const shapes = [['relaxed',relaxed],['open',open],['cupped',cupped]].map(([shape,values]) => `<animate href="#king-paw-${shape}-${side}" attributeName="opacity" values="${values}" keyTimes="0;.12;.3;.43;.58;.82;1" calcMode="discrete" dur="${p.duration}s" repeatCount="indefinite"/>`).join('');
    return rotate(`king-wrist-${side}`, angles, '0 -12') + (side === 'right' ? `<animateTransform href="#smil-king-staff-bob" attributeName="transform" type="translate" values="${beats.split(';').map(v => `0 ${v}`).join(';')}"${timing}/>` + rotate('king-held-wrist', angles, '0 -12') + rotate('king-shield-counter-wrist', inverse(angles), '369 357') : '') + shapes;
  }).join('');
  return rotate('king-staff-counter-lean', inverse(p.lean), '256 450') + shield + wrists + palm('left', both) + palm('right', both || expression === 0 || expression === 2) + rotate('king-arm-left', p.left, '174 302') + rotate('king-arm-right', p.right, '338 302') + rotate('king-held-arm', p.right, '338 302') + rotate('king-leg-left', p.footLeft, '190 419') + rotate('king-leg-right', p.footRight, '322 419') + rotate('king-character-motion', p.lean, '256 450') + rotate('king-tail', p.tail, '318 383') + `<animateTransform href="#king-action-root" attributeName="transform" type="translate" values="${p.lift.split(';').map(v => `0 ${v}`).join(';')}"${timing}/>`;
}
