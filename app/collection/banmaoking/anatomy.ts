// Local shapes keep the existing shoulder, foot and tail animation anchors.
const fur = 'fill="url(#bk-fur)" stroke="#80643a" stroke-width="2.8" stroke-linejoin="round"';
const line = 'fill="none" stroke="#b66c38" stroke-width="2.4" stroke-linecap="round"';

function paw(palm: boolean) {
  return `<path class="king-paw-silhouette" d="M-17 7C-24 2-23-9-17-12Q-16-22-8-19Q0-26 8-19Q17-21 18-12C26-5 23 8 16 14Q0 23-17 7Z" ${fur}/>` + (palm
    ? '<g class="king-paw-pads" fill="#df8b8d" stroke="#aa6062" stroke-width="1"><path d="M-9 5Q-8-3-3-1Q0-5 4-1Q10-2 11 6Q9 13 3 10Q-4 14-9 5Z"/><ellipse cx="-14" cy="-6" rx="3.5" ry="4.5"/><ellipse cx="-5" cy="-12" rx="3.5" ry="4.5"/><ellipse cx="5" cy="-12" rx="3.5" ry="4.5"/><ellipse cx="14" cy="-5" rx="3.5" ry="4.5"/></g>'
    : `<path d="M-10-13q-2 5 0 8M0-17v9M10-13q2 5 0 8" ${line}/><path d="M-9 9q8 5 16 0" fill="none" stroke="#ffe1b2" stroke-width="3" stroke-linecap="round"/>`);
}

// [left paw x/y, right paw x/y]; raised paws are painted in front of the shell.
const hands = [[143, 367, 369, 367], [137, 371, 341, 265], [137, 363, 375, 363], [119, 339, 393, 339], [155, 369, 357, 369], [127, 327, 346, 357]] as const;
const feet = [[0, 0], [0, 0], [-17, 17], [-5, 5], [3, -3], [-14, 0]] as const;
const tailAngles = [0, 8, -12, 3, -7, 14];
const poseIndex = (id: number) => ((id % 6) + 6) % 6;

function arm(side: string, x: number, y: number, raised: boolean) {
  const left = side === 'left';
  const shoulder = left ? 174 : 338;
  return `<g class="king-arm-${side}"><path d="M${shoulder - 10} 302Q${x - 22} ${y - 30} ${x - 15} ${y + 3}Q${x} ${y + 24} ${x + 15} ${y + 3}Q${x + 22} ${y - 27} ${shoulder + 10} 310Z" ${fur}/>${raised ? '' : `<g transform="translate(${x} ${y})">${paw(false)}</g>`}</g>`;
}

function leg(side: string, shift: number, tiptoe: boolean) {
  const x = side === 'left' ? 190 : 322;
  return `<g class="king-leg-${side}"><g transform="translate(${x} 0)"><path class="king-hind-paw" d="M-14 419Q-18 443 ${shift - 17} 459C${shift - 32} 463 ${shift - 34} 480 ${shift - 23} 487Q${shift - 16} 493 ${shift - 9} 490Q${shift} 495 ${shift + 9} 490Q${shift + 23} 494 ${shift + 27} 483C${shift + 32} 469 ${shift + 22} 458 ${shift + 13} 455L14 419Z" ${fur}/><path d="M${shift - 12} 479q-3 6 0 10M${shift} 480v11M${shift + 12} 479q3 6 0 10" ${line}/><path d="M${shift - 18} 470q16-10 34-2" fill="none" stroke="#ffe1b2" stroke-width="4" stroke-linecap="round"/>${tiptoe ? `<ellipse cx="${shift}" cy="473" rx="8" ry="5" fill="#df8b8d"/>` : ''}</g></g>`;
}

export function actionPoseSvg(tokenId: number) {
  const pose = poseIndex(tokenId);
  const [lx, ly, rx, ry] = hands[pose];
  const tail = `<g class="king-tail-position" transform="translate(0 10)"><g class="king-tail"><g transform="rotate(${tailAngles[pose]} 318 383)"><path class="king-tail-silhouette" d="M316 371C346 365 363 392 388 394C416 397 437 377 435 351C434 334 424 323 414 327C405 331 409 342 413 350C420 367 403 379 387 375C363 370 344 350 316 358Z" ${fur}/><path class="king-tail-stripes" d="M346 365l-3 7M368 377l-3 6M392 381v8M415 374l5 4M424 354l6-1" fill="none" stroke="#a95d31" stroke-width="3" stroke-linecap="round"/><path d="M413 336q3-7 7-1" fill="none" stroke="#ffe1b2" stroke-width="5" stroke-linecap="round"/></g></g></g>`;
  return `<g id="action-pose" data-pose="${pose}">${tail}${arm('left', lx, ly, [2, 3, 5].includes(pose))}${arm('right', rx, ry, [1, 3].includes(pose))}${leg('left', feet[pose][0], pose === 4)}${leg('right', feet[pose][1], pose === 4)}</g>`;
}

export function frontPawsSvg(tokenId: number) {
  const pose = poseIndex(tokenId);
  const [lx, ly, rx, ry] = hands[pose];
  const left = [2, 3, 5].includes(pose) ? `<g transform="translate(${lx} ${ly})">${paw(pose !== 2)}</g>` : '';
  const right = [1, 3].includes(pose) ? `<g transform="translate(${rx} ${ry})">${paw(true)}</g>` : '';
  return left || right ? `<g id="front-paws">${left}${right}</g>` : '';
}
