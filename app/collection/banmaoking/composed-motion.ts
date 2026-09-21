// Complete authored silhouettes, with local accents rather than moving the whole face.
export function composedExpression(svg: string, id: 9 | 10 | 11): string {
  const duration = id === 9 ? 7 : id === 10 ? 4.8 : 8;
  const times = '0;.12;.3;.43;.58;.82;1';
  const animate = (attribute: string, values: string, timing = times) => `<animate attributeName="${attribute}" values="${values}" keyTimes="${timing}" dur="${duration}s" repeatCount="indefinite"/>`;
  const transform = (type: string, values: string) => `<animateTransform attributeName="transform" type="${type}" values="${values}" keyTimes="${times}" calcMode="spline" keySplines="${Array(6).fill('.4 0 .6 1').join(';')}" dur="${duration}s" repeatCount="indefinite"/>`;
  const start = '<g id="expression">', nose = svg.indexOf('<path d="M256 240');
  if (!svg.startsWith(start) || nose < 0) throw new Error('Missing composed face anchors');
  let eyes = svg.slice(start.length, nose), detail = svg.slice(nose);
  if (id === 9) {
    // Cool eyes are solid dark shapes: shift only their reflection, not the silhouette.
    eyes = eyes.replace(/<path\b[^>]*stroke="#cce8ff"[^>]*\/>/, tag => `<g data-cool-glance="true">${tag}${transform('translate','0 0;0 0;2 0;2 0;2 0;0 0;0 0')}</g>`);
    detail = detail.replace('<g class="king-mouth">', '<g class="king-mouth" data-mouth-motion="9">');
    detail = detail.replace('d="M240 268q14 5 29-4"', 'd="M240 268q14 5 29-4" data-cool-smirk="true"');
    detail = detail.replace(/<path\b[^>]*data-cool-smirk="true"[^>]*\/>/, tag => tag.slice(0,-2) + `>${animate('d','M240 268q14 5 29-4;M240 268q14 5 29-4;M240 268q14 5 29-6;M240 268q14 5 29-6;M240 268q14 5 29-6;M240 268q14 5 29-4;M240 268q14 5 29-4')}</path>`);
    // Clip only the moving light, never the authored eye or its outline.
    eyes += [198,274].map((x,i) => {
      const timing = i ? '0;.3;.32;.365;.38;.4;1' : '0;.285;.305;.35;.365;.385;1';
      return `<defs><clipPath id="king-cool-light-${i}" clipPathUnits="userSpaceOnUse"><path d="M${x+2} 211q18-10 36 0v6q-18 20-36 0z"/></clipPath></defs><g clip-path="url(#king-cool-light-${i})"><g data-cool-sweep="${i}" opacity="0">${animate('opacity','0;0;.85;.85;0;0;0',timing)}<animateTransform attributeName="transform" type="translate" values="-20 0;-20 0;-5 0;36 0;58 0;-20 0;-20 0" keyTimes="${timing}" dur="7s" repeatCount="indefinite"/><path d="M${x} 199l8 0-14 38h-8Z" fill="#d9f6ff"/><path d="M${x+2} 199h2l-14 38h-2Z" fill="#ffffff"/></g></g>`;
    }).join('');
    detail = `<path data-cool-brow="true" d="M277 195q16-5 30 0" fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round">${animate('d','M277 195q16-5 30 0;M277 195q16-5 30 0;M277 192q16-7 30 0;M277 192q16-7 30 0;M277 192q16-7 30 0;M277 195q16-5 30 0;M277 195q16-5 30 0')}</path><g transform="translate(328 195)"><g data-cool-spark="true" opacity="0">${animate('opacity','0;0;1;0;0','0;.35;.38;.43;1')}<animateTransform attributeName="transform" type="scale" values=".4;.4;1.2;.4;.4" keyTimes="0;.35;.38;.43;1" dur="7s" repeatCount="indefinite"/><path d="M0-9L2-2 9 0 2 2 0 9-2 2-9 0-2-2Z" fill="#e9fbff" stroke="#70bdda" stroke-width="1"/></g></g>` + detail;
    detail = detail.replaceAll('M240 268q14 5 29-6','M240 268q14 5 29-8');
    const blink = (closed: boolean) => `<animate attributeName="visibility" values="${closed ? 'hidden;visible;hidden;hidden' : 'visible;hidden;visible;visible'}" keyTimes="0;.86;.89;1" calcMode="discrete" dur="7s" repeatCount="indefinite"/>`;
    eyes = `<g>${eyes}${blink(false)}</g><g visibility="hidden"><path d="M199 217q19 7 38 0M275 217q19 7 38 0" fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round"/>${blink(true)}</g>`;
  } else if (id === 10) {
    // Split the two authored subpaths to scale each star around its own center.
    eyes = eyes.replace(/<path\b[^>]*d="([^"]+)"[^>]*\/>/g, (tag, d: string) => {
      const parts = d.match(/M[^M]+/g);
      if (!parts || parts.length !== 2) throw new Error('Missing paired star geometry');
      return parts.map((part, i) => `<g transform="translate(${i ? 292 : 220} 215)"><g data-star-eye="${i}">${transform('scale','1;1;1.1;1.1;1;1;1')}<g transform="translate(${i ? -292 : -220} -215)">${tag.replace(d,part)}</g></g></g>`).join('');
    });
    eyes += [183,329].map((x,i) => `<path data-star-spark="${i}" d="M${x} 187l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="#fff3ad" stroke="#bc8e2b" stroke-width="1" opacity="0">${animate('opacity','0;0;1;0;0;0;0', i ? '0;.145;.325;.455;.605;.845;1' : times)}</path>`).join('');
    detail = detail.replace(/<g class="king-mouth">[\s\S]*?<\/g>/, `<g class="king-mouth" data-mouth-motion="10"><ellipse data-star-mouth="true" cx="256" cy="271" rx="10" ry="5" fill="#593342" stroke="#633c25" stroke-width="2">${animate('ry','5;5;12;12;5;5;5','0;.145;.325;.455;.605;.845;1')}</ellipse></g>`);
  } else {
    eyes = '<path data-zen-lids="true" d="M199 216q21 9 42 0M271 216q21 9 42 0" fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round"/><path d="M205 190q15-5 30 0M277 190q15-5 30 0" fill="none" stroke="#a56a42" stroke-width="2" stroke-linecap="round"/>';
    detail = detail.replace(/<g class="king-mouth">[\s\S]*?<\/g>/, `<g class="king-mouth" data-mouth-motion="11"><path d="M246 268q10 3 20 0" fill="none" stroke="#633c25" stroke-width="2.5" stroke-linecap="round">${animate('d','M246 268q10 3 20 0;M246 268q10 3 20 0;M246 268q10 4 20 0;M246 268q10 4 20 0;M246 268q10 5 20 0;M246 268q10 3 20 0;M246 268q10 3 20 0')}</path></g>`);
  }
  return `${start}<g data-eye-motion="${id === 9 ? 'cool' : id === 10 ? 'starshine' : 'serene'}">${eyes}</g>${detail}`;
}
