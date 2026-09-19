// Impact at .43 matches the authored foot-contact beat. All effects reset invisibly.
export const angryTimes = '0;.12;.3;.43;.58;.82;1';
export function angryAnimate(attribute: string, values: string, animated = true, times = angryTimes): string {
  return animated ? `<animate attributeName="${attribute}" values="${values}" keyTimes="${times}" dur="4.8s" repeatCount="indefinite"/>` : '';
}
export function angryMove(type: string, values: string, animated = true, times = angryTimes): string {
  return animated ? `<animateTransform attributeName="transform" type="${type}" values="${values}" keyTimes="${times}" dur="4.8s" repeatCount="indefinite"/>` : '';
}
export function angrySteam(animated: boolean): string {
  return [-1, 1].map(side => {
    const times = side < 0 ? '0;.4;.43;.51;.66;.82;1' : '0;.43;.46;.54;.69;.85;1';
    return `<g transform="translate(${256 + side * 91} 211)"><g data-angry-steam="${side}" opacity="0">${angryAnimate('opacity', '0;0;.85;.75;.25;0;0', animated, times)}${angryMove('translate', `0 0;0 0;${side * 5} -2;${side * 15} -8;${side * 25} -21;${side * 29} -30;0 0`, animated, times)}<g>${angryMove('scale', '.35;.35;.7;1;1.25;1.4;.35', animated, times)}<path d="M-12 3Q-21-5-12-10Q-11-21 0-16Q12-23 16-11Q27-5 17 4Q5 12-12 3Z" fill="#fff7e9" stroke="#baaa94" stroke-width="1.3"/><circle cx="-9" cy="12" r="3" fill="#fff7e9"/><circle cx="8" cy="15" r="2" fill="#fff7e9"/></g></g></g>`;
  }).join('');
}
export function angryGroundEffects(): string {
  const times = '0;.42;.43;.5;.62;.82;1';
  const a = (name: string, values: string) => angryAnimate(name, values, true, times);
  const particles = [-1, 1].flatMap(side => [0, 1].map(i => `<circle data-angry-dust="true" cx="${190 + side * 8}" cy="488" r="${3 - i}" fill="#d8ba87" opacity="0">${a('opacity', '0;0;.75;.6;0;0;0')}${a('cx', `${190 + side * 8};${190 + side * 8};${190 + side * 8};${190 + side * (24 + i * 12)};${190 + side * (39 + i * 12)};${190 + side * (39 + i * 12)};${190 + side * 8}`)}${a('cy', `488;488;488;${477 - i * 6};485;488;488`)}</circle>`)).join('');
  return `<g data-angry-ground="true"><ellipse data-angry-impact="true" cx="190" cy="489" rx="8" ry="2" fill="none" stroke="#d8ba87" stroke-width="2" opacity="0">${a('opacity', '0;0;.7;.45;0;0;0')}${a('rx', '8;8;8;30;48;48;8')}${a('ry', '2;2;2;5;7;7;2')}</ellipse>${particles}</g>`;
}
