// Canonical ornaments. Party Hat is mirrored by tools/sync-king-party-hat.cjs.
const PARTY_HAT_BASE_SVG = '<g id="accessory"><defs><clipPath id="king-party-clip"><path d="M205 151L253 46L307 153Z"/></clipPath></defs><g class="king-party-hat"><path d="M205 151L253 46L307 153Z" fill="#ff6d8d"/><g clip-path="url(#king-party-clip)"><path d="M253 46L307 153L285 151Z" fill="#c93c65" opacity=".35"/><path d="M209 137Q253 148 300 119M223 107Q254 118 284 93M238 78Q254 86 271 72" fill="none" stroke="#ffe878" stroke-width="4.5"/><path d="M218 132L249 63" stroke="#ffbbcd" stroke-width="3" stroke-linecap="round"/></g><path d="M205 151L253 46L307 153Z" fill="none" stroke="#713d24" stroke-width="3.5" stroke-linejoin="round"/><g class="king-party-pom"><path d="M253 48v7" stroke="#369d9b" stroke-width="3"/><circle cx="253" cy="43" r="11" fill="#57d6d0" stroke="#369d9b" stroke-width="2"/><circle cx="249" cy="39" r="3" fill="#d5fff8"/></g></g><path class="king-jewel" d="M180 102l-6-7M323 65l6-7M334 119l8 2" stroke="#ffde7a" stroke-width="3" stroke-linecap="round"/><g class="king-detail king-confetti" fill="none" stroke-width="3" stroke-linecap="round"><path d="M183 78l5 5M318 94l7-4" stroke="#ff89ad"/></g><g class="king-confetti-back" fill="none" stroke="#65d9d0" stroke-width="3" stroke-linecap="round"><path d="M218 49l-3-6M304 54l4-5"/></g></g>';
// Birthday props stay outside the hat's animated group and clear of the face.
const BIRTHDAY_PROPS_SVG = '<g data-birthday-balloons="true" stroke="#713d54" stroke-width="2" stroke-linejoin="round"><path d="M83 233Q110 289 86 350M429 212Q400 278 429 341" fill="none" stroke="#b98d79"/><ellipse cx="80" cy="202" rx="23" ry="31" fill="#ff89ad"/><path d="M80 231l-5 7h10Z" fill="#ff89ad"/><ellipse cx="432" cy="181" rx="23" ry="31" fill="#65d9d0"/><path d="M432 210l-5 7h10Z" fill="#65d9d0"/><path d="M68 192q0-12 10-14M420 171q0-12 10-14" fill="none" stroke="#fff5df" stroke-width="3" stroke-linecap="round"/></g><g data-birthday-streamers="true" fill="none" stroke-width="3" stroke-linecap="round"><path d="M108 118q-15 9 0 18t0 18M402 94q15 9 0 18t0 18" stroke="#ffde7a"/><path d="M66 280l7 4M438 274l6-6M112 87l5-7M392 57l7 5" stroke="#ff89ad"/><path d="M57 146l6-5M451 118l5 6M104 313l6-4M409 303l7 4" stroke="#65d9d0"/></g><g data-birthday-gifts="true" stroke="#713d54" stroke-width="2" stroke-linejoin="round"><rect x="111" y="407" width="42" height="36" rx="3" fill="#65d9d0"/><path d="M108 403h48v10h-48Z" fill="#a4efe1"/><path d="M132 403v40" stroke="#ffe878" stroke-width="7"/><path d="M132 403q-23-2-15-12 9-7 15 12q23-2 15-12-9-7-15 12Z" fill="#ffe878"/><rect x="359" y="409" width="42" height="34" rx="3" fill="#b69ae9"/><path d="M356 404h48v10h-48Z" fill="#d6c0ff"/><path d="M380 404v39" stroke="#ffb5cc" stroke-width="7"/><path d="M380 404q-23-2-15-12 9-7 15 12q23-2 15-12-9-7-15 12Z" fill="#ffb5cc"/></g><g data-birthday-cake="true" stroke="#713d54" stroke-width="2.5" stroke-linejoin="round"><ellipse cx="256" cy="441" rx="85" ry="12" fill="#65d9d0"/><ellipse cx="256" cy="437" rx="78" ry="9" fill="#d5fff8"/><path d="M187 384v45c0 18 138 18 138 0v-45Z" fill="#ffb5cc"/><path d="M188 421q68 19 136 0v9q-68 19-136 0Z" fill="#ed87aa" stroke="none"/><ellipse cx="256" cy="384" rx="69" ry="17" fill="#fff3d6"/><path d="M187 384q12 9 20 8v9q6 9 12 0v-5l17 3v9q6 9 12 0v-8h21v5q6 9 12 0v-7l18-3v7q6 9 12 0v-10q9-2 14-8" fill="#fff3d6"/><g data-birthday-candles="true"><path d="M229 380v-24h7v25M252 379v-29h8v29M276 381v-25h7v24" fill="#65d9d0"/><path d="M230 364l5 4m-5 4 5 4M253 358l6 4m-6 4 6 4M277 364l5 4m-5 4 5 4" stroke="#fff3d6" stroke-width="2"/><g data-birthday-flames="true" fill="#ffce62" stroke="#e58b3b" stroke-width="1.5"><path d="M233 341q-12 14 0 15 12-1 0-15ZM256 335q-12 14 0 15 12-1 0-15ZM280 341q-12 14 0 15 12-1 0-15Z"><animate attributeName="opacity" values="1;.65;1" dur="1.8s" repeatCount="indefinite"/></path></g></g></g>';

