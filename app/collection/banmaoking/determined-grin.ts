// ID 18 only: burning resolve with a steady closed mouth, never an open smile.
// Shared by the organic face and the local Cyborg artwork generator.
export function victoryFlame(animated = false, side = 0): string {
  // Matching command topology allows continuous SMIL interpolation, not frame swapping.
  const frames = side === 0 ? [
    'M0 15C-16 15-19 4-12-6Q-12 2-7 1Q-11-9-3-22Q-4-9 4-4Q9-9 8-15C21 0 17 15 0 15Z',
    'M0 15C-15 15-18 3-14-10Q-13 0-7 2Q-5-10 4-24Q-1-10 6-3Q13-5 12-11C20 3 15 15 0 15Z',
    'M0 15C-17 15-20 5-10-3Q-10 3-6 0Q-14-10-8-19Q-8-7 3-2Q6-11 5-18C19-2 18 15 0 15Z',
  ] : [
    'M0 15C-16 15-17 5-9-12Q-10-2-4 1Q-2-7 7-20Q4-6 8-2Q13-4 14-9C21 5 16 15 0 15Z',
    'M0 15C-17 15-19 2-12-17Q-12-4-5 0Q3-5 11-16Q5-3 9 1Q14-1 16-6C20 8 15 15 0 15Z',
    'M0 15C-15 15-16 6-6-9Q-8-1-3 2Q-5-10 2-23Q1-7 7-3Q11-8 10-13C22 1 17 15 0 15Z',
  ];
  const duration = side === 0 ? 1.72 : 2.13;
  const layer = (scale: string, color: string, speed: number, phase: number) => `<g transform="scale(${scale})"><path d="${frames[0]}" fill="${color}">${animated ? `<animate attributeName="d" values="${frames.join(';')};${frames[0]}" keyTimes="0;.32;.68;1" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1" dur="${speed}s" begin="${phase}s" repeatCount="indefinite"/>` : ''}</path></g>`;
  return `<g data-victory-flame="true" data-flame-side="${side}" transform="translate(0 15) scale(1.18 1.2) translate(0 -15)">${layer('1 1', '#ff782d', duration, side ? -.47 : 0)}${layer('.64 .72', '#ffd34e', side === 0 ? 1.19 : 1.53, -.23)}${layer('.3 .43', '#fff7dc', side === 0 ? .89 : 1.07, -.61)}</g>`;
}
export function determinedGrin(whiskers: string, animated = false): string {
  const morph = (base: string, peak: string) => animated ? `<animate attributeName="d" values="${base};${base};${peak};${peak};${base}" keyTimes="0;.45;.58;.7;1" dur="7s" repeatCount="indefinite"/>` : '';
  const shape = (base: string, peak: string, fill: string, width = 2.5) => `<path d="${base}" fill="${fill}" stroke="#633c25" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${morph(base, peak)}</path>`;
  // A decisive quick press with a sustained hold stays closed and centered, without teeth or a central W peak.
  const lipRest = 'M239 269Q256 270.5 273 269';
  const lipPress = 'M242 268Q256 268.2 270 268';
  const lipMotion = animated ? `<animate attributeName="d" values="${lipRest};${lipRest};${lipPress};${lipPress};${lipRest}" keyTimes="0;.3;.4;.68;1" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1;.42 0 .58 1" dur="3.8s" repeatCount="indefinite"/>` : '';
  const eyes = [218, 294].map((x, side) => `<g data-grin-eye="${side}" transform="translate(${x} 215)">${victoryFlame(animated, side)}</g>`).join('');
  return `<g id="expression" data-determined-grin="victory-flame-v3"><g data-eye-motion="resolute">${eyes}</g><g transform="translate(0 -6)">${shape('M198 185Q217 188 236 194M276 194Q295 188 314 185', 'M198 185Q217 188.5 236 195M276 195Q295 188.5 314 185', 'none', 3.5)}</g><path d="M256 240l-9 7 9 8 9-8z" fill="#df7e82" stroke="#784727" stroke-width="2"/><g class="king-mouth" data-mouth-motion="18" data-resolute-mouth="steady"><path data-pressed-lips="true" d="${lipRest}" fill="none" stroke="#633c25" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">${lipMotion}</path></g>${whiskers}</g>`;
}
