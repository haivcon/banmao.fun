// One long yawn, followed by a drowsy pause. All tracks share the body clock.
const times = '0;.18;.32;.43;.6;.78;1';
function animate(attribute: string, values: string, timing = times) {
  return `<animate attributeName="${attribute}" values="${values}" keyTimes="${timing}" calcMode="spline" keySplines="${Array(6).fill('.4 0 .6 1').join(';')}" dur="8s" repeatCount="indefinite"/>`;
}
export function sleepyExpression(svg: string): string {
  const nose = svg.indexOf('<path d="M256 240');
  if (nose < 0) throw new Error('Missing Sleepy face anchor');
  const eyes = [218,294].map((x,i) => {
    // Reopening is delayed on the right, without changing the loop boundary.
    const timing = i ? '0;.18;.32;.43;.6;.795;1' : times;
    const heights = '24;9;0;0;5;7;24';
    return `<defs><clipPath id="king-sleepy-clip-${i}" clipPathUnits="userSpaceOnUse"><rect data-sleepy-aperture="${i}" x="${x-20}" y="210" width="40" height="24">${animate('y','210;225;234;234;229;227;210',timing)}${animate('height',heights,timing)}</rect></clipPath></defs><g clip-path="url(#king-sleepy-clip-${i})"><ellipse cx="${x}" cy="222" rx="18" ry="12" fill="#29243b"/><ellipse cx="${x-5}" cy="219" rx="3.6" ry="3.6" fill="#fff8e7"/></g><path data-sleepy-lid="${i}" d="M${x-20} 211q20 11 40 0" fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round">${animate('d',`M${x-20} 211q20 11 40 0;M${x-20} 224q20 8 40 0;M${x-20} 230q20 8 40 0;M${x-20} 230q20 8 40 0;M${x-20} 227q20 8 40 0;M${x-20} 225q20 8 40 0;M${x-20} 211q20 11 40 0`,timing)}</path>`;
  }).join('');
  let detail = svg.slice(nose).replace(/<g class="king-mouth">[\s\S]*?<\/g>/,
    `<g class="king-mouth" data-mouth-motion="4"><ellipse data-sleepy-yawn="true" cx="256" cy="272" rx="8" ry="11" fill="#593342">${animate('rx','7;8;12;12;7;7;7')}${animate('ry','2;5;19;19;2;2;2')}</ellipse></g>`);
  // Preserve the authored Z silhouette, but only show it during the drowsy pause.
  detail = detail.replace('data-detail="4">', `data-detail="4">${animate('opacity','0;0;0;0;.7;.3;0')}<animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 0;0 0;2 -3;4 -7;0 0" keyTimes="${times}" dur="8s" repeatCount="indefinite"/>`);
  return `<g id="expression"><g class="king-eyes-rest" data-rest="sleepy">${eyes}</g>${detail}`;
}
