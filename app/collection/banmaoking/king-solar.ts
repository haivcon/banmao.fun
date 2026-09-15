import { SOLAR_STAGE, SOLAR_SCEPTER } from './king-solar-spectacle';

// Preview-only solar choreography. All IDs are scoped by previewSvg.
const coronation = (peak = .8) => `<animate attributeName="opacity" values="0;0;${peak};0;0" keyTimes="0;.62;.72;.86;1" dur="16s" repeatCount="indefinite"/>`;
const sparkle = (x: number, y: number) => `<path d="M${x} ${y-6}l1.5 4.5 4.5 1.5-4.5 1.5-1.5 4.5-1.5-4.5-4.5-1.5 4.5-1.5Z" fill="#fff4ca" opacity="0">${coronation()}</path>`;

export function solarBody(svg: string): string {
  // Modify only the peel material: no overlay across the face or moving limbs.
  return svg.replace(/<linearGradient id="bk-peel"[\s\S]*?<\/linearGradient>/, `<linearGradient id="bk-peel" x1="0" y1="0" x2="1" y2=".4"><stop stop-color="#925026"/><stop offset=".22" stop-color="#e4a329"/><stop offset=".4" stop-color="#fff2ad"><animate attributeName="offset" values=".28;.65;.28" dur="8s" repeatCount="indefinite"/></stop><stop offset=".72" stop-color="#e6ac32"/><stop offset="1" stop-color="#74364a"/></linearGradient>`);
}

export function solarMantle(svg: string): string {
  let wing = 0;
  return svg.replace(/dur="5.8s"/g, () => `dur="${wing++ ? 6.7 : 5.8}s"`)
    .replaceAll('<path d="M179 301Q144 359 128 432" fill="none" stroke="#f4d286" stroke-width="2" opacity=".6"/>', `<path d="M179 301Q144 359 128 432" fill="none" stroke="#f4d286" stroke-width="2" opacity=".6"><animate attributeName="d" values="M179 301Q144 359 128 432;M179 301Q134 368 116 429;M179 301Q144 359 128 432" dur="6.2s" repeatCount="indefinite"/></path><path d="M182 310Q165 370 169 434" fill="none" stroke="#230d2e" stroke-width="12" opacity=".25"><animate attributeName="d" values="M182 310Q165 370 169 434;M182 310Q153 379 163 440;M182 310Q165 370 169 434" dur="6.7s" repeatCount="indefinite"/></path><path d="M153 393l7-12 7 12-7 12Z" fill="none" stroke="#e6b968" opacity=".35">${coronation(.65)}</path>`);
}

export function solarRegalia(svg: string): string {
  const effects = `<g class="king-solar-regalia"><path d="M256 116l-6 11 6 10Z" fill="#ff8c9e"/><path d="M256 116l6 11-6 10Z" fill="#720f39"/><path d="M256 116l6 11-6 10-6-10Z" fill="#fff0cf" opacity="0">${coronation(.55)}</path><path d="M216 132Q256 120 296 132" fill="none" stroke="#fff8d9" stroke-width="2" stroke-dasharray="10 90"><animate attributeName="stroke-dashoffset" values="100;0;-100" dur="8s" repeatCount="indefinite"/></path>${sparkle(240,62)}${sparkle(312,80)}<path d="M385 420V238" fill="none" stroke="#fff9cf" stroke-width="3" stroke-dasharray="18 190" opacity=".7"><animate attributeName="stroke-dashoffset" values="0;208;208" keyTimes="0;.65;1" dur="8s" repeatCount="indefinite"/></path><path d="M369 207l16-20v39Z" fill="#9a164c"/><path d="M385 187l15 20-15-5Z" fill="#ffe1dd"/><path d="M369 207l16-20 15 20-15 19Z" fill="#fff0cf" opacity="0">${coronation(.5)}</path><circle cx="385" cy="207" r="20" fill="none" stroke="#ffe5a0" stroke-width="1.5" opacity="0"><animate attributeName="r" values="19;19;40;44;19" keyTimes="0;.65;.8;.9;1" dur="16s" repeatCount="indefinite"/>${coronation(.7)}</circle></g>`;
  return svg.replace('</g></g>', `</g>${effects}${SOLAR_SCEPTER}</g>`);
}

export function solarFace(svg: string): string {
  // Scale the complete eye artwork around its baseline, including reflections.
  return svg.replace('<g fill="#34202c"', '<g class="king-solar-blink" transform="translate(0 216)"><g transform="translate(0 -216)"><g fill="#34202c"')
    .replace('<path d="M248 242', `</g><animateTransform attributeName="transform" type="scale" additive="sum" values="1 1;1 1;1 .08;1 1;1 1" keyTimes="0;.72;.74;.77;1" dur="7.3s" repeatCount="indefinite"/></g><path d="M248 242`);
}

export function solarThrone(svg: string): string {
  const sun = `<g class="king-solar-emblem" fill="none" stroke="#edc776"><circle cx="256" cy="184" r="125" opacity=".24"/><g opacity=".3"><animateTransform attributeName="transform" type="rotate" from="0 256 184" to="360 256 184" dur="120s" repeatCount="indefinite"/>${Array.from({length:24},(_,i)=>`<path d="M256 47l4 10-4 8-4-8Z" transform="rotate(${i*15} 256 184)"/>`).join('')}</g><circle cx="256" cy="184" r="132" stroke-width="3" opacity="0">${coronation(.35)}</circle></g><g fill="#ffe4a1" opacity=".06"><path d="M168 0h28l-62 470H38Z"/><path d="M316 0h28l130 470h-96Z"/><animate attributeName="opacity" values=".04;.1;.04" dur="12s" repeatCount="indefinite"/></g>`;
  return svg.replace('<path d="M215 390', `${sun}${SOLAR_STAGE}<path d="M215 390`)
    .replace(/(<path d="M(62|450) 280q-17-15 0-39q17 24 0 39" fill="#ffd586">)/g, (_, tag: string, x: string) => `${tag}<animate attributeName="d" values="M${x} 280q-17-15 0-39q17 24 0 39;M${x} 280q-12-19 4-45q10 30-4 45;M${x} 280q-17-15 0-39q17 24 0 39" dur="${x === '62' ? 2.3 : 3.1}s" repeatCount="indefinite"/>`);
}
