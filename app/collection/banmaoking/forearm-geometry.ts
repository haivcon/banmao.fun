// Match the palm's local attachment and tangent, not a visible circular joint.
// Shoulder anchors and held-object sockets remain unchanged.
export function forearmGeometry(side: 'left' | 'right', wrist: number, shoulder: number, gripping = false) {
  const left = side === 'left';
  const x = left ? 143 : 369;
  // A held prop and its palm form a rigid socket; only the shoulder lifts it.
  // Match the grip-only wrist override in the neutral rig, including in-between frames.
  // The grip follows the shoulder-to-palm axis rather than pointing down.
  const angle = (gripping ? (left ? 28 : -28) : (left ? 36 : -36) + wrist) * Math.PI / 180;
  const sin = Math.sin(angle), cos = Math.cos(angle);
  const point = (px: number, py: number) => [x + px * cos - (py + 12) * sin, 345 + px * sin + (py + 12) * cos];
  // Palm is enlarged about its attachment pivot, not about the SVG origin.
  const outer = point(left ? -11 : 11, -16.4);
  const inner = point(left ? 11 : -11, -16.4);
  const center = point(0, -12);
  const tangent = (p: number[]) => [p[0] + 12 * sin, p[1] - 12 * cos];
  const format = (p: number[]) => p.map(v => Number(v.toFixed(2))).join(' ');
  // Gripping arms use a straighter forearm to avoid ugly bending at extreme rotations.
  const bend = gripping ? 0 : Math.min(4.5, Math.abs(shoulder) / 30) * (left ? -1 : 1);
  const start = left ? '164 302' : '348 302';
  const end = left ? '184 310' : '328 310';
  // Two smooth cubic spans give the arm a rounded belly instead of a wedge.
  const midOuter = [(left ? 145 : 367) + bend, 315];
  const midInner = [(left ? 173 : 339) + bend, 320];
  const sign = left ? -1 : 1;
  const outerCurve = `M${start}C${format([left ? 150 : 362, 300])} ${format([midOuter[0] - sign * 2, 310])} ${format(midOuter)}C${format([midOuter[0] + sign * 2, 320])} ${format(tangent(outer))} ${format(outer)}`;
  const innerCurve = `C${format(tangent(inner))} ${format([midInner[0] + sign * 2, 325])} ${format(midInner)}C${format([midInner[0] - sign * 2, 315])} ${format([left ? 180 : 332, 318])} ${end}`;
  // The cap stays under the opaque palm. Only the two exposed sides are stroked.
  return {
    fill: `${outerCurve}Q${format(center)} ${format(center)}Q${format(center)} ${format(inner)}${innerCurve}Z`,
    contour: `${outerCurve}M${format(inner)}${innerCurve}`,
  };
}
