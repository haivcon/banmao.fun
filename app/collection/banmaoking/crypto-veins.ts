// Authored SVG mirrored into BanmaoKingBodyEffects by sync-king-art-effects.cjs.
// Routes stay on the torso; the existing lower-tip identity badges remain untouched.
const designs = [
  {
    name: 'bitcoin', colors: ['#8A4B16', '#F7931A', '#FFE6A3'], duration: 6.4,
    routes: ['M245 345L225 325H210L196 311', 'M267 345L287 325H302L316 311', 'M245 365L225 385V405L241 421V434', 'M267 365L287 385V405L271 421V434'],
    branches: ['M225 325V311L218 304', 'M287 325V309L294 302', 'M225 385H207L199 377', 'M287 385H305L313 377'],
    terminals: [[196, 311], [316, 311], [241, 434], [271, 434]],
  },
  {
    name: 'ethereum', colors: ['#716BDA', '#A5B4FC', '#E8F4FF'], duration: 7.2,
    routes: ['M243 345L219 327L229 307L201 315', 'M269 345L293 327L283 307L311 315', 'M243 367L218 387L239 407L226 431', 'M269 367L294 387L273 407L286 431'],
    branches: ['M219 327L199 345L216 354', 'M293 327L313 345L296 354', 'M218 387L205 369M239 407L256 419', 'M294 387L307 369M273 407L256 419'],
    terminals: [[201, 315], [311, 315], [226, 431], [286, 431]],
  },

] as const;

// Paired silver inlays follow the torso rather than radiating from an empty chest.
// Highlights are inset from the ends; no nodes, branches, filters or shared SVG IDs.
function okbInlays(): string {
  const routes = [
    'M207 316L218 327Q222 331 222 339V376Q222 390 229 402L238 424',
    'M305 316L294 327Q290 331 290 339V376Q290 390 283 402L274 424',
  ];
  // The left inlay sits on the lit side of the shell: soften only its silver layers.
  const paths = (left: string) => routes.map((d, i) => `<path d="${d}"${i === 0 ? ` stroke="${left}"` : ''}/>`).join('');
  const accents = ['M207 352V365Q207 373 211 378', 'M305 352V365Q305 373 301 378']
    .map(d => `<path data-okb-accent="true" d="${d}"/>`).join('');
  // Positive offsets avoid browser interpolation issues; 136 is one dash period.
  const flow = routes.map((d, i) => `<path data-crypto-flow="${i}" d="${d}" pathLength="100" stroke-dasharray="18 118" opacity="0"><animate attributeName="stroke-dashoffset" values="${i === 0 ? '18;154;154' : '154;18;18'}" keyTimes="0;.32;1" dur="9s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.95;.95;0;0" keyTimes="0;.06;.24;.32;1" dur="9s" repeatCount="indefinite"/></path>`).join('');
  return `<g data-crypto-veins="okb" data-okb-inlay="true" fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="#626B73" stroke-width="1.6" opacity=".55">${paths('#87929C')}</g><g stroke="#AAB4BE" stroke-width="1.2" opacity=".8">${paths('#C0CAD3')}</g><g stroke="#E0E6EC" stroke-width=".45" opacity=".45"><path d="M222 342V376Q222 390 229 402L234 414"/><path d="M290 342V376Q290 390 283 402L278 414"/></g><g stroke="#AAB4BE" stroke-width=".8" opacity=".5">${accents}</g><g stroke="#FFFFFF" stroke-width="1.25">${flow}</g></g>`;
}

export function cryptoVeins(id: number): string {
  if (id === 8) return okbInlays();
  const design = designs[id - 6];
  if (!design) throw new RangeError('Invalid crypto suit');
  const { name, colors, duration, routes, branches, terminals } = design;
  const pulse = '0;.9;.9;0;0';
  const branchPulse = '.35;.35;.8;.35;.35';
  const paths = routes.map(d => `<path d="${d}"/>`).join('');
  const flow = routes.map((d, i) => {
    const timing = `dur="${duration}s" begin="-${i * duration / 4}s" repeatCount="indefinite"`;
    return `<path data-crypto-flow="${i}" d="${d}" pathLength="100" stroke-dasharray="10 110" opacity="0"><animate attributeName="stroke-dashoffset" values="10;-110;-110" keyTimes="0;.7;1" ${timing}/><animate attributeName="opacity" values="${pulse}" keyTimes="0;.12;.55;.7;1" ${timing}/></path>`;
  }).join('');
  const facets = branches.map((d, i) => `<path d="${d}" opacity=".45"><animate attributeName="opacity" values="${branchPulse}" keyTimes="0;.35;.55;.75;1" dur="${duration}s" begin="-${i * duration / 4}s" repeatCount="indefinite"/></path>`).join('');
  const nodes = terminals.map(([x, y]) => name === 'ethereum'
    ? `<path d="M${x} ${y - 2.5}l2 2.5-2 2.5-2-2.5Z"/>`
    : `<rect x="${x - 1.8}" y="${y - 1.8}" width="3.6" height="3.6"/>`).join('');


  return `<g data-crypto-veins="${name}" fill="none" stroke-linejoin="round"><g stroke="${colors[0]}" stroke-width="3.2" opacity=".65">${paths}</g><g stroke="${colors[1]}" stroke-width="1.6" opacity=".8">${paths}</g><g stroke="${colors[2]}" stroke-width=".65" opacity=".6">${paths}</g><g data-crypto-branches="true" stroke="${colors[1]}" stroke-width="1">${facets}</g><g stroke="${colors[2]}" stroke-width="1.8">${flow}</g><g fill="${colors[2]}" stroke="${colors[0]}" stroke-width=".7">${nodes}</g></g>`;
}
