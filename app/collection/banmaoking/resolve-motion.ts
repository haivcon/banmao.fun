// Shared face/body beats; complete eye outlines remain visible outside the blink.
export function resolveExpression(svg: string, id: 6 | 7): string {
  const dur = id === 6 ? '5.4' : '6.8';
  const times = '0;.12;.3;.43;.58;.82;1';
  const animate = (name: string, values: string, timing = times) => `<animate attributeName="${name}" values="${values}" keyTimes="${timing}" dur="${dur}s" repeatCount="indefinite"/>`;
  const start = '<g id="expression">';
  const boundary = svg.indexOf(id === 6 ? '<path d="M198 191' : '<g class="king-tears">');
  if (!svg.startsWith(start) || boundary < 0) throw new Error('Missing resolve face anchors');
  const eyes = svg.slice(start.length, boundary);
  let detail = svg.slice(boundary);
  const blinkTimes = id === 6 ? '0;.72;.75;1' : '0;.55;.58;1';
  const visibility = (closed: boolean) => `<animate attributeName="visibility" values="${closed ? 'hidden;visible;hidden;hidden' : 'visible;hidden;visible;visible'}" keyTimes="${blinkTimes}" calcMode="discrete" dur="${dur}s" repeatCount="indefinite"/>`;
  const eyeMotion = `<g data-resolve-eyes="${id}" data-eye-motion="${id === 7 ? 'watery' : 'determined'}">${eyes}${visibility(false)}</g><g visibility="hidden"><path d="M197 217q21 9 42 0M273 217q21 9 42 0" fill="none" stroke="#633c25" stroke-width="3.5" stroke-linecap="round"/>${visibility(true)}</g>`;
  if (id === 6) {
    detail = detail.replace('<path d="M198 191l38 10M314 191l-38 10" stroke="#633c25" stroke-width="4" stroke-linecap="round"/>', `<path d="M198 191l38 10M314 191l-38 10" stroke="#633c25" stroke-width="4" stroke-linecap="round">${animate('d','M198 191l38 10M314 191l-38 10;M198 191l38 10M314 191l-38 10;M198 191l38 12M314 191l-38 12;M198 191l38 12M314 191l-38 12;M198 191l38 12M314 191l-38 12;M198 191l38 10M314 191l-38 10;M198 191l38 10M314 191l-38 10')}</path>`);
    detail = detail.replace(/<g class="king-mouth">([\s\S]*?)<\/g>/, (_, teeth: string) => `<g class="king-mouth" data-mouth-motion="6"><path d="M240 269q16-3 32 0" fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round"/><g opacity="0">${teeth}${animate('opacity','0;0;1;1;1;0;0')}</g></g>`);
  } else {
    const tears = [210,302].map((x, side) => {
      const timing = side ? '0;.2;.3;.42;.55;.62;1' : '0;.16;.26;.38;.5;.57;1';
      return `<path d="M${x-10} 235q10 7 20 0" fill="none" stroke="#83dfff" stroke-width="3.5">${animate('opacity','.5;.7;1;1;.35;.5;.5')}</path><g data-teary-drop="${side}" opacity="0">${animate('opacity','0;0;1;1;1;0;0',timing)}<animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 2;0 16;0 42;0 57;0 57" keyTimes="${timing}" dur="6.8s" repeatCount="indefinite"/><path d="M${x} 236C${x-2} 243 ${x-10} 248 ${x-7} 255Q${x} 265 ${x+7} 255C${x+10} 248 ${x+2} 243 ${x} 236Z" fill="#71d9ff" stroke="#318cb9" stroke-width="1.5"/><path d="M${x-2} 247q-4 6-1 9" fill="none" stroke="#effcff" stroke-width="2.5" stroke-linecap="round"/></g>`;
    }).join('');
    detail = detail.replace(/<g class="king-tears">[\s\S]*?<\/g>/, `<g class="king-tears">${tears}</g>`);
    detail = `<path data-teary-brows="true" d="M197 190q12 2 27-9M288 181q15 11 27 9" fill="none" stroke="#633c25" stroke-width="3.5" stroke-linecap="round"/>` + detail;
    detail = detail.replace(/<g class="king-mouth">[\s\S]*?<\/g>/, `<g class="king-mouth" data-mouth-motion="7"><path d="M239 278q8-14 17-7q9-7 17 7" fill="none" stroke="#633c25" stroke-width="3.5" stroke-linecap="round">${animate('d','M239 278q8-14 17-7q9-7 17 7;M239 278q8-14 17-7q9-7 17 7;M239 280q8-18 17-8q9-10 17 8;M239 279q8-15 17-6q9-9 17 6;M239 278q8-14 17-7q9-7 17 7;M239 278q8-14 17-7q9-7 17 7;M239 278q8-14 17-7q9-7 17 7')}</path></g>`);
  }
  return start + eyeMotion + detail;
}
