'use strict';
// Explicit migration of canonical anatomy; the normal sync remains contract-first.
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText, f);
const {forearmGeometry} = require(path.join(root, 'app/collection/banmaoking/forearm-geometry.ts'));
const file = path.join(root, 'contracts/BanmaoKing/Lib/BanmaoKingAnatomyPart.sol');
let source = fs.readFileSync(file, 'utf8');
source = source.replace(/return (".*");}/, (_, literal) => {
  let svg = JSON.parse(literal);
  for (const side of ['left', 'right']) {
    const geometry = forearmGeometry(side, 0, 0);
    for (const [id, d] of [[`king-forearm-${side}`, geometry.fill], [`king-forearm-contour-${side}`, geometry.contour]]) {
      const re = new RegExp(`<path id="${id}"[^>]*>`);
      if (!re.test(svg)) throw Error('Missing ' + id);
      svg = svg.replace(re, tag => tag.replace(/ d="[^"]*"/, ` d="${d}"`));
    }
    const marker = `<g id="king-step-${side}">`;
    if (!svg.includes(`data-foot-size="${side}"`)) {
      const start = svg.indexOf(marker) + marker.length;
      if (start < marker.length) throw Error('Missing step');
      const end = svg.indexOf('</g>', start);
      svg = svg.slice(0, start) + `<g data-foot-size="${side}" transform="scale(.9 1)">` + svg.slice(start, end) + '</g>' + svg.slice(end);
    }
  }
  if (!svg.includes('id="king-forearm-right-grip"')) {
    const g = forearmGeometry('right', 0, 0, true);
    const grip = `<path id="king-forearm-right-grip" class="king-grip-forearm" d="${g.fill}" fill="url(#bk-fur)"/><path id="king-forearm-contour-right-grip" class="king-grip-forearm" d="${g.contour}" fill="none" stroke="#80643a" stroke-width="2.8" stroke-linecap="round"/>`;
    svg = svg.replace('<g transform="translate(369 357)">', grip + '<g transform="translate(369 357)">');
    const selector = ':is([data-accessory="15"],[data-accessory="17"])';
    svg = svg.replace('</style>', `.king-grip-forearm{display:none}${selector} .king-grip-forearm{display:inline}${selector} .king-arm-right>.king-forearm,${selector} .king-arm-right>.king-forearm-contour-right{display:none}</style>`);
  }
  // The old long proximal palm cap escaped the forearm when the wrist turned.
  // Keep only a shallow, tangent-rounded overlap; never stroke the hidden cap.
  svg = svg.replaceAll('L10-24Q0-32-10-24Z', 'C10-18-10-18-10-16Z');
  // Object-bounding-box gradients restart on every palm and expose the seam.
  // A shared flat fur tone stays continuous under independent wrist transforms.
  svg = svg.replace(/<path\b[^>]*>/g, tag => {
    const forearm = /id="king-forearm-(?:left|right|right-grip)"/.test(tag);
    const palm = tag.includes('C10-18-10-18-10-16Z');
    return forearm || palm ? tag.replace('fill="url(#bk-fur)"', 'fill="#e99a50"') : tag;
  });
  // Meet with equal screen-space stroke widths and flat caps. Round caps on
  // independently rotated paths form a visible bead at the wrist junction.
  svg = svg.replace(/<path\b[^>]*>/g, tag => {
    if (/id="king-forearm-contour-/.test(tag)) {
      return tag.replace('stroke-linecap="round"', 'stroke-linecap="butt"');
    }
    if (tag.includes('class="king-paw-contour"')) {
      tag = tag.replace('stroke-width="2.4"', 'stroke-width="2.5454545455"')
        .replace('stroke-linecap="round"', 'stroke-linecap="butt"');
    }
    // The edge pose must share the same vertical attachment tangent as all
    // other palms; its narrowing starts below the seam, not at the endpoint.
    tag = tag.replace('M-10-16C-9-7-9-2-9 4', 'M-10-16C-10-7-9-2-9 4')
      .replace('C9-3 9-9 10-16', 'C9-3 10-9 10-16');
    // A short tangent overlap covers subpixel chord/arc interpolation error
    // between the deforming forearm and rotating palm (under .35 SVG units).
    if (tag.includes('class="king-paw-contour"')) {
      tag = tag.replace('d="M-10-16C', 'd="M-10-16.6L-10-16C')
        .replace(/10-16"/, '10-16L10-16.6"');
    }
    return tag;
  });
  // Grip-only CSS wins over SMIL wrist transforms without disabling the arm lift.
  // Counter-rotated props must lose the inverse wrist track at the same time.
  const gripSelector = ':is([data-accessory="6"],[data-accessory="9"],[data-accessory="14"],[data-accessory="15"],[data-accessory="17"],[data-accessory="19"],[data-accessory="20"])';
  const gripLock = `${gripSelector} :is([id$="smil-king-wrist-right"],[id$="smil-king-held-wrist"],[id$="smil-king-shield-counter-wrist"],[id$="smil-king-staff-counter-wrist"]){transform:none!important}`;
  const palmLock = gripLock.replace(',[id$="smil-king-held-wrist"]', '');
  if (!svg.includes(gripLock) && !svg.includes(palmLock)) svg = svg.replace('</style>', palmLock + '</style>');
  // A rigid grip must not counter-rotate the prop away from the palm when
  // the shoulder, torso or full-turn parent moves. Keep all authored sockets.
  const counterLock = `${gripSelector} :is([id$="smil-king-shield-counter-arm"],[id$="smil-king-shield-counter-lean"],[id$="smil-king-staff-counter-arm"],[id$="smil-king-staff-counter-lean"],[id$="smil-king-staff-counter-turn"]){transform:none!important}`;
  if (!svg.includes(counterLock)) svg = svg.replace('</style>', counterLock + '</style>');
  // Rotate the whole rigid socket about the palm attachment (369,345).
  // The enlarged palm's pivot is unchanged; held props use local (0,-12).
  const alignment = `${gripSelector} .king-arm-right .king-paw-alignment-cupped`;
  svg = svg.replace(`${alignment}{transform:none}`, `${alignment}{transform:rotate(-28deg);transform-origin:0px -12px}`);
  const socketAlignment = `${gripSelector} [id$="smil-king-held-wrist"]{transform:rotate(-28deg)!important;transform-origin:0px -12px}[data-accessory="6"] [data-ak-grip]{display:none}`;
  // The socket counter-rotates around its own grip, preserving the hand position.
  svg = svg.replace(socketAlignment, '[data-accessory="6"] [data-ak-grip]{display:none}');
  svg = svg.replace(gripLock, gripLock.replace(',[id$="smil-king-held-wrist"]', ''));
  if (!svg.includes('[data-accessory="6"] [data-ak-grip]{display:none}')) svg = svg.replace('</style>', '[data-accessory="6"] [data-ak-grip]{display:none}</style>');
  // Place the counter-rotation pivot in the distal palm, not at the wrist.
  // Palm-local (0,4) is inside the fingers (tip around y=12), scaled 1.1
  // about (0,-12), then rotated -28 degrees with the cupped palm.
  const angle = -28 * Math.PI / 180;
  const reach = (4 + 12) * 1.1;
  const socketX = Number((369 - reach * Math.sin(angle)).toFixed(2));
  // Raise the authored socket by 3 SVG units without changing its horizontal reach.
  const socketY = Number((345 + reach * Math.cos(angle) + 12 - 3).toFixed(2));
  const offsetSelector = `${gripSelector} [id$="smil-king-held-arm"]>g`;
  // Remove prior offsets before writing the anatomical anchor (idempotent).
  for (const rule of svg.match(/[^{}]+\{[^{}]*\}/g) || []) {
    if (rule.startsWith(offsetSelector + '{')) svg = svg.replace(rule, '');
  }
  const socketOffset = `${offsetSelector}{transform:translate(${socketX}px,${socketY}px)}`;
  svg = svg.replace('</style>', socketOffset + '</style>');
  const gripGeometry = forearmGeometry('right', 0, 0, true);
  for (const [id, d] of [['king-forearm-right-grip', gripGeometry.fill], ['king-forearm-contour-right-grip', gripGeometry.contour]]) {
    svg = svg.replace(new RegExp(`<path id="${id}"[^>]*>`), tag => tag.replace(/ d="[^"]*"/, ` d="${d}"`));
  }
  for (const side of ['left', 'right']) {
    if (svg.includes(`data-palm-size="${side}"`)) continue;
    const wrist = svg.indexOf(`<g id="smil-king-wrist-${side}"`);
    if (wrist < 0) throw Error('Missing wrist ' + side);
    const start = svg.indexOf('>', wrist) + 1;
    const tags = /<g\b[^>]*>|<\/g>/g;
    tags.lastIndex = start;
    let depth = 1, match;
    while ((match = tags.exec(svg))) {
      depth += match[0] === '</g>' ? -1 : 1;
      if (!depth) {
        svg = svg.slice(0, start) + `<g data-palm-size="${side}" transform="translate(0 -12) scale(1.1) translate(0 12)">` + svg.slice(start, match.index) + '</g>' + svg.slice(match.index);
        break;
      }
    }
    if (depth) throw Error('Unbalanced wrist ' + side);
  }
  return 'return ' + JSON.stringify(svg) + ';}';
});
fs.writeFileSync(file, source);
require('./sync-king-choreography.cjs');
