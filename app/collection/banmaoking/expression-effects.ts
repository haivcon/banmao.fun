// Authored local SMIL; tools/sync-king-art-effects.cjs mirrors this into Solidity.
const loop = (attribute: string, values: string, dur: number, begin = 0) => `<animate attributeName="${attribute}" values="${values}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>`;
const move = (type: string, values: string, dur: number, begin = 0) => `<animateTransform attributeName="transform" type="${type}" values="${values}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>`;

export function wateryTears(): string {
  return '<g class="king-tears">' + [210, 302].map((x, side) => `<path d="M${x-9} 236q9 5 18 0" fill="none" stroke="#b5efff" stroke-width="2.2" opacity=".8"/>` + [0,1,2].map(i => `<g data-tear="${side}-${i}" opacity="0">${move('translate', `0 0;0 0;${side ? 2 : -2} 12;${side ? 4 : -4} 34`, 3.3, -i*1.1-side*.45)}${loop('opacity','0;.85;.8;0',3.3,-i*1.1-side*.45)}<path d="M${x} 236c-1 4-5 7-4 10q4 6 8 0c1-3-3-6-4-10Z" fill="#83dfff" fill-opacity=".8" stroke="#429fc9" stroke-width=".7"/><path d="M${x-1} 241l-1 4" stroke="#ecfcff" stroke-width="1.4" stroke-linecap="round"/></g>`).join('')).join('') + '</g>';
}

export function dreamingBubbles(): string {
  return [0,1,2].map(i => `<g data-dream-bubble="${i}" opacity=".7">${move('translate',`0 0;${3+i*2} ${-5-i*3};${-2-i} ${-12-i*5}`,6+i,-i*1.7)}${loop('opacity','0;.75;.65;0',6+i,-i*1.7)}<ellipse cx="${324+i*12}" cy="${192-i*17}" rx="${3+i*5}" ry="${3+i*3}" fill="#eadfff" fill-opacity=".45" stroke="#a68ac9" stroke-width="1.2"/><path d="M${323+i*12} ${190-i*17}l${1+i*2} -2" stroke="#fff8ff" stroke-width="1.3" stroke-linecap="round"/>${i===2?'<path d="M348 150l2 4 4 1-4 2-2 4-1-4-4-2 4-1Z" fill="#fff4bf"/>':''}</g>`).join('');
}

export function specialEye(id: number, x: number): string {
  const phase = x===218 ? 0 : -.7;
  const base = `<ellipse cx="${x}" cy="215" rx="19" ry="23" fill="#201e38" stroke="#67577a" stroke-width="1.5"/>`;
  if(id===12) return `${base}<g data-cosmic-orbit="${x}">${move('rotate',`0 ${x} 215;360 ${x} 215`,9,phase)}<ellipse cx="${x}" cy="215" rx="14" ry="8" fill="none" stroke="#ad91ed" stroke-width="1.6"/><path d="M${x-11} 215q0-13 14-9t-3 16q-7 0-4-7t7 1" fill="none" stroke="#75dfff" stroke-width="1.7"/><circle cx="${x+13}" cy="215" r="2.5" fill="#fff4ce"/><circle cx="${x-7}" cy="209" r="1.5" fill="#f8eaff"/></g><circle cx="${x}" cy="215" r="3" fill="#d9c0ff">${loop('r','2;4;2',3.7,phase)}</circle>`;
  if(id===13) return `<g data-diamond="${x}">${move('rotate',`-5 ${x} 214;5 ${x} 214;-5 ${x} 214`,4.8,phase)}<g transform="translate(0 44) scale(1 .8)"><path d="M${x-11} 194h22l9 14-20 29-20-29Z" fill="#a7edff" stroke="#367b9b" stroke-width="1.3" stroke-linejoin="round"/><path d="M${x-20} 208h40l-20 29Z" fill="#62bce3"/><path d="M${x-8} 208l8-14 8 14-8 29Z" fill="#e3fbff">${loop('fill','#e3fbff;#8adcf5;#e3fbff',3.2,phase)}</path><path d="M${x-20} 208h40M${x-11} 194l3 14 8 29 8-29 3-14" fill="none" stroke="#438aaa" stroke-width=".8"/><path d="M${x-12} 201h7m-3-3v6" stroke="#fff" stroke-width="1.3"/></g></g>`;
  if(id===14) return `${base}<defs><clipPath id="code-eye-${x}"><ellipse cx="${x}" cy="215" rx="16" ry="20"/></clipPath></defs><g data-code-screen="${x}" clip-path="url(#code-eye-${x})">${[0,1,2,3].map(i=>`<path data-code-line="${i}" d="M${x-12} ${202+i*8}l3 2-3 2m6-2h${i%2?7:12}m-7 2h5" fill="none" stroke="${i%2?'#b6fce0':'#5ce3b5'}" stroke-width="1.2" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1">${loop('stroke-dashoffset','1;1;0;0;1',4.8,phase-i*.65)}</path>`).join('')}<path d="M${x+9} 227h4" stroke="#d8ffe8" stroke-width="2">${loop('opacity','1;0;1',1.2,phase)}</path>${move('translate','0 0;0 0;0 -8;0 -8',4.8,phase)}</g>`;
  return flameEye(x,phase);
}

