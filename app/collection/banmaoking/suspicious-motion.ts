// Suspicious expression (ID 16): asymmetric squinting side-eye with animated brows,
// independent pupil gaze, mouth morph, and "?" detail with scale/rotate.
// Follows the same self-contained pattern as whistling-motion.ts.
export function suspiciousExpression(_whiskers: string, animated = false): string {
  const dur = 5.4; // matches expressionDurations[16]
  const times = '0;.25;.5;.75;1';
  const animate = (attribute: string, values: string, timing = times) =>
    animated ? `<animate attributeName="${attribute}" values="${values}" keyTimes="${timing}" dur="${dur}s" repeatCount="indefinite"/>` : '';
  const move = (type: string, values: string, timing = times) =>
    animated ? `<animateTransform attributeName="transform" type="${type}" values="${values}" keyTimes="${timing}" calcMode="spline" keySplines=".4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1" dur="${dur}s" repeatCount="indefinite"/>` : '';
  const moveLinear = (type: string, values: string, timing = times) =>
    animated ? `<animateTransform attributeName="transform" type="${type}" values="${values}" keyTimes="${timing}" dur="${dur}s" repeatCount="indefinite"/>` : '';
  const blink = (closed: boolean) =>
    animated ? `<animate attributeName="visibility" values="${closed ? 'hidden;visible;hidden;hidden;hidden' : 'visible;hidden;visible;visible;visible'}" keyTimes="0;.9;.915;.94;1" calcMode="discrete" dur="${dur}s" repeatCount="indefinite"/>` : '';

  // ── Left eye: nheo (squinted), ry=8 ──
  // Extra squint at ~50%: ry animates 8→8→5→8→8 (brief extra squeeze)
  const leftEye = `<ellipse data-suspect-eye="left" cx="218" cy="220" rx="19" ry="8" fill="#29243b">${animate('ry', '8;8;5;8;8')}</ellipse>` +
    `<defs><clipPath id="suspect-clip-218"><ellipse cx="218" cy="220" rx="18" ry="7">${animate('ry', '7;7;4;7;7')}</ellipse></clipPath></defs>` +
    `<g clip-path="url(#suspect-clip-218)">` +
      `<g data-suspect-gaze="218">${move('translate', '0 0;-2 0;-2 0;1 0;0 0')}` +
        `<ellipse cx="225" cy="218" rx="2.4" ry="2.4" fill="#fff8e7">${animate('opacity', '1;.65;1;.8;1')}</ellipse>` +
      `</g>` +
    `</g>`;

  // ── Right eye: mở to (alert), ry=17 — pupil liếc riêng biệt ──
  const rightEye = `<ellipse data-suspect-eye="right" cx="294" cy="213" rx="19" ry="17" fill="#29243b"/>` +
    `<defs><clipPath id="suspect-clip-294"><ellipse cx="294" cy="213" rx="18" ry="16"/></clipPath></defs>` +
    `<g clip-path="url(#suspect-clip-294)">` +
      `<g data-suspect-gaze="294">${move('translate', '0 0;-4 0;-4 0;3 -1;0 0')}` +
        `<ellipse cx="300" cy="208.75" rx="5" ry="5" fill="#fff8e7">${animate('opacity', '1;.65;1;.8;1', '0;.25;.5;.75;1')}</ellipse>` +
      `</g>` +
    `</g>`;

  // ── Eyebrows: animate d for nhíu trái / nhướng phải ──
  const browRestL = 'M197 203l39 4';
  const browPeakL = 'M197 206l39 4'; // hạ 3px
  const browRestR = 'M276 187q18-6 37 3';
  const browPeakR = 'M276 185q18-8 37 3'; // nhướng 2px
  const brows = `<path data-suspect-brow="left" d="${browRestL}" fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${animate('d', `${browRestL};${browPeakL};${browPeakL};${browRestL};${browRestL}`)}</path>` +
    `<path data-suspect-brow="right" d="${browRestR}" fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${animate('d', `${browRestR};${browPeakR};${browPeakR};${browRestR};${browRestR}`)}</path>`;

  // ── Eyes open group ──
  const eyesOpen = `<g data-suspect-open="true">${leftEye}${rightEye}${brows}${blink(false)}</g>`;

  // ── Bất đối xứng blink: mí trái thấp (nheo), mí phải bình thường ──
  const lidLeft = 'M197 220q21 5 42 0'; // cong ít hơn — giữ nét nheo
  const lidRight = 'M273 217q21 9 42 0'; // cong bình thường
  const eyesClosed = `<g data-suspect-blink="true" visibility="hidden"><path d="${lidLeft}M${lidRight.slice(1)}" fill="none" stroke="#633c25" stroke-width="3.5" stroke-linecap="round"/>${blink(true)}</g>`;

  // ── Nose ──
  const nose = '<path d="M256 240l-9 7 9 8 9-8z" fill="#df7e82" stroke="#784727" stroke-width="2"/>';

  // ── Mouth morph: rest → méo mạnh hơn khi liếc ──
  const mouthRest = 'M241 270l9-3 9 5 12-6';
  const mouthPeak = 'M241 270l9-5 9 7 12-8'; // méo mạnh hơn
  const mouth = `<g class="king-mouth" data-mouth-motion="16">` +
    `${moveLinear('translate', '0 0;1 -1;1 -1;0 0;0 0')}` +
    `<path data-suspect-mouth="true" d="${mouthRest}" fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${animate('d', `${mouthRest};${mouthPeak};${mouthPeak};${mouthRest};${mouthRest}`)}</path>` +
    `</g>`;

  // ── Detail: "?" with scale/rotate animation ──
  const questionMark = '<path d="M327 182q0-9 9-6q9 4-2 11v5m0 5v1" fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
  const qTiming = '0;.2;.28;.55;.72;1';
  const detail = `<g class="king-expression-detail" data-detail="16">` +
    `<g transform="translate(334 195)">` +
      `<g data-suspect-question="true"${animated ? '' : ' opacity=".8"'}>` +
        `${animate('opacity', '0;0;1;.75;0;0', qTiming)}` +
        `<g>${moveLinear('scale', '.7;.7;1.1;1;.7;.7', qTiming)}` +
          `<g>${moveLinear('rotate', '0;0;-15;10;0;0', qTiming)}` +
            `<g transform="translate(-334 -195)">${questionMark}</g>` +
          `</g>` +
        `</g>` +
      `</g>` +
    `</g>` +
  `</g>`;

  // ── Whisker groups (must maintain <g data-whisker-mood> nesting for test regex) ──
  const wTiming = '0;.5;1';
  const whiskerLeft = '<g data-whisker-mood="16"><path class="king-whiskers-left" d="M211 253Q189 247 169 243M211 260Q187 260 164 260M211 267Q189 273 169 277" fill="none" stroke="#784727" stroke-width="2.5" stroke-linecap="round" opacity=".78"/>' +
    `${moveLinear('rotate', '0 211 260;-3 211 260;0 211 260', wTiming)}` +
    '</g>';
  const whiskerRight = '<g data-whisker-mood="16"><path class="king-whiskers-right" d="M301 253Q323 247 343 243M301 260Q325 260 348 260M301 267Q323 273 343 277" fill="none" stroke="#784727" stroke-width="2.5" stroke-linecap="round" opacity=".78"/>' +
    `${moveLinear('rotate', '0 301 260;3 301 260;0 301 260', wTiming)}` +
    '</g>';
  const whiskerGroup = `<g class="king-whiskers">${whiskerLeft}${whiskerRight}</g>`;

  return `<g id="expression"><g data-eye-motion="side-eye">${eyesOpen}${eyesClosed}</g>${nose}${mouth}${whiskerGroup}${detail}</g>`;
}
