import expansion from './expansion.json';
import profiles from './choreography.json';

// Cancel body rotation at the chain's attachment, not around the body origin.
// Translation and subtle volume breathing remain inherited so the clasp never detaches.
export function bitcoinMedallionSvg(expression: number): string {
  const p = profiles[expression];
  if (!p || !Number.isInteger(expression)) throw new RangeError('Invalid expression');
  const times = expression === 5 ? '0;.26;.3;.43;.58;.82;1' : '0;.12;.3;.43;.58;.82;1';
  const timing = (keyTimes: string) => ` keyTimes="${keyTimes}" calcMode="spline" keySplines="${Array(6).fill('.4 0 .6 1').join(';')}" dur="${p.duration}s" repeatCount="indefinite"`;
  const rotate = (values: number[], keyTimes = times) => `<animateTransform attributeName="transform" type="rotate" values="${values.map(v => `${v} 256 333`).join(';')}"${timing(keyTimes)}/>`;
  const lean = p.lean.split(';').map(Number);
  // A delayed, bounded response followed by alternating smaller settling beats.
  const strength = Math.min(18, Math.max(3, ...lean.map(Math.abs)) * 1.4);
  const sign = lean.find(v => v !== 0)! < 0 ? -1 : 1;
  const swing = [0, 0, -strength * sign, strength * sign * .65, -strength * sign * .32, strength * sign * .12, 0].map(v => Number(v.toFixed(2)));
  const turn = expression === 8 ? [0, 0, -90, -180, -270, -360, -360] : [0, 0, 0, 0, 0, 0, 0];
  const source = expansion.accessories[1].svg;
  const start = '<g data-revision="2">';
  const at = source.indexOf(start);
  const end = source.indexOf('/>', at) + 2;
  if (at < 0 || end < at) throw new Error('Missing Bitcoin Medallion pendant');
  const counter = '<g data-btc-counter-lean="true">' + rotate(lean.map(v => -v)) + '<g data-btc-counter-turn="true">' + rotate(turn, '0;.12;.3;.43;.58;.82;1');
  const pendant = '<g data-btc-pendulum="damped">' + rotate(swing, '0;.18;.38;.54;.7;.86;1');
  return source.slice(0, at) + counter + pendant + source.slice(end).replace(/<\/g><\/g>$/, '</g></g></g></g>');
}
