import { dreamingBubbles, specialEye } from './expression-effects';
// Shared authored geometry: the Solidity generator consumes these same shapes.
const line = 'fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
const path = (d: string, fill = 'none') => `<path d="${d}" ${line.replace('fill="none"', `fill="${fill}"`)}/>`;
const eye = (x: number, y = 215, rx = 19, ry = 23, dx = -5) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#29243b"/><defs><clipPath id="eye-glint-${x}"><ellipse cx="${x}" cy="${y}" rx="${rx-1}" ry="${ry-1}"/></clipPath></defs><g clip-path="url(#eye-glint-${x})"><ellipse cx="${x + dx}" cy="${y - Math.min(7,ry*.25)}" rx="${Math.min(5,ry*.3)}" ry="${Math.min(5,ry*.3)}" fill="#fff8e7"/></g>`;
const pair = (draw: (x: number) => string) => [218, 294].map(draw).join('');
const heart = (x: number, y: number) => path(`M${x} ${y + 8}c-20-12-8-23 0-13c8-10 20 1 0 13Z`, '#f58ba3');
// Layered gold rather than a filter/gradient: identical in standalone on-chain SVG.
const royalEye = (x: number) => `<g data-royal-eye="${x}"><ellipse cx="${x}" cy="214" rx="23" ry="28" fill="#fff4cf" stroke="#633c25" stroke-width="3"/><ellipse cx="${x}" cy="214" rx="18" ry="24" fill="#b97516"/><ellipse cx="${x}" cy="212" rx="15" ry="21" fill="#f7cf6c"/><ellipse cx="${x}" cy="214" rx="10" ry="17" fill="#e8a52b"/><ellipse cx="${x}" cy="213" rx="7" ry="15" fill="#34202c"/><path d="M${x-12} 224q12 11 24 0" fill="none" stroke="#ffeaa0" stroke-width="3" stroke-linecap="round"/><circle data-eye-glint="primary" cx="${x-7}" cy="202" r="5" fill="#fffdf1"/><path data-eye-glint="gold" d="M${x+9} 211l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#fff3ad"/>${path(`M${x-23} 191q23-13 46 0`)}</g>`;
export const expressionDurations = [4,2,3.2,2.8,7,2.2,5,6,2.4,7,2.6,8,6.4,4.6,3.6,9,5.4,4.8,3.4,10,7.3];

// Shared by core and expansion faces; keep outside eye/blink and mouth wrappers.
export function whiskersSvg(): string {
  return '<g class="king-whiskers"><path class="king-whiskers-left" d="M211 253Q189 247 169 243M211 260Q187 260 164 260M211 267Q189 273 169 277" fill="none" stroke="#784727" stroke-width="2.5" stroke-linecap="round" opacity=".78"/><path class="king-whiskers-right" d="M301 253Q323 247 343 243M301 260Q325 260 348 260M301 267Q323 273 343 277" fill="none" stroke="#784727" stroke-width="2.5" stroke-linecap="round" opacity=".78"/></g>';
}

export function expressionDetail(id: number): string {
  const details = [
    path('M184 240q6-4 12 0M316 240q6-4 12 0'),
    path('M193 229l-6 3m132-3 6 3'),
    path('M324 201v12m-6-6h12', '#ffe6a2'),
    heart(180, 202) + heart(332, 197),
    path('M326 182h10l-10 12h10m5-27h12l-12 15h12'),
    path('M330 220q-11 17 0 20q11-3 0-20Z', '#88ddff'),
    path('M322 191v8m-4-4h8m-8 5h5v5'),
    '<ellipse cx="256" cy="248" rx="6" ry="3" fill="#ed7f8d"/>',
    path('M248 179c-15-12 16-22 14-8c-2 8-13 4-8-2'),
    path('M307 211l6-5m-3 8 7-1'),
    path('M180 202v14m-7-7h14M330 186v12m-6-6h12', '#ffeaa0'),
    path('M256 188q-14-7 0-19q14 12 0 19Zm0 0q-17 1-17-12q12 1 17 12m0 0q17 1 17-12q-12 1-17 12', '#f4d5ac'),
    path('M256 181v12m-6-6h12M331 238v10m-5-5h10', '#d2b7ff'),
    path('M190 183v10m-5-5h10M322 241v12m-6-6h12', '#abf3ff'),
    '<path d="M320 266h9" stroke="#42bfa4" stroke-width="4"/>',
    path('M198 235q20 9 39 0M276 235q20 9 39 0'),
    path('M327 182q0-9 9-6q9 4-2 11v5m0 5v1'),
    '<g fill="#ed789c" opacity=".55"><ellipse cx="190" cy="246" rx="18" ry="9"/><ellipse cx="322" cy="246" rx="18" ry="9"/></g>',
    path('M197 187l38 12m42 0 38-12'),
    dreamingBubbles(),
    path('M246 180l-3-12 9 6 4-11 4 11 9-6-3 12Z', '#f7cf6c'),
  ];
  return `<g class="king-expression-detail" data-detail="${id}">${details[id]}</g>`;
}

