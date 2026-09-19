import { backgroundLife } from './background-life';
// Visual tiers only: these do not alter mint probabilities or metadata rarity.
export const BACKGROUND_EFFECT_TIERS = ['simple','simple','simple','rare','rare','rare','rare','simple','ultra','rare','rare','rare','rare','rare','ultra','ultra','ultra'] as const;
const drift = (dx:number,dy:number,dur:number,phase=0) => `<animateTransform attributeName="transform" type="translate" values="0 0;${dx} ${dy};0 0" dur="${dur}s" begin="${phase}s" repeatCount="indefinite"/>`;
const pulse = (dur:number,phase=0) => `<animate attributeName="opacity" values=".05;.5;.05" dur="${dur}s" begin="${phase}s" repeatCount="indefinite"/>`;
const flow = (d:string,color:string) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="5 70" opacity=".45"><animate attributeName="stroke-dashoffset" values="150;0" dur="9s" repeatCount="indefinite"/></path>`;
const orbit = (r:number,dur:number,color:string) => `<g><animateTransform attributeName="transform" type="rotate" values="0 256 256;360 256 256" dur="${dur}s" repeatCount="indefinite"/><circle cx="256" cy="256" r="${r}" fill="none" stroke="${color}" opacity=".15"/><circle cx="${256+r}" cy="256" r="3" fill="${color}" opacity=".55"/></g>`;
export function backgroundEffects(id:number): string {
  const motifs = [
    `<ellipse cx="256" cy="248" rx="220" ry="218" fill="#fff1ac" opacity=".08">${pulse(12)}</ellipse>`,
    `<g opacity=".1" stroke="#fff4ec" stroke-width="12"><path d="M-64 60h640m-640 120h640m-640 120h640m-640 120h640"/>${drift(0,18,18)}</g>`,
    [0,1,2].map(i=>`<g><circle cx="${60+i*190}" cy="${360-i*90}" r="${9+i*5}" fill="#eafffa" fill-opacity=".08" stroke="#eafffa" opacity=".45"/>${drift(8,-48,12+i*3,-i*3)}</g>`).join(''),
    flow('M0 512L512 0','#dfceff'),
    flow('M64 0v512M448 512V0M0 128h512M512 384H0','#95eaff'),
    `<g opacity=".1"><path d="M256 256L0 15v28Zm0 0L512 50v34Zm0 0L42 512h36Zm0 0L512 415v30Z" fill="#fff8c0"/><animateTransform attributeName="transform" type="rotate" values="0 256 256;360 256 256" dur="90s" repeatCount="indefinite"/></g>`+orbit(216,42,'#ffe8aa'),
    orbit(215,30,'#fff4fc')+orbit(181,43,'#ffe5f5'),
    `<g fill="#ffffff" opacity=".22"><path d="M18 86q2-18 20-16q15-26 31 0q20-4 25 16ZM376 163q2-18 20-16q15-26 31 0q20-4 25 16Z"/>${drift(22,0,21)}</g>`,
    `<g opacity=".12"><ellipse cx="250" cy="250" rx="250" ry="110" fill="#9775dc"/>${drift(12,-20,24)}</g><g><path d="M14 71l54 21" stroke="#d9eaff" stroke-width="2"/>${drift(310,115,14)}<animate attributeName="opacity" values="0;0;0;.7;0;0" dur="14s" repeatCount="indefinite"/></g>`+orbit(227,62,'#c8b6ff'),
    flow('M30 70h70v105h-40v100h40v130M420 35v110h60v130h-65v180','#ffd781'),
    flow('M20 210L78 108 200 56 426 165 495 92M20 400L72 346 180 420 431 408 495 275','#d2daff'),
    orbit(225,36,'#dff9e4')+orbit(196,51,'#eff8ff'),
    `<g data-terminal-overlay="static"/>`,
    [0,1,2].map(i=>`<rect x="${37+i*13}" y="${215+i*35}" width="6" height="10" fill="#ffe9a9" opacity=".3">${pulse(9+i*3,-i*2)}</rect>`).join('')+`<g fill="#d2e8ff" opacity=".12"><ellipse cx="422" cy="106" rx="62" ry="8"/>${drift(-30,0,28)}</g>`,
    [0,1,2,3,4].map(i=>`<g><path d="M${36+i*101} ${48+i*35}q-8-15 5-14q13 8-5 14Z" fill="#ffd6e9" opacity=".6"/><animateTransform attributeName="transform" type="translate" values="0 -90;${i%2?30:-25} 140;0 360" dur="${13+i*2}s" begin="${-i*3}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.7;.7;0" dur="${13+i*2}s" begin="${-i*3}s" repeatCount="indefinite"/></g>`).join(''),
    `<path d="M100 0L32 480h100L150 0ZM362 0l18 480h100L412 0Z" fill="#ffe5a0" opacity=".06">${pulse(16)}</path>`+flow('M40 65h432M40 447h432','#ffe1a2'),
    orbit(233,72,'#ffe6a5'),
  ];
  if(!Number.isInteger(id)||!motifs[id]) throw new RangeError('Invalid background');
  return `<g data-background-tier="${BACKGROUND_EFFECT_TIERS[id]}" data-background-effect="${id}">${motifs[id]}${backgroundLife(id)}</g>`;
}
