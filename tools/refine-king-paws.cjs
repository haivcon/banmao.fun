'use strict';
// One-time, idempotent refinement of canonical Solidity anatomy, preserving rig IDs.
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'contracts/BanmaoKing/Lib/BanmaoKingAnatomyPart.sol');
let source = fs.readFileSync(file, 'utf8');
const replacements = [
 ['translate(143 380)', 'translate(143 357)'],
 ['translate(369 380)', 'translate(369 357)'],
 ['M164 302C142 313 123 333 125 352C127 364 133 372 143 375C153 376 160 369 161 359C160 343 169 324 184 310Z', 'M164 302C154 312 143 325 131 339Q126 351 143 352Q158 352 162 340C169 328 177 317 184 310Z', 'M164 302C155 319 144 341 130 365Q128 373 143 375Q155 375 159 363C166 343 175 323 184 310Z'],
 ['M348 302C370 313 389 333 387 352C385 364 379 372 369 375C359 376 352 369 351 359C352 343 343 324 328 310Z', 'M348 302C358 312 369 325 381 339Q386 351 369 352Q354 352 350 340C343 328 335 317 328 310Z', 'M348 302C357 319 368 341 382 365Q384 373 369 375Q357 375 353 363C346 343 337 323 328 310Z'],
 ['M-17 5C-22-1-20-12-13-16Q-7-24 0-19Q8-24 15-16C23-10 22 2 16 9Q0 20-17 5Z', 'M-18 5C-23-3-20-13-13-16Q-8-23-2-19Q4-24 10-19Q17-20 20-11C25-1 20 10 12 13Q-5 20-18 5Z'],
 ['M-18 8C-26 1-23-12-16-15Q-18-27-9-28Q-2-31 1-22Q8-30 15-24Q21-20 17-14Q27-9 24 0Q22 10 14 15Q0 23-18 8Z', 'M-17 5C-21-1-21-10-16-14Q-17-21-10-21Q-6-21-5-18Q-3-25 3-23Q7-22 7-18Q12-22 16-18Q19-15 18-11C23-7 23 0 18 6Q13 14 3 14Q-10 16-17 5Z', 'M-20 7C-28 0-25-12-18-13C-23-23-12-30-7-21C-10-33 4-34 5-22C11-32 22-25 17-16C27-21 31-8 23-3Q27 10 14 15Q-3 23-20 7Z'],
 ['M-18 4C-23-5-18-16-10-18Q-4-26 3-20Q13-23 18-14Q24-5 18 6Q10 18-1 17Q-12 16-18 4Z', 'M-18 4C-25-5-19-18-10-17Q-3-25 4-18Q15-21 20-11C24-1 17 6 12 6Q5 3 3-3Q0 8 10 12Q-4 23-18 4Z'],
 ['M-14 419Q-18 443 -17 459C-32 463 -34 480 -23 487Q-16 493 -9 490Q0 495 9 490Q23 494 27 483C32 469 22 458 13 455L14 419Z', 'M-14 419C-16 434-14 450-18 460C-33 460-37 475-29 482Q-28 493-17 491Q-9 498 0 491Q10 497 18 490Q31 490 30 478C30 465 22 459 13 456L14 419Z', 'M-14 419Q-20 438-16 452L-21 449L-18 460C-33 460-37 475-29 482Q-28 493-17 491Q-9 498 0 491Q10 497 18 490Q31 490 30 478C30 465 22 459 13 456L14 419Z'],
 ['M-12 479q-3 6 0 10M0 480v11M12 479q3 6 0 10', 'M-17 478q-3 7 0 12M-4 480q-2 7 0 12M10 480q3 6 1 11']
];
for (const [before, after, previous] of replacements) {
 const variants = [before, previous].filter(Boolean);
 if (!source.includes(after) && !variants.some(value => source.includes(value))) throw Error('Missing anatomy path');
 for (const value of variants) source = source.replaceAll(value, after);
}
// Scale only the pads, not the wrist or its animated transform.
source = source.replaceAll('class=\\"king-paw-pads\\" opacity=', 'class=\\"king-paw-pads\\" transform=\\"scale(.76)\\" opacity=');
source = source.replaceAll('fill=\\"#ed969e\\" stroke=\\"#a95e65\\"', 'fill=\\"#e7a5aa\\" stroke=\\"#ba7f85\\"');
fs.writeFileSync(file, source);
require('./sync-king-choreography.cjs');