export function refinedCore(svg: string, id: number): string {
  const eyes: Record<number, string> = {
    1: path('M198 219q20-27 40 0M274 219q20-27 40 0') + path('M198 222q20-13 40 0M274 222q20-13 40 0'),
    4: pair(x => eye(x, 222, 18, 12) + path(`M${x-20} 211q20 11 40 0`, '#e9a760')),
    6: pair(x => path(`M${x-19} 206l38 8q-19 22-38-8Z`, '#3a2933') + path(`M${x-8} 214h8`, '#fff8dc')),
    8: eye(218, 215, 21, 25, 10) + eye(294, 215, 21, 25, -10),
    11: path('M199 218h42M271 218h42M203 218l-4 5m110-5 4 5'),
  };
  if (eyes[id]) {
    const end = svg.indexOf(id === 6 ? '<path d="M198 191' : '<path d="M256 240');
    svg = '<g id="expression">' + eyes[id] + svg.slice(end);
  }
  const mouths: Record<number, string> = {
    2: path('M240 265q15 12 31-3') + path('M261 269q15-5 9 9q-8 5-9-9Z', '#ef91a1'),
    3: path('M244 267q12 12 24 0'),
    4: '<ellipse cx="256" cy="272" rx="8" ry="11" fill="#593342"/>',
    6: path('M240 266q16-5 32 0l-2 9h-28Z', '#fff7dc') + path('M245 270h22'),
    7: path('M239 275q8-13 17-5q9-8 17 5'),
    8: path('M237 261q19 18 38 0', '#663b3b') + path('M250 273q18-5 22 9q-13 16-22-9Z', '#f58b91'),
    10: '<ellipse cx="256" cy="271" rx="13" ry="12" fill="#593342"/>',
  };
  if (mouths[id]) svg = svg.replace(/<g class="king-mouth">[\s\S]*?<\/g>/, `<g class="king-mouth">${mouths[id]}</g>`);
  return svg.replace(/<\/g>$/, expressionDetail(id) + '</g>');
}

export function expansionFace(id: number): string {
  const eyes = [12,13,14,18].includes(id) ? pair(x => specialEye(id,x)) : [
    pair(x => eye(x) + path(`M${x-9} 217c-8-18 22-20 20-3c-1 12-18 10-12 0q5-5 7 1`, '#b99aef')),
    pair(x => path(`M${x} 192l18 20-18 24-18-24Z`, '#93eaff') + path(`M${x-18} 212h36m-18-20 7 20-7 24-7-24Z`)),
    pair(x => path(`M${x-9} 204l-10 11 10 11m18-22 10 11-10 11`)),
    pair(x => eye(x, 221, 18, 9) + path(`M${x-20} 212h40`)),
    eye(218, 220, 19, 8, 7) + eye(294, 213, 19, 17, 6) + path('M197 203l39 4M276 187q18-6 37 3'),
    eye(218, 218, 17, 21, 7) + eye(294, 218, 17, 21, 7),
    pair(x => path(`M${x} 191q4 14 13 11q16 25-13 32q-27-7-12-29q-1 14 7 12Z`, '#f1a943')),
    path('M198 216q20 22 40 0M274 216q20 22 40 0M201 219l-5 5m8-2-2 6m108-9 5 5m-8-2 2 6'),
    pair(royalEye),
  ][id-12];
  const mouths = ['M248 268q8-13 16 0q-8 15-16 0Z','M240 269q19 9 34-7','M243 269h26l-7 5-4-5','M241 273h30','M241 270l9-3 9 5 12-6','M246 270q5 5 10 0q5 5 10 0','M238 262q18 6 36 0l-4 15h-28Z','M248 271q8 6 16 0','M239 266q17 12 34-2'];
  return `<g id="expression">${eyes}<path d="M256 240l-9 7 9 8 9-8z" fill="#df7e82" stroke="#784727" stroke-width="2"/><g class="king-mouth">${path(mouths[id-12], id===12?'#593342':id===18?'#fff7dc':'none')}</g>${whiskersSvg()}${expressionDetail(id)}</g>`;
}

export function detailMotion(svg: string, id: number): string {
  const dx = [0,0,2,-2,1,0,0,0,3,2,0,-1,3,2,0,0,1,0,0,2,0][id];
  const dy = [1,-2,-2,-8,-7,6,-1,2,-2,0,-5,-2,-3,-2,0,2,-2,1,-2,-4,-1][id];
  const dur = expressionDurations[id];
  return svg.replace(`data-detail="${id}">`, `data-detail="${id}"><animateTransform attributeName="transform" type="translate" additive="sum" values="0 0;${dx} ${dy};0 0" dur="${dur}s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;.${id===14?'1':'65'};1" dur="${dur/2}s" repeatCount="indefinite"/>`);
}
