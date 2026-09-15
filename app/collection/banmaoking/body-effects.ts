// Shared authored costume details, mirrored into Solidity by sync-king-art-effects.cjs.
const pulse = '<animate attributeName="opacity" values=".3;.85;.3" dur="5s" repeatCount="indefinite"/>';
const trace = (d: string, color: string) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="6 18"><animate attributeName="stroke-dashoffset" values="48;0" dur="5s" repeatCount="indefinite"/></path>`;
const emblem = (shape: string, color: string) => `<g transform="translate(256 348)"><circle cy="3" r="26" fill="#453545" opacity=".35"/><circle r="25" fill="${color}" stroke="#fff1ce" stroke-width="1.5"/>${shape}<path d="M-19-12a22 22 0 0 1 29-8" fill="none" stroke="#ffffff" stroke-width="2">${pulse}</path></g>`;
const star = (x:number,y:number,color:string) => `<path d="M${x} ${y-4}l1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" fill="${color}">${pulse}</path>`;

export function bodyEffects(id: number): string {
  const details = [
    trace('M187 313q-10 66 35 121','#fff9ca'),
    emblem('<circle r="9" fill="#fff5ad"/><path d="M0-18v5M0 13v5M-18 0h5M13 0h5M-13-13l4 4M9 9l4 4M13-13l-4 4M-9 9l-4 4" stroke="#fff5ad" stroke-width="2"/>','#eaba3f'),
    '<path d="M237 429q-20-60 34-114q18 64-34 114Z" fill="#639d3a" opacity=".45"/>'+trace('M238 423l27-96m-19 68-14-14m23-8 20-8','#eaffb2'),
    '<path d="M222 348q-9-23 12-29q13-4 22 8q9-12 22-8q21 6 12 29q-16 30-34 31q-20-3-34-31Z" fill="#ffd1a5" opacity=".45"/>'+star(202,383,'#fff4db')+star(297,401,'#ffe7bc'),
    [0,1,2].map(i=>`<path d="M185 ${326+i*36}q35-18 70 0t65 0" fill="none" stroke="#dcfbff" stroke-width="2" opacity=".4"><animateTransform attributeName="transform" type="translate" values="0 0;0 9;0 0" dur="${4+i}s" repeatCount="indefinite"/></path>`).join(''),
    '<circle cx="256" cy="351" r="31" fill="none" stroke="#e8ccff" stroke-width="1.3"/><g><path d="M256 316l26 47h-52Z" fill="none" stroke="#f2d9ff" stroke-width="1.5"/><animateTransform attributeName="transform" type="rotate" values="0 256 351;360 256 351" dur="24s" repeatCount="indefinite"/></g>',
    `<path d="M256 371c-58-32-26-63 0-36c26-27 58 4 0 36Z" fill="#fff0f8" opacity=".6">${pulse}</path>`+star(202,392,'#fff1fc'),
    cyborgDetails(),
    '<path d="M192 412q37-99 117-80q-43 73-117 80Z" fill="#9471cc" opacity=".3"/>'+star(210,371,'#cfb8ff')+star(291,396,'#fff1d2')+trace('M201 404Q249 326 305 340','#d0b5f7'),
    emblem('<path d="M-10-14h13c14 0 14 13 0 13h-13m0 0h15c14 0 14 15 0 15h-15m4-28v28M-2-20v6m7-6v6M-2 14v6m7-6v6" fill="none" stroke="#fff5ce" stroke-width="3"/>','#df831d')+trace('M227 348h-20v40m78-40h20v-30','#ffe7a2'),
    emblem('<path d="M0-20l-12 20L0-5Z" fill="#eff3ff"/><path d="M0-20L12 0 0-5Z" fill="#b6c5ef"/><path d="M-12 0L0 7 12 0 0-5Z" fill="#8b9ed0"/><path d="M-12 4L0 21 12 4 0 11Z" fill="#f2ecff"/>','#677ac5')+trace('M230 380l26 29 26-29','#dfdeff'),
    emblem('<path d="M-14-14h9v9h-9ZM5-14h9v9H5ZM-5-5H5V5H-5ZM-14 5h9v9h-9ZM5 5h9v9H5Z" fill="#f6f8fa"/>','#242f38')+trace('M204 321h21v-9m62 0v9h21m-104 60h21v12m62 0v-12h21','#ffffff'),
    '<rect x="224" y="326" width="64" height="44" rx="7" fill="#164737" stroke="#b2f4d4"/><path d="M241 339l-7 7 7 7m30-14 7 7-7 7m-12-17-7 25" fill="none" stroke="#72efb8" stroke-width="2"/>'+trace('M212 381h24v17h40v-17h24','#cbffe8'),
    '<path d="M221 297l35 14 35-14-9 33-26-16-26 16Z" fill="#edf2f9"/><g><path d="M250 315h12l-3 12 8 50-11 14-11-14 8-50Z" fill="#bc617b"/><animateTransform attributeName="transform" type="rotate" values="-2 256 315;2 256 315;-2 256 315" dur="7s" repeatCount="indefinite"/></g><path d="M291 348h23v14h-23Z" fill="#293c60"/>',
    '<path d="M216 423q-26-68 13-113m-13 97q-28-2-25-22q24 0 25 22m-8-47q27-2 26-23q-24 0-26 23" fill="#70ae74" stroke="#437b55" stroke-width="1.2"/>'+star(211,323,'#fff9ba')+star(303,379,'#e6ffae'),
    '<path d="M192 313q-11 74 32 123m96-123q11 74-32 123" fill="none" stroke="#f3cd7e" stroke-width="3" stroke-dasharray="3 5"/>'+emblem('<path d="M-16 9l-3-20 12 9 7-17 7 17 12-9-3 20Z" fill="#ffe6a2"/>','#9a294c'),
    trace('M194 318q-9 77 37 122M318 318q9 77-37 122','#ffe8a5')+star(256,370,'#fff3c2'),
  ];
  if (!Number.isInteger(id) || !details[id]) throw new RangeError('Invalid body');
  if (id === 12) {
    // Localize the terminal badge without shrinking the surrounding suit traces.
    details[id] = details[id].replace('<rect ', '<g transform="translate(256 348)"><g transform="translate(-256 -348)"><rect ').replace('/>'+trace('M212 381h24v17h40v-17h24','#cbffe8'), '/></g></g>'+trace('M212 381h24v17h40v-17h24','#cbffe8'));
  }
  if (id === 1 || (id >= 9 && id <= 12) || id === 15) {
    // Keep the badge on the suit, below chest-covering props rather than above them.
    const color = id === 1 ? '#fff5ad' : id === 15 ? '#ffe6a2' : ['#ffe7a2', '#dfdeff', '#bfffe5', '#72efb8'][id - 9];
    const aura = `<circle data-suit-aura="true" r="32" fill="none" stroke="${color}" stroke-width="2" opacity="0"><animate attributeName="r" values="28;40;40" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values=".7;0;0" dur="3s" repeatCount="indefinite"/></circle>`;
    details[id] = details[id].replace('<g transform="translate(256 348)">', `<g class="king-crypto-badge" transform="translate(256 348)"><g transform="scale(.3333333333)">${aura}`).replace('</g>', '</g></g>');
    const placement = '<style>[data-accessory="2"] .king-crypto-badge,[data-accessory="5"] .king-crypto-badge,[data-accessory="11"] .king-crypto-badge,[data-accessory="13"] .king-crypto-badge,[data-accessory="16"] .king-crypto-badge,[data-accessory="20"] .king-crypto-badge{transform:translate(256px,410px)}</style>';
    return `${placement}<g class="king-body-effect" data-body-effect="${id}">${details[id]}</g>`;
  }
  return `<g class="king-body-effect" data-body-effect="${id}">${details[id]}</g>`;
}


export function cyborgDefs(): string {
  return '<defs><linearGradient id="bk-cyber-metal"><stop stop-color="#485c70"/><stop offset=".35" stop-color="#d5e4ec"/><stop offset=".65" stop-color="#71889b"/><stop offset="1" stop-color="#364959"/></linearGradient><linearGradient id="bk-cyber-split" gradientUnits="userSpaceOnUse" x1="171" x2="341"><stop offset="0" stop-color="#ffc77e"/><stop offset=".499" stop-color="#e99a50"/><stop offset=".5" stop-color="#b3c5d1"/><stop offset="1" stop-color="#52697d"/></linearGradient></defs>';
}
function cyborgDetails(): string {
  return '<path d="M256 291h78q9 86-30 151l-48 25Z" fill="url(#bk-cyber-metal)" stroke="#4c6477" stroke-width="1.5"/><path d="M256 293v172m1-54 43-17 20-51-63-21" fill="none" stroke="#344b5b" stroke-width="2"/>'+trace('M268 313h22v24h24m-46 109v-39h24v-32','#96f5ff')+'<circle cx="286" cy="360" r="13" fill="#263d50" stroke="#bacfdc" stroke-width="2"/><circle cx="286" cy="360" r="7" fill="#78edff">'+pulse+'</circle><path d="M258 144v42m1 56v17l23 15h22" fill="none" stroke="#455a6d" stroke-width="2"/><path d="M321 181l9 17v37l-12 12" fill="none" stroke="#a4f4ff" stroke-width="2"/><ellipse cx="294" cy="215" rx="25" ry="30" fill="none" stroke="#465e72" stroke-width="2"/><path d="M280 182h12m17 6 6 8" stroke="#91efff" stroke-width="2">'+pulse+'</path>';
}
// Recolor in local rig groups, never duplicate animated IDs or detached overlays.
export function cyborgBody(svg: string): string {
  let depth = 0;
  const stack: boolean[] = [];
  return cyborgDefs() + svg.replace(/<g\b[^>]*>|<\/g>|<path\b[^>]*>/g, tag => {
    if(tag === '</g>') { if(stack.pop()) depth--; return tag; }
    if(tag.startsWith('<g')) {
      const metal = /class="[^"]*king-(?:arm-right|leg-right|ear-right|tail)\b/.test(tag);
      stack.push(metal); if(metal) depth++;
      return tag;
    }
    if(tag.includes('d="M171 198')) return tag.replace('url(#bk-fur)','url(#bk-cyber-split)');
    if(depth) return tag.replace('url(#bk-fur)','url(#bk-cyber-metal)').replace(/#(?:b96832|b66c38|9f572f|a95d31)/g,'#485e70').replace('#e7a5aa','#8edce8');
    return tag;
  });
}
