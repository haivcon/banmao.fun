import { BADGE_TRANSFORM, LOGO_CENTER_X, LOGO_CENTER_Y, identityInk } from './contract-identity';
// Mirrored by BanmaoKingBadgeLib; 75 cells keep animation work bounded.
export const BADGE_GLYPHS = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001010010010', '111101111101111', '111101111001111', '101111101111101'] as const;

function badgeAnimate(attribute: string, base: number, logo: number): string {
  return `<animate attributeName="${attribute}" values="${base};${base};${logo};${logo};${base};${base}" keyTimes="0;.3;.42;.64;.88;1" dur="8s" repeatCount="indefinite"/>`;
}

export function tokenBadgeSvg(tokenId: number | bigint, background = 0): string {
  const id = BigInt(tokenId);
  if (id < BigInt(0) || id > (BigInt(1) << BigInt(256)) - BigInt(1)) throw new RangeError('Invalid token ID');
  const text = id.toString();
  const color = identityInk(background);
  const opening = `<g class="king-token-badge" transform="${BADGE_TRANSFORM}" fill="${color}">`;
  // The collection has 9,216 tokens; public renderer IDs outside it remain readable.
  if (text.length > 4) return `${opening}<title>Token #${text}</title><text x="386" y="40" font-size="8" textLength="112" lengthAdjust="spacingAndGlyphs">#${text}</text></g>`;
  let cells = '';
  for (let i = 0; i < 75; i++) {
    const glyph = Math.floor(i / 15), cell = i % 15;
    const digit = glyph === 0 ? 10 : Number(text[glyph - 1]);
    const visible = glyph <= text.length && BADGE_GLYPHS[digit][cell] === '1' ? 1 : 0;
    const row = Math.floor(cell / 3), column = cell % 3;
    // Extend both crossbars beyond the stems so # does not resemble a ladder.
    const bar = glyph === 0 && (row === 1 || row === 3);
    const x = glyph === 0 ? 386 + (bar ? column * 6 : 3 + column * 3) : 386 + glyph * 22 + column * 5;
    const y = 25 + row * 5;
    const width = bar ? 6 : glyph === 0 ? 3 : 4;
    // Nine visible tiles per cluster; reserve cells split off during scatter for digits.
    const clusterX = ([386, 446, 416, 386, 446][glyph] + LOGO_CENTER_X + cell % 3 * 10) / 2;
    const clusterY = ([14, 14, 44, 74, 74][glyph] + LOGO_CENTER_Y + Math.floor(cell % 9 / 3) * 10) / 2;
    const sx = 384 + Number((id % BigInt(97) + BigInt(i * 17)) % BigInt(111));
    const sy = 14 + (i * 13 + Number(id % BigInt(31))) % 43;
    cells += `<rect x="${x}" y="${y}" width="${width}" height="4" opacity="${visible}" style="--tx:${clusterX - x}px;--ty:${clusterY - y}px;--sx:${sx - x}px;--sy:${sy - y}px;--lit:${visible};--cell-width:${width}px;--logo-lit:${cell < 9 ? 1 : 0}"><animateTransform attributeName="transform" type="translate" values="0 0;0 0;${sx - x} ${sy - y};${clusterX - x} ${clusterY - y};${clusterX - x} ${clusterY - y};${sx - x} ${sy - y};0 0;0 0" keyTimes="0;.2;.3;.42;.64;.76;.88;1" dur="8s" repeatCount="indefinite" additive="sum"/>${badgeAnimate('opacity', visible, cell < 9 ? 1 : 0)}${badgeAnimate('width', width, 4.5)}${badgeAnimate('height', 4, 4.5)}</rect>`;
  }
  return `${opening}<title>Token #${text}</title><g class="king-token-cells">${cells}</g></g>`;
}
