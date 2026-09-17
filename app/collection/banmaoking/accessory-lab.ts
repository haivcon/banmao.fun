// Preview-only choreography. Historical contract fragments remain untouched.
const loop = (attribute: string, values: string, duration: number, begin = 0) => `<animate attributeName="${attribute}" values="${values}" dur="${duration}s" begin="${begin}s" repeatCount="indefinite"/>`;
const move = (type: string, values: string, duration: number) => `<animateTransform attributeName="transform" type="${type}" values="${values}" dur="${duration}s" repeatCount="indefinite"/>`;
const path = (d: string, color: string, motion: string, width = 2) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round">${motion}</path>`;
const star = (x: number, y: number, delay: number) => `<path d="M${x-4} ${y}h8m-4-4v8" stroke="#fff4bd" stroke-width="2" opacity=".25">${loop('opacity', '.25;1;.25;.25', 4.8, delay)}</path>`;

// Each slot has its own silhouette/detail choreography, not a shared wobble.
export function accessoryLabEffects(id: number): string {
  if (id === 6 || id === 7 || id >= 13) return ""; // These effects now live inside canonical accessory groups.
  switch (id) {
    case 0: return '';
    case 1: return [203,256,309].map((x,i) => star(x, i === 1 ? 64 : 83, -i*1.1)).join('') + path('M220 132Q256 123 292 132','#fff4bd',loop('stroke-dashoffset','80;0;-80',6),2).replace('fill="none"','stroke-dasharray="8 72" fill="none"');
    case 2: return path('M219 299Q231 291 242 301M271 301Q286 291 294 299','#ffbcc8',loop('d','M219 299Q231 291 242 301M271 301Q286 291 294 299;M219 301Q231 299 242 301M271 301Q286 299 294 301;M219 299Q231 291 242 301M271 301Q286 291 294 299',3.7));
    case 3: return `<g opacity=".4">${path('M207 215l9-15M279 215l9-15','#ffffff',move('translate','0 0;9 3;0 0',5.3),3)}</g>`;
    case 4: return `<g fill="#78f9c7">${[0,1,2,3].map(i=>`<rect x="${205+i*24}" y="209" width="5" height="4">${loop('fill','#78f9c7;#b197ff;#ff87bd;#78f9c7',3.6,-i*.6)}</rect>`).join('')}</g>`;
    case 5: return `<g>${move('translate','0 0;5 13;-3 23;0 0',5.7)}${path('M174 128q-8 6 0 12m155-47q9 6 1 12','#ffaecc','',3)}${star(321,126,-2)}</g>`;
    case 6: return path('M207 309Q256 347 307 308','#fff8cd',loop('stroke-dashoffset','0;-90',4.4),2).replace('fill="none"','stroke-dasharray="3 87" fill="none"');
    case 7: return `<circle cx="363" cy="337" r="3" fill="#e1fff5" opacity=".7">${loop('cy','337;342;345;337',6.2)}${loop('opacity','.7;.9;0;.7',6.2)}</circle>`;
    case 8: return `<g stroke="#9ae8ff" stroke-width="3">${[0,1,2,3].map(i=>path(`M${151+i*5} 208v10m${190-i*10} -10v10`,'#9ae8ff',loop('stroke-width','1;4;1;2;1',1.7,-i*.21))).join('')}</g>`;
    case 9: return `<g>${move('rotate','0 256 95;360 256 95',18)}${star(256,57,0)}${star(288,95,-2)}${star(256,133,-1)}</g>`;
    case 10: return `<g opacity=".3">${path('M204 73l-8 12M230 81l-4 15M282 81l4 15M308 73l8 12','#ffe8a0',loop('opacity','.15;.65;.15',6.6))}</g>`;
    case 11: return path('M181 333Q159 367 157 394M331 333Q353 367 355 394','#ffd6a0',loop('d','M181 333Q159 367 157 394M331 333Q353 367 355 394;M181 333Q172 367 151 390M331 333Q340 367 361 390;M181 333Q159 367 157 394M331 333Q353 367 355 394',4.9));
    case 12: return `<g fill="none" stroke="#85e9ff">${path('M159 214A98 98 0 0 1 353 214','#85e9ff',loop('stroke-dashoffset','0;160',8)).replace('fill="none"','stroke-dasharray="6 14" fill="none"')}<circle cx="316" cy="292" r="4" fill="#85e9ff">${loop('opacity','.25;1;.25',2.8)}</circle></g>`;
    case 13: return `<g>${move('rotate','0 256 364;360 256 364',22)}${path('M224 364a32 32 0 0 1 32-32','#fff2b2','',2)}${star(286,364,-1)}</g>`;
    case 14: return `<ellipse cx="357" cy="244" rx="27" ry="9" fill="none" stroke="#b9caff" stroke-dasharray="5 8">${move('rotate','-20 357 244;340 357 244',9)}</ellipse>`;
    case 15: return path('M334 325Q365 307 396 325L392 371Q389 395 365 409Q341 395 338 371Z','#ccffc5',loop('stroke-dashoffset','180;0',5.5)).replace('fill="none"','stroke-dasharray="22 158" fill="none"');
    case 16: return `<g stroke="#60efc4">${path('M278 384h9','#60efc4',loop('opacity','1;0;1',1.1),3)}${[0,1,2].map(i=>path(`M201 ${338+i*4}h${15+i*8}`,'#60efc4',loop('opacity','.15;.6;.15',2.3,-i*.5),1)).join('')}</g>`;
    case 17: return path('M380 322c-9-8 9-16 0-25','#fff9ec',move('translate','0 0;3 -9;0 -18',4.7)+loop('opacity','0;.7;0',4.7),2);
    case 18: return `<g fill="#fff1ad">${[185,220,256,292,327].map((x,i)=>`<g>${move('rotate',`0 ${x} 118;${i%2 ? -25 : 25} ${x} 118;0 ${x} 118`,4+i*.4)}<path d="M${x} 103q-7-12 0-14q7 2 0 14M${x-15} 118q-12-7-14 0q2 7 14 0"/></g>`).join('')}</g>`;
    default: return '';
  }
}