// Fixed scene-space layer: never mount these props under character/action transforms.
// Deterministic world-space SMIL: no script, clock, or random runtime dependency.
const birthdayAnimation = (attribute: string, values: string, times: string, duration: number, begin = 0, type = '') => {
  return `<${type ? 'animateTransform' : 'animate'} attributeName="${attribute}"${type ? ` type="${type}"` : ''} values="${values}" keyTimes="${times}" dur="${duration}s" begin="${begin}s" repeatCount="indefinite"/>`;
};

function birthdayBalloon(side: number): string {
  // Authored boundary contacts include the balloon radius and dangling string.
  const route = side === 0 ? '72 172;38 74;46 66;135 54;180 68;132 170;48 276;38 258;72 172' : '436 132;474 62;463 53;352 62;334 100;394 215;473 277;464 256;436 132';
  const times = '0;.16;.2;.34;.46;.65;.82;.87;1';
  const duration = side === 0 ? 23 : 29;
  const color = side === 0 ? '#ff83ad' : '#61dcd1';
  const shade = side === 0 ? '#ce507e' : '#279d9f';
  const id = `birthday-balloon-${side}`;
  const strings = ['M0 34C-10 58 18 77 7 102S-7 124 1 138', 'M0 34C-22 57-24 79-15 103S-6 126-15 138', 'M0 34C4 58-18 80-19 104S-8 127-3 138', 'M0 34C23 54 27 80 16 105S6 125 14 138', 'M0 34C-10 58 18 77 7 102S-7 124 1 138'];
  return `<g data-birthday-motion="balloon-${side === 0 ? 'left' : 'right'}" transform="translate(${side ? '436 132' : '72 172'})">${birthdayAnimation('transform', route, times, duration, 0, 'translate')}<path data-balloon-string="${side}" d="${strings[0]}" fill="none" stroke="#ac8798" stroke-width="1.6" stroke-linecap="round">${birthdayAnimation('d', strings.join(';'), '0;.23;.48;.76;1', duration)}</path><g data-balloon-envelope="${side}">${birthdayAnimation('transform', '1 1;.92 1.05;1 1;1 1;1 1;1 1;.93 1.04;1 1;1 1', times, duration, 0, 'scale')}<defs><radialGradient id="${id}" cx=".3" cy=".23" r=".8"><stop stop-color="#fff3ed"/><stop offset=".28" stop-color="${color}"/><stop offset="1" stop-color="${shade}"/></radialGradient></defs><ellipse cy="0" rx="24" ry="32" fill="url(#${id})" stroke="${shade}" stroke-width="1.5"/><path d="M-12-13Q-15-23-5-25" fill="none" stroke="#fff8ef" stroke-width="3" stroke-linecap="round" opacity=".8"/></g><path d="M0 29L-4 35H4Z" fill="${color}" stroke="${shade}" stroke-width="1"/></g>`;
}

function birthdayFireworks(): string {
  const colors = ['#ff83ad', '#ffe878', '#65d9d0', '#b69ae9'];
  return `<g data-birthday-streamers="true">${[0, 1].map(side => {
    const duration = side ? 7.9 : 6.7;
    const begin = side ? -3.1 : -.6;
    return `<g data-birthday-burst="${side}" transform="translate(${side ? 458 : 54} 454)">${Array.from({ length: 5 }, (_, i) => {
      const dx = (side ? -1 : 1) * (24 + i * 15);
      const height = 175 + (i % 4) * 27;
      // Sample a ballistic arc. Linear interpolation preserves launch momentum.
      const flight = Array.from({ length: 9 }, (_, k) => { const t = k / 8; return `${Math.round(dx * t)} ${Math.round(-4 * height * t * (1 - t))}`; }).join(';');
      const keyTimes = '0;.08;.16;.24;.32;.4;.48;.56;.64;.78;1';
      const shape = i < 3 ? `<path d="M0-9Q-8-4 0 1T0 12" fill="none" stroke="${colors[i]}" stroke-width="3" stroke-linecap="round"/>` : `<rect x="-3" y="-4" width="6" height="8" rx="1" fill="${colors[i % 4]}"/>`;
      return `<g data-birthday-particle="${side}-${i}" opacity="0"><animateTransform attributeName="transform" type="translate" values="${flight};${dx} 0;0 0" keyTimes="${keyTimes}" calcMode="linear" dur="${duration}s" begin="${begin}s" repeatCount="indefinite"/>${birthdayAnimation('opacity', '0;1;1;0;0', '0;.025;.46;.64;1', duration, begin)}<g>${birthdayAnimation('transform', `0;${i % 2 ? 250 : -280};${i % 2 ? 500 : -560}`, '0;.35;1', duration, begin, 'rotate')}${shape}</g></g>`;
    }).join('')}<path d="M-7 0L0-11 7 0" fill="none" stroke="#fff0b5" stroke-width="3" opacity="0">${birthdayAnimation('opacity', '0;.9;0;0', '0;.03;.09;1', duration, begin)}</path></g>`;
  }).join('')}</g>`;
}

