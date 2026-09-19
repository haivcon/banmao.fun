import { angryAnimate, angryMove, angrySteam } from './angry-effects';
// Cartoon rage: anticipation, stomp, short snarl, then cooling down.
export function angryExpression(_whiskers: string, animated = false): string {
  const animate = (attribute: string, values: string) => angryAnimate(attribute, values, animated);
  const move = (type: string, values: string) => angryMove(type, values, animated);
  const trembleTimes = '0;.43;.47;.51;.55;.59;.64;.82;1';
  const tremble = (type: string, values: string) => angryMove(type, values, animated, trembleTimes);
  const line = 'fill="none" stroke="#633c25" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"';
  const eyes = [218, 294].map(x => `<g data-angry-eye="${x}"><ellipse cx="${x}" cy="219" rx="19" ry="10" fill="#29243b">${animate('ry', '10;9;7;6;7;9;10')}</ellipse><circle cx="${x - 5}" cy="217" r="2.5" fill="#fff8e7"/></g>`).join('');
  const browRest = 'M197 198l39 13M276 211l39-13';
  const browPeak = 'M197 201l39 14M276 215l39-14';
  const brows = `<path data-angry-brows="true" d="${browRest}" ${line}>${animate('d', `${browRest};${browRest};${browPeak};${browPeak};${browPeak};${browRest};${browRest}`)}</path>`;
  const blink = (closed: boolean) => animated ? `<animate attributeName="visibility" values="${closed ? 'hidden;visible;hidden;hidden' : 'visible;hidden;visible;visible'}" keyTimes="0;.88;.915;1" calcMode="discrete" dur="4.8s" repeatCount="indefinite"/>` : '';
  const eyeGroup = `<g data-eye-motion="angry"><g class="king-eyes-open">${eyes}${blink(false)}</g><g class="king-closed-lids" visibility="hidden"><path d="M199 220l37 3M276 223l37-3" ${line}/>${blink(true)}</g>${brows}</g>`;
  const nose = '<path d="M256 240l-9 7 9 8 9-8z" fill="#df7e82" stroke="#784727" stroke-width="2"/>';
  const rest = 'M237 271Q256 254 275 271L272 281Q256 275 240 281Z';
  const peak = 'M237 271Q256 250 275 271L272 285Q256 279 240 285Z';
  const fangRest = 'M244 266l4 8 4-11M260 263l4 11 4-8';
  const fangPeak = 'M244 264l4 8 4-11M260 261l4 11 4-8';
  const mouth = `<g class="king-mouth" data-mouth-motion="17"><g data-angry-clench="true">${tremble('translate', '0 0;0 0;-1 0;1 0;-1 0;1 0;0 0;0 0;0 0')}<path data-angry-mouth="true" d="${rest}" fill="#593342" stroke="#633c25" stroke-width="2.5" stroke-linejoin="round">${animate('d', `${rest};${rest};${peak};${peak};${peak};${rest};${rest}`)}</path><path data-angry-fangs="true" d="${fangRest}" fill="#fff8e7" stroke="#633c25" stroke-width="1.5" stroke-linejoin="round">${animate('d', `${fangRest};${fangRest};${fangPeak};${fangPeak};${fangPeak};${fangRest};${fangRest}`)}</path></g></g>`;
  const whiskers = ['left', 'right'].map(side => {
    const left = side === 'left', x = left ? 211 : 301;
    const d = left ? 'M211 253L169 243M211 260H164M211 267L169 277' : 'M301 253L343 243M301 260H348M301 267L343 277';
    const angles = left ? [0,-4,2,-3,2,-2,0,0,0] : [0,4,-2,3,-2,2,0,0,0];
    return `<g data-whisker-mood="17"><path class="king-whiskers-${side}" d="${d}" fill="none" stroke="#784727" stroke-width="2.5" stroke-linecap="round" opacity=".78"/>${tremble('rotate', angles.map(a => `${a} ${x} 260`).join(';'))}</g>`;
  }).join('');
  // Fixed pivot wrapper keeps the rage mark's pulse on the forehead.
  const heat = [190, 322].map(x => `<g transform="translate(${x} 241)"><g data-angry-heat-layer="true">${move('scale', '1;1;1.1;1.2;1.12;1;1')}<ellipse rx="20" ry="14" fill="#ed7953" opacity=".16"/><ellipse rx="16" ry="10" fill="#ec6649" opacity=".25"/><ellipse rx="11" ry="6" fill="#dc493c" opacity=".4"/></g></g>`).join('');
  const bounceTimes = '0;.3;.43;.48;.54;.6;.72;.85;1';
  const detail = `<g class="king-expression-detail" data-detail="17"><g data-angry-heat="true" opacity=".3">${animate('opacity', '.3;.4;.7;1;.8;.4;.3')}${heat}<path d="M177 223l-3-7M185 220l-1-8M335 223l3-7M327 220l1-8" stroke="#d85b42" stroke-width="2" stroke-linecap="round"/></g>${angrySteam(animated)}<g transform="translate(321 182)"><g data-angry-rage="true">${angryMove('scale', '1;1;1.35;1.05;1.22;1.02;1;1;1', animated, bounceTimes)}<g>${angryMove('rotate', '0;0;-8;5;-4;2;0;0;0', animated, bounceTimes)}<path d="M-9-9v5q0 4-4 4M9-9v5q0 4 4 4M-9 9V5q0-4-4-4M9 9V5q0-4 4-4" fill="none" stroke="#d84e43" stroke-width="3" stroke-linecap="round">${animate('stroke', '#d84e43;#d84e43;#e85d35;#ff783c;#e85d35;#d84e43;#d84e43')}</path></g></g></g></g>`;
  return `<g id="expression">${eyeGroup}${nose}${mouth}<g class="king-whiskers">${whiskers}</g>${detail}</g>`;
}
