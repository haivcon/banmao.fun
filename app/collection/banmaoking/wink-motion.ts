// Canonical Wink face. Static attributes retain the authored wink when SMIL
// is unavailable; animated eyes use a clipping lid, never a squashed highlight.
export const winkDuration = 4.6;
const times = '0;.23;.27;.36;.42;1';
const ease = Array(5).fill('.4 0 .6 1').join(';');
function animate(attribute: string, values: string, discrete = false) {
  return `<animate attributeName="${attribute}" values="${values}" keyTimes="${times}" calcMode="${discrete ? 'discrete' : 'spline'}"${discrete ? '' : ` keySplines="${ease}"`} dur="${winkDuration}s" repeatCount="indefinite"/>`;
}

export function winkExpression(svg: string): string {
  const start = '<g id="expression">';
  const nose = svg.indexOf('<path d="M256 240');
  const eyes = svg.slice(start.length, nose);
  const closed = eyes.match(/^<path[^>]+\/>/)?.[0];
  if (!closed || nose < 0) throw new Error('Missing authored Wink eye geometry');
  const right = eyes.slice(closed.length);
  const left = `<defs><clipPath id="king-wink-clip" clipPathUnits="userSpaceOnUse"><rect data-wink-aperture="true" x="195" y="190" width="50" height="50">${animate('y', '190;190;219;219;190;190')}${animate('height', '50;50;0;0;50;50')}</rect></clipPath></defs><g data-wink-open="left" visibility="hidden">${animate('visibility', 'visible;visible;visible;visible;visible;visible', true)}<g clip-path="url(#king-wink-clip)"><ellipse cx="220" cy="215" rx="19" ry="23" fill="#29243b"/><circle cx="214" cy="208" r="5" fill="#fff8e7"/></g></g><g class="king-wink-left" data-wink-lid="left">${closed}${animate('visibility', 'hidden;hidden;visible;visible;hidden;hidden', true)}</g>`;
  let detail = svg.slice(nose);
  // One smile accent; the tongue only peeks out during the held wink.
  detail = detail.replace('<g class="king-mouth">', '<g class="king-mouth" data-mouth-motion="2">')
    .replace(/<path\b[^>]*d="M240 265q15 12 31-3"[^>]*\/>/, tag => tag.slice(0, -2) + `>${animate('d', 'M240 265q15 12 31-3;M240 265q15 12 31-3;M240 265q15 16 31-6;M240 265q15 16 31-6;M240 265q15 12 31-3;M240 265q15 12 31-3')}</path>`)
    .replace(/<path\b[^>]*fill="#ef91a1"[^>]*\/>/, tag => `<g data-wink-tongue="true">${tag}${animate('opacity', '0;0;1;1;0;0')}</g>`)
    .replace(/<ellipse\b[^>]*fill="#ef8b8b"[^>]*opacity=".3"[^>]*\/>/g, tag => tag.slice(0, -2) + `>${animate('opacity', '.3;.3;.52;.52;.3;.3')}</ellipse>`);
  const sparkle = `<g transform="translate(324 207)"><g data-wink-sparkle="true">${animate('opacity', '0;0;1;.65;0;0')}<g><animateTransform attributeName="transform" type="scale" values=".7;.7;1.15;1;.7;.7" keyTimes="${times}" dur="${winkDuration}s" repeatCount="indefinite"/><g><animateTransform attributeName="transform" type="rotate" values="0;0;15;10;0;0" keyTimes="${times}" dur="${winkDuration}s" repeatCount="indefinite"/><path d="M0-9L2-2L9 0L2 2L0 9L-2 2L-9 0L-2-2Z" fill="#ffe6a2" stroke="#633c25" stroke-width="1.5"/></g></g></g></g>`;
  detail = detail.replace(/(<g class="king-expression-detail" data-detail="2">)[\s\S]*?<\/g>/, `$1${sparkle}</g>`);
  return `${start}${left}<g data-wink-open="right">${right}</g>${detail}`;
}
