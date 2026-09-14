import { expressionSvg } from './artwork';

// Canonical face SMIL, compiled into Solidity by generate-king-smil.cjs.
const durations = [4, 2, 3.2, 2.8, 7, 2.2, 5, 6, 2.4, 7, 2.6, 8];
const splines = '.4 0 .6 1;.4 0 .6 1;.2 0 .2 1;.4 0 .6 1;.4 0 .6 1';
function morph(attribute: string, base: string, peak: string, dur: number) {
  return `<animate attributeName="${attribute}" values="${base};${peak};${base};${peak};${base};${base}" keyTimes="0;.38;.5;.62;.78;1" calcMode="spline" keySplines="${splines}" dur="${dur}s" repeatCount="indefinite"/>`;
}
function mouthMotion(svg: string, id: number) {
  // Each authored path retains its command topology and neutral endpoints.
  const peaks: Record<string, string> = {
    'M241 255q15 13 30 0': 'M241 255q15 22 30 0',
    'M256 255v5': 'M256 255v5',
    'M241 259Q256 265 271 259C269 280 243 280 241 259Z': 'M241 259Q256 263 271 259C269 286 243 286 241 259Z',
    'M248 271Q256 266 264 271Q256 277 248 271Z': 'M248 276Q256 271 264 276Q256 282 248 276Z',
    'M256 257v7q-9 12-23 2M256 264q9 12 23 2': id === 2 ? 'M256 257v7q-9 9-23 2M256 264q9 17 23 2' : id === 3 ? 'M256 257v7q-9 16-23 2M256 264q9 16 23 2' : 'M256 257v7q-9 19-23 2M256 264q9 19 23 2',
    'M243 271q13 7 26 0': 'M243 271q13 3 26 0',
    'M239 278q17-16 34 0': 'M239 278q17-10 34 0',
    'M241 274q15-11 30 0': 'M241 274q15-15 30 0',
    'M237 261q19 18 38 0': 'M237 261q19 28 38 0',
    'M249 274q8 16 15 0': 'M249 278q8 26 15 0',
    'M240 268q14 5 29-4': 'M240 268q14 9 29-6',
    'M246 268q10 3 20 0': 'M246 268q10 5 20 0',
  };
  return svg.replace(/<g class="king-mouth">([\s\S]*?)<\/g>/, (_, shapes: string) => {
    shapes = shapes.replace(/<path\b[^>]*d="([^"]+)"[^>]*\/>/g, (tag, d: string) => {
      if (!peaks[d]) throw new Error(`Missing mouth ${id}: ${d}`);
      return tag.slice(0, -2) + ` style="--king-d:path('${d}')">` + morph('d', d, peaks[d], durations[id]) + '</path>';
    }).replace(/<ellipse\b[^>]*ry="([^"]+)"[^>]*\/>/g, (tag, ry: string) => tag.slice(0, -2) + ` style="--king-ry:${ry}px">` + morph('ry', ry, String(Number(ry) + (Number(ry) > 5 ? 5 : 2)), durations[id]) + '</ellipse>');
    return `<g class="king-mouth" data-mouth-motion="${id}">${shapes}</g>`;
  });
}

export function animatedExpressionSvg(id: number) {
  // Pulse only authored blush ellipses; preserve their neutral opacity and geometry.
  const svg = mouthMotion(expressionSvg(id), id).replace(/<ellipse\b[^>]*fill="#ef8b8b"[^>]*opacity=".3"[^>]*\/>/g, tag =>
    tag.slice(0, -2) + ' class="king-blush"><animate attributeName="opacity" values=".3;.44;.3" keyTimes="0;.5;1" calcMode="spline" keySplines=".4 0 .6 1;.4 0 .6 1" dur="5.2s" repeatCount="indefinite"/></ellipse>');
  const start = '<g id="expression">';
  const nose = svg.indexOf('<path d="M256 240');
  const details = id === 6 ? svg.indexOf('<path d="M198 191') : id === 7 ? svg.indexOf('<g class="king-tears">') : nose;
  const eyeEnd = details >= 0 ? details : nose;
  let eyes = svg.slice(start.length, eyeEnd);
  if (id === 4 || id === 11) {
    const base = id === 4 ? 'M199 218q21 16 42 0M271 218q21 16 42 0' : 'M199 216q21 9 42 0M271 216q21 9 42 0';
    const peak = id === 4 ? 'M199 218q21 11 42 0M271 218q21 11 42 0' : 'M199 216q21 11 42 0M271 216q21 11 42 0';
    eyes = eyes.replace(/<path[^>]+\/>/, tag => tag.slice(0,-2) + ` style="--king-d:path('${base}')">` + morph('d',base,peak,durations[id]) + '</path>');
    eyes = `<g class="king-eyes-rest" data-rest="${id === 4 ? 'sleepy' : 'zen'}">${eyes}</g>`;
  } else if (id === 3 || id === 10) {
    eyes = `<g class="king-eyes-symbolic">${eyes}<animateTransform attributeName="transform" type="rotate" additive="sum" values="0 256 215;0 256 215;${id === 3 ? 2 : -3} 256 215;0 256 215;0 256 215" keyTimes="0;.4;.55;.7;1" calcMode="spline" keySplines=".4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1" dur="${durations[id]}s" repeatCount="indefinite"/></g>`;
  } else {
    // Discrete visibility switches between actual open and closed shapes, never a fade.
    const timing = `keyTimes="0;.84;.865;.9;1" calcMode="discrete" dur="${durations[id]}s" repeatCount="indefinite"`;
    let wink = '';
    if (id === 2) {
      const tag = eyes.match(/^<path[^>]+\/>/)![0];
      eyes = eyes.slice(tag.length);
      wink = `<g class="king-wink-left">${tag.slice(0,-2)} style="--king-d:path('M199 219q21-16 41 0')">${morph('d','M199 219q21-16 41 0','M199 219q21-10 41 0',3.8)}</path></g>`;
    }
    const lids = id === 2 ? 'M273 217q19 9 38 0' : id === 0 ? 'M204 213q20 9 40 0M268 213q20 9 40 0' : 'M197 217q21 9 42 0M273 217q21 9 42 0';
    eyes = `${wink}<g class="king-eyes-open">${eyes}<animate attributeName="visibility" values="visible;hidden;hidden;visible;visible" ${timing}/></g><g class="king-closed-lids" visibility="hidden"><path d="${lids}" fill="none" stroke="#633c25" stroke-width="3.5" stroke-linecap="round"/><animate attributeName="visibility" values="hidden;visible;visible;hidden;hidden" ${timing}/></g>`;
  }
  const detail = svg.slice(eyeEnd).replace('<g class="king-tears">', '<g class="king-tears"><animateTransform attributeName="transform" type="translate" additive="sum" values="0 0;0 8;0 0" dur="2s" repeatCount="indefinite"/>');
  return `${start}${eyes}${detail}`;
}