function birthdayGift(side: number): string {
  const duration = side ? 9.3 : 7.4;
  const begin = side ? -4.1 : -.5;
  const color = side ? '#b69ae9' : '#65d9d0';
  const ribbon = side ? '#ffb5cc' : '#ffe878';
  const timing = '0;.2;.26;.32;.42;.57;.65;.7;.76;1';
  return `<g transform="translate(${side ? 387 : 115} 426)"><g data-birthday-motion="gift-${side ? 'right' : 'left'}">${birthdayAnimation('transform', side ? '0 0;20 -12;-3 16;-18 -7;0 0' : '0 0;-22 12;7 20;17 -9;0 0', '0;.27;.53;.79;1', side ? 17 : 19, 0, 'translate')}<g>${birthdayAnimation('transform', '0;-4;3;-2;0', '0;.23;.51;.8;1', side ? 11 : 13, 0, 'rotate')}<g data-gift-reveal="${side}" opacity="0">${birthdayAnimation('opacity', '0;0;.2;1;1;.6;0;0;0;0', timing, duration, begin)}<path d="M-17 -9L-29 -60Q0 -83 29 -60L17 -9Z" fill="#ffe878" opacity=".18"/><ellipse cy="-18" rx="23" ry="10" fill="#fff3b0" opacity=".55"/>${[-1, 0, 1].map((x, i) => `<g>${birthdayAnimation('transform', `0 0;${x * 12} -${22 + i * 10};${x * 18} -${38 + i * 8}`, '0;.45;1', duration, begin, 'translate')}<path d="M${x * 9} -22l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="${ribbon}" stroke="none"/></g>`).join('')}</g><g data-gift-body="${side}" stroke="#713d54" stroke-width="1.8" stroke-linejoin="round"><path d="M-22 -12H22V20Q0 27-22 20Z" fill="${color}"/><path d="M4 -12H22V20L4 23Z" fill="#544177" opacity=".17" stroke="none"/><ellipse cy="-12" rx="21" ry="5" fill="#49364e"/><path d="M-4 -8V23H4V-8" fill="${ribbon}" stroke="none"/><path d="M-18 0V16" stroke="#fff4ed" opacity=".5"/></g><g data-gift-lid="${side}">${birthdayAnimation('transform', '0 0;0 0;0 3;0 -32;0 -44;0 -32;0 0;0 -4;0 0;0 0', timing, duration, begin, 'translate')}<g>${birthdayAnimation('transform', '0;0;-5;10;-8;5;0;-2;0;0', timing, duration, begin, 'rotate')}<rect x="-25" y="-19" width="50" height="11" rx="3" fill="${color}" stroke="#713d54" stroke-width="1.8"/><path d="M-21 -16H21" stroke="#fff8ed" opacity=".6"/><path d="M-4 -19V-8H4V-19M0 -19C-29 -20-15 -44 0 -21C15 -44 29 -20 0 -19Z" fill="${ribbon}" stroke="#713d54" stroke-width="1.3"/></g></g></g></g></g>`;
}