function flameEye(x: number, phase: number): string {
  const a=`M${x} 235C${x-27} 229 ${x-13} 208 ${x-8} 201C${x-11} 217 ${x+4} 207 ${x} 190C${x+26} 212 ${x+24} 230 ${x} 235Z`;
  const b=`M${x} 235C${x-23} 229 ${x-20} 215 ${x-12} 196C${x-4} 214 ${x+8} 202 ${x+6} 188C${x+17} 217 ${x+29} 230 ${x} 235Z`;
  return `<g data-flame-eye="${x}"><path d="${a}" fill="#f0782d" stroke="#a64c29" stroke-width="1.1">${loop('d',`${a};${b};${a}`,1.35,phase)}</path><path d="M${x} 232q-15-6-6-21q0 9 8-7q15 24-2 28Z" fill="#ffd965">${loop('fill','#ffd965;#fff1a0;#ffd965',1.1,phase)}</path><path d="M${x} 231q-7-5 0-13q8 10 0 13Z" fill="#fff4bf"/>${[0,1].map(i=>`<circle cx="${x-6+i*12}" cy="199" r="1.8" fill="#ffc35f">${loop('cy','203;182;176',2.2,phase-i*1.1)}${loop('opacity','0;.9;0',2.2,phase-i*1.1)}</circle>`).join('')}</g>`;
}

// Integer-only geometry and token selection are mirrored by the generated renderer.
export function diamondRays(variant: number): string {
  const right = variant >= 6;
  const x = right ? 294 : 218;
  return `<g data-diamond-rays="${x}">` + Array.from({ length: 5 + variant % 6 }, (_, i) => {
    const y = 24 + ((i * 137 + (right ? 61 : 0)) % 460);
    const end = right ? 488 - i % 3 * 18 : 24 + i % 3 * 18;
    // A short light packet travels away from the eye; reset only while invisible.
    const timing = ' keyTimes="0;.08;.2;.48;.6;1" dur="3.2s" repeatCount="indefinite"';
    return `<path data-diamond-ray="${x}-${i}" d="M${x} 214L${end} ${y}" fill="none" stroke="${i % 2 ? '#e6d5ff' : '#c5f5ff'}" stroke-width="${i % 3 ? 1 : 1.6}" stroke-linecap="round" pathLength="100" stroke-dasharray="16 184" stroke-dashoffset="0" opacity="0"><animate attributeName="opacity" values="0;0;.7;.45;0;0"${timing}/><animate attributeName="stroke-dashoffset" values="0;0;-15;-70;-100;-100"${timing}/></path>`;
  }).join('') + '</g>';
}

