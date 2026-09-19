// Local eye choreography; no IDs, CSS transforms or filters that diverge on-chain.
export const eyeProfiles: Record<number, { name: string; gaze: string; duration: number; blink: string }> = {
  7: { name: 'watery', gaze: '0 0;-.6 .4;.6 .2;-.4 .5;0 0', duration: 2.8, blink: '0;.72;.74;.77;1' },
  8: { name: 'playful', gaze: '0 0;2 -1;-2 1;1 -1;0 0', duration: 3.4, blink: '0;.8;.815;.84;1' },
  9: { name: 'cool', gaze: '0 0;0 0;2 0;2 0;0 0', duration: 7, blink: '0;.86;.88;.91;1' },
  10: { name: 'starshine', gaze: '0 0;0 -1;0 0;0 -2;0 0', duration: 4.8, blink: '0;.84;.86;.9;1' },
  11: { name: 'serene', gaze: '0 0;0 .3;0 .7;0 .3;0 0', duration: 8, blink: '0;.84;.86;.9;1' },
  12: { name: 'cosmic', gaze: '0 0;1 -2;-1 -2;-1 0;0 0', duration: 6.4, blink: '0;.91;.925;.95;1' },
  13: { name: 'diamond', gaze: '0 0;1 -1;0 0;-1 -1;0 0', duration: 4.6, blink: '0;.86;.875;.9;1' },
  14: { name: 'code-scan', gaze: '0 0;2 0;-2 1;1 1;0 0', duration: 3.6, blink: '0;.93;.94;.96;1' },
  15: { name: 'whistling', gaze: '0 0;4 -4;4 -4;-2 0;0 0', duration: 9, blink: '0;.9;.92;.94;1' },
  16: { name: 'side-eye', gaze: '0 0;-3 0;-3 0;2 -1;0 0', duration: 5.4, blink: '0;.9;.915;.94;1' },
  17: { name: 'angry', gaze: '0 0;1 2;2 2;1 1;0 0', duration: 4.8, blink: '0;.65;.68;.73;1' },
  18: { name: 'resolute', gaze: '0 0;0 -1;0 -1;.5 0;0 0', duration: 3.4, blink: '0;.92;.93;.95;1' },
  19: { name: 'dream-drift', gaze: '0 0;-1 -.5;0 -1;1 -.5;0 0', duration: 10, blink: '0;.84;.86;.9;1' },
  20: { name: 'sovereign', gaze: '0 0;0 -1;1 -1;1 0;0 0', duration: 7.3, blink: '0;.91;.925;.95;1' },
};

export function eyeMotion(svg: string, id: number): string {
  const profile = eyeProfiles[id];
  if (!profile) return svg;
  // These eyes own their internal choreography; their silhouette stays anchored.
  if ([12,13,14,18].includes(id)) return `<g data-eye-motion="${profile.name}">${svg}</g>`;
  let glint = 0;
  // Animate highlights independently, not the dark eye silhouette or skin.
  svg = svg.replace(/<(circle|ellipse|path)\b[^>]*\/>/g, (tag, kind: string) => {
    const royal = /data-eye-glint=/.test(tag);
    const light = /fill="(?:white|#fff8e7|#fffdf1|#fff3ad|#93eaff|#b99aef|#ffe53b|#fff8dc)"/.test(tag);
    if (!royal && !light) return tag;
    const phase = glint++ % 2 ? -.9 : 0;
    const values = id === 7 ? '1;.72;1;.85;1' : '1;.65;1;.8;1';
    return `${tag.slice(0, -2)}><animate attributeName="opacity" values="${values}" keyTimes="0;.25;.5;.75;1" dur="${profile.duration / 2}s" begin="${phase}s" repeatCount="indefinite"/></${kind}>`;
  });
  return `<g data-eye-motion="${profile.name}">${svg}<animateTransform attributeName="transform" type="translate" additive="sum" values="${profile.gaze}" keyTimes="0;.25;.5;.75;1" calcMode="spline" keySplines=".4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1" dur="${profile.duration}s" repeatCount="indefinite"/></g>`;
}