function birthdayCandles(): string {
  return `<g data-birthday-candles="true">${[233, 256, 280].map((x, i) => {
    const top = i === 1 ? 350 : 356;
    const duration = 1.7 + i * .37;
    return `<g transform="translate(${x} ${top})"><rect x="-4" width="8" height="${380 - top}" rx="2" fill="${['#65d9d0', '#ff89ad', '#b69ae9'][i]}" stroke="#805673" stroke-width="1"/><path d="M-3 7L3 10M-3 15L3 18" stroke="#fff4d9" stroke-width="2"/><path d="M-2 2V${378 - top}" stroke="#fff" opacity=".35"/><ellipse rx="4" ry="2" fill="#fff3d6" stroke="#805673" stroke-width=".7"/><path d="M-3 1V5Q-1 8 0 4V1" fill="#fff3d6" stroke="none"/><path d="M0 0V-4" stroke="#49364e" stroke-width="1.4"/><g data-birthday-flames="true" stroke="none"><ellipse cy="-9" rx="11" ry="15" fill="#ffc35b" opacity=".13">${birthdayAnimation('opacity', '.1;.22;.13;.1', '0;.3;.7;1', duration)}</ellipse><g data-birthday-motion="flame-${i}">${birthdayAnimation('transform', '-4 0 -2;6 0 -2;-2 0 -2;-4 0 -2', '0;.3;.7;1', duration, -i * .3, 'rotate')}<path d="M0 -2C-9 -7-4 -14 1 -19C0 -12 9 -6 0 -2Z" fill="#f4a044"/><path d="M0 -3C-5 -7-2 -12 0 -15C1 -10 5 -7 0 -3Z" fill="#ffe878"/><path d="M0 -3Q-3 -7 0 -10Q3 -6 0 -3Z" fill="#fff9e0"/></g></g></g>`;
  }).join('')}</g>`;
}

function animatedBirthdayProps(): string {
  // Preserve the cake base without an occasion-specific plaque or lettering.
  const cakeStart = BIRTHDAY_PROPS_SVG.indexOf('<g data-birthday-cake=');
  let cake = BIRTHDAY_PROPS_SVG.slice(cakeStart);
  const candlesStart = cake.indexOf('<g data-birthday-candles=');
  if (cakeStart < 0 || candlesStart < 0) throw new Error('Missing birthday cake anchors');
  cake = cake.slice(0, candlesStart) + birthdayCandles() + '</g>';
  return `<g data-birthday-scene="true"><g data-birthday-balloons="true">${birthdayBalloon(0)}${birthdayBalloon(1)}</g>${birthdayFireworks()}${cake}<g data-birthday-gifts="true">${birthdayGift(0)}${birthdayGift(1)}</g></g>`;
}

export const BIRTHDAY_SCENE_SVG = animatedBirthdayProps();
export const PARTY_HAT_SVG = PARTY_HAT_BASE_SVG;



export const GOLD_CHAIN_SVG = '<g id="accessory"><g fill="none" stroke-linecap="round"><path d="M196 302Q256 352 316 301" stroke="#976022" stroke-width="7"/><path d="M196 301Q256 350 316 300" stroke="#ffe17b" stroke-width="3"/><path d="M202 309l4-5m8 14l4-6m9 12l3-7m11 12l1-7m14 9v-7m13 6l-1-7m13 3l-3-7m14 1l-4-6m13-2l-4-5" stroke="#b87d29" stroke-width="2"/></g><ellipse cx="256" cy="330" rx="4" ry="6" fill="none" stroke="#976022" stroke-width="3"/><g class="king-chain-pendant"><circle cx="256" cy="350" r="17" fill="#e9af37" stroke="#925b22" stroke-width="3"/><circle cx="256" cy="350" r="13" fill="#ffdb69" stroke="#fff0a0" stroke-width="1.5"/><path d="M250 340v20M262 340v20M250 343h7q9 0 0 7h-7m7 0q11 0 0 7h-7" fill="none" stroke="#a56a25" stroke-width="2.5" stroke-linecap="round"/><path d="M245 345q3-6 8-6" fill="none" stroke="#fff4c6" stroke-width="2" stroke-linecap="round"/></g><path class="king-detail king-chain-shine" d="M218 316v8m-4-4h8M290 313v8m-4-4h8" stroke="#fff4bb" stroke-width="2" stroke-linecap="round"/></g>';

export const LEAF_PIN_SVG = '<g id="accessory"><ellipse cx="328" cy="343" rx="5" ry="8" fill="#236b31" opacity=".3"/><g class="king-leaf-sway"><g transform="translate(350 342) scale(1.18) translate(-350 -342)"><path d="M327 338Q351 308 384 339Q373 369 348 354Q336 351 327 338Z" fill="#5bcf69" stroke="#236b31" stroke-width="3"/><path d="M329 339Q352 342 379 340" fill="none" stroke="#236b31" stroke-width="2.5" stroke-linecap="round"/><path d="M340 340l7-11M354 341l8-12M350 342l8 10M366 342l5 6" fill="none" stroke="#328443" stroke-width="1.5" stroke-linecap="round"/><path d="M338 332Q351 321 366 330" fill="none" stroke="#c3f59b" stroke-width="2.5" stroke-linecap="round"/></g></g><path class="king-detail king-leaf-breeze" d="M365 316q9-5 15 0M374 306q10-5 16 0" fill="none" stroke="#9ce69d" stroke-width="2" stroke-linecap="round" opacity=".6"/></g>';
