import { fallingPetalsSvg } from './accessory-action';
// Authored additive details. Generated Solidity uses the exact same SVG strings.
const pulse = (duration: number, peak = '.65') => `<animate attributeName="opacity" values=".12;${peak};.12" dur="${duration}s" repeatCount="indefinite"/>`;
const colors = ['#d0b5f7','#ffe2a0','#d8e3ff','#ffffff','#c0f5e8','#b8c6dc','#ffe5ef','#f0a0b8','#ffe7a3'];

export function suitUpgrade(id: number): string {
  if (id < 8 || id > 15) return '';
  const paths = [
    'M209 401l4-9 4 9-4 9Z', // constellation
    'M207 409h20v-9h15', // block chain
    'M217 397l9 12-9 12-9-12Z', // crystal
    'M207 403h7v7h-7m17 0h7v7h-7', // matrix
    'M215 402l-6 7 6 7m19-14 6 7-6 7', // terminal
    'M287 353h18', // pocket stitch
    'M284 404q-8-15 4-18q13 9-4 18Z', // petal
    'M210 407l7-8 7 8-7 8Z', // embroidery
  ];
  return `<g data-suit-upgrade="${id}" fill="none" stroke="${colors[id-8]}" stroke-width="1.5" stroke-linecap="round"><path d="${paths[id-8]}">${pulse(6 + (id % 3))}</path></g>`;
}

export function accessoryUpgrade(id: number): string {
  if (id === 12) return `<g data-accessory-upgrade="12"><path d="M177 170q16-44 55-51" fill="none" stroke="#ffffff" stroke-width="3" pathLength="100" stroke-dasharray="18 100" opacity=".25"><animate attributeName="stroke-dashoffset" values="118;0" dur="7s" repeatCount="indefinite"/>${pulse(7,'.5')}</path><circle cx="324" cy="302" r="3" fill="#8de9d6">${pulse(4,'.8')}</circle></g>`;
  if (id === 18) return fallingPetalsSvg() + `<g data-accessory-upgrade="18" fill="#ffe6f3">${[0,1].map(i=>`<g><path d="M${174+i*164} 140q-6-9 3-10q8 6-3 10Z"/><animateTransform attributeName="transform" type="translate" values="0 0;${i ? 9 : -9} 18;${i ? 4 : -4} 38" dur="${7+i}s" begin="-${i*3}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.6;0" dur="${7+i}s" begin="-${i*3}s" repeatCount="indefinite"/></g>`).join('')}</g>`;
  // Stay inside the existing upright staff transform; added by the caller there.
  return '';
}

export function backgroundUpgrade(id: number): string {
  if (id !== 0 && id !== 5) return '';
  return `<g data-background-upgrade="${id}" fill="none" stroke="${id === 0 ? '#c9a643' : '#fff2c1'}" stroke-width="1.5" opacity=".2">${[0,1,2].map(i=>`<g><path d="${id === 0 ? `M${48+i*190} ${120+i*90}q-8 20 13 25q-13-10-13-25Z` : `M${48+i*190} ${120+i*90}v10m-5-5h10`}"/><animateTransform attributeName="transform" type="translate" values="0 0;0 -8;0 0" dur="${12+i*3}s" begin="-${i*2}s" repeatCount="indefinite"/></g>`).join('')}</g>`;
}

export function themeUpgrade(id: number): string {
  if (id < 8 || id > 16) return '';
  return `<g data-theme-upgrade="matched" fill="none" stroke="#ffe7a3" opacity=".18"><ellipse cx="256" cy="286" rx="191" ry="190" stroke-width="1.5" stroke-dasharray="3 17">${pulse(12,'.3')}</ellipse></g>`;
}
