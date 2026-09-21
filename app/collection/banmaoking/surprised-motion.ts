// Complete eye outlines at rest; pupils and glints never scale with the whites.
export const surprisedDuration = 4.8;
const times = '0;.26;.30;.43;.58;.82;1';
function animate(attribute: string, values: string, timing = times) {
  const count = timing.split(';').length - 1;
  return `<animate attributeName="${attribute}" values="${values}" keyTimes="${timing}" calcMode="spline" keySplines="${Array(count).fill('.4 0 .6 1').join(';')}" dur="4.8s" repeatCount="indefinite"/>`;
}
export function surprisedExpression(svg: string): string {
  const start = '<g id="expression">', nose = svg.indexOf('<path d="M256 240');
  if (!svg.startsWith(start) || nose < 0) throw new Error('Missing Surprised face anchors');
  const authored = svg.slice(start.length, nose);
  const brow = authored.match(/<path\b[^>]*\/>/)?.[0];
  if (!brow) throw new Error('Missing Surprised brow');
  // A brief drawn blink avoids any unoutlined rectangular cut through the eyes.
  const blink = (closed: boolean) => `<animate attributeName="visibility" values="${closed ? 'hidden;visible;hidden;hidden' : 'visible;hidden;visible;visible'}" keyTimes="0;.58;.61;1" calcMode="discrete" dur="4.8s" repeatCount="indefinite"/>`;
  const openEyes = authored.replace(brow,'').replace(/<ellipse\b[^>]*fill="#fff8df"[^>]*\/>/g, tag =>
    tag.slice(0,-2) + ` data-surprised-white="true">${animate('ry','25;25;28;28;25;25;25')}</ellipse>`);
  const closedLids = [218,294].map(x => `<path d="M${x-23} 215q23 12 46 0" fill="none" stroke="#784727" stroke-width="3" stroke-linecap="round"/>`).join('');
  const eyes = `<g data-surprised-open="true">${openEyes}${blink(false)}</g><g data-surprised-lids="true" visibility="hidden">${closedLids}${blink(true)}</g><g data-surprised-brow="true">${brow}<animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 -3;0 -3;0 0;0 0;0 0" keyTimes="${times}" dur="4.8s" repeatCount="indefinite"/></g>`;
  const mouthTimes = '0;.277;.317;.43;.58;.82;1';
  let detail = svg.slice(nose).replace(/<g class="king-mouth">([\s\S]*?)<\/g>/, (_, shapes: string) => {
    shapes = shapes.replace(/<ellipse\b[^>]*\/>/g, tag => {
      if (tag.includes('fill="#482b32"')) return tag.slice(0,-2) + ` data-surprised-mouth="true">${animate('rx','7;7;11;11;7;7;7',mouthTimes)}${animate('ry','8;8;15;15;8;8;8',mouthTimes)}</ellipse>`;
      return tag.slice(0,-2) + `>${animate('opacity','0;0;1;1;0;0;0',mouthTimes)}</ellipse>`;
    });
    return `<g class="king-mouth" data-mouth-motion="5">${shapes}</g>`;
  });
  detail = detail.replace('data-detail="5">', `data-detail="5" data-surprised-drop="true">${animate('opacity','0;0;1;.7;0;0;0')}<animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 0;0 4;0 6;0 0;0 0" keyTimes="${times}" dur="4.8s" repeatCount="indefinite"/>`);
  return `${start}${eyes}${detail}`;
}
