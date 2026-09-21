// Local nested transforms keep each heart anchored; no CSS transform collisions.
export function loveEyesMotion(svg: string): string {
  const timing = 'dur="5.2s" repeatCount="indefinite"';
  const paths = [...svg.matchAll(/<path\b[^>]*d="([^"]+)"[^>]*\/>/g)];
  const hearts = [220, 292].map((x, i) => {
    const shapes = paths.map(([tag, d]) => tag.replace(d, d.split(/(?=M)/)[i])).join('');
    return `<g transform="translate(${x} 215)"><g data-love-heart="${i}"><g transform="translate(${-x} -215)">${shapes}</g><animateTransform attributeName="transform" type="scale" values="1;1;1.28;1;1.22;1;1" keyTimes="0;.12;.2;.28;.36;.48;1" ${timing}/></g></g>`;
  }).join('');
  const blink = `keyTimes="0;.7;.73;.77;1" calcMode="discrete" ${timing}`;
  return `<g class="king-eyes-symbolic" data-love-gaze="true"><g>${hearts}<animate attributeName="visibility" values="visible;hidden;hidden;visible;visible" ${blink}/></g><g visibility="hidden"><path d="M199 218q21-18 42 0M271 218q21-18 42 0" fill="none" stroke="#633c25" stroke-width="4" stroke-linecap="round"/><animate attributeName="visibility" values="hidden;visible;visible;hidden;hidden" ${blink}/></g><animateTransform attributeName="transform" type="translate" values="0 0;0 0;3 -3;-3 2;0 0;0 0" keyTimes="0;.12;.3;.58;.82;1" ${timing}/></g>`;
}

export function loveFloatingHearts(): string {
  return [0, 1, 2].map(i => {
    const x = [178, 334, 256][i], y = [203, 199, 177][i];
    return `<g data-love-float="${i}" opacity="0"><path d="M${x} ${y}c-20-12-8-23 0-13c8-10 20 1 0 13Z" fill="#f58ba3" stroke="#633c25" stroke-width="2"/><animateTransform attributeName="transform" type="translate" values="0 8;0 8;${i === 0 ? -9 : 9} -12;${i === 0 ? -14 : 14} -34;0 8" keyTimes="0;.3;.5;.76;1" begin="${i * .22}s" dur="5.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;.3;.45;.76;1" begin="${i * .22}s" dur="5.2s" repeatCount="indefinite"/></g>`;
  }).join('');
}
