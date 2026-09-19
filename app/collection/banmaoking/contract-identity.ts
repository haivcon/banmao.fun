// Generated from BanmaoKingIdentityLib.sol; do not edit.
export const BADGE_TRANSFORM = "translate(8 8) scale(.8) translate(-386 -25)";
export const WATERMARK_OPEN = "<g class=\"king-composition-watermark\"><text x=\"506\" y=\"505\" text-anchor=\"end\"";
export const WATERMARK_FONT = " font-family=\"monospace\" font-size=\"11\" stroke-width=\"2\" stroke-linejoin=\"round\" paint-order=\"stroke\"";
export const LOGO_CENTER_X = 386;
export const LOGO_CENTER_Y = 25;
export function identityInk(background: number): string { return (background === 3 || background === 4 || background >= 8) ? '#fff4cf' : '#342313'; }
export function identityOutline(background: number): string { return (background === 3 || background === 4 || background >= 8) ? '#24182e' : '#fff8e8'; }
