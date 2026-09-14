import { actionShadowSvg, actionTransform, bodySvg } from './artwork';
import { animatedExpressionSvg } from './motion';
import { tokenBadgeSvg } from './badge';
import { ACCESSORY_SVGS, BACKGROUND_SVGS, accessoryRearSvg } from './scene';
import { BODY_TRAITS, BACKGROUND_TRAITS, type BanmaoKingTraitSelection } from './traits';
import { reducedStyle, smilMarkup, smilTargets, optionalSmil } from './smil';

// Scoped IDs prevent multiple preview SVGs from targeting one another.
export function previewSvg(traits: BanmaoKingTraitSelection, tokenId: number, prefix: string): string {
  const body = BODY_TRAITS[traits.body];
  let scene = BACKGROUND_SVGS[traits.background].replaceAll('king-jewel', 'king-bg-jewel');
  scene += `<g class="king-particles" aria-hidden="true" fill="${BACKGROUND_TRAITS[traits.background].accent}"><circle cx="66" cy="180" r="3"/><circle cx="442" cy="260" r="4"/><circle cx="82" cy="376" r="2.5"/><path d="M415 160v12m-6-6h12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="110" cy="100" r="3"/></g>`;
  scene += actionShadowSvg(tokenId);
  if (traits.background !== 0) scene += '<defs><filter id="king-shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#12100d" flood-opacity=".28"/></filter></defs>';
  scene += `<g${traits.background === 0 ? '' : ' filter="url(#king-shadow)"'}><g transform="${actionTransform(tokenId)}"><g class="king-character-motion">${accessoryRearSvg(traits.accessory)}${bodySvg(body.color, body.shade, tokenId).replace(/dur="[\d.]+s"/g, `dur="${[4,2,3.2,2.8,7,2.2,5,6,2.4,7,2.6,8][traits.expression]}s"`)}${animatedExpressionSvg(traits.expression)}${ACCESSORY_SVGS[traits.accessory]}</g></g></g>${tokenBadgeSvg(tokenId, traits.background)}`;
  scene = scene.replace(/<(g|path|ellipse|circle|rect)\b[^<>]*class="([^"]+)"[^<>]*>/g, tag => {
    if (/\bid="/.test(tag)) return tag;
    const classes = tag.match(/class="([^"]+)"/)![1].split(/\s+/);
    const target = smilTargets.find(id => classes.includes(id));
    return target ? tag.replace('class=', `id="smil-${target}" class=`) : tag;
  });
  let halo = 0; scene = scene.replace(/id="smil-king-halo-star"/g, () => `id="smil-king-halo-star${halo++ ? '-' + (halo - 1) : ''}"`);
  let pixel = 0;
  scene = scene.replace(/id="smil-king-pixel"/g, () => `id="smil-king-pixel${pixel++ ? '-' + (pixel - 1) : ''}"`);
  scene = reducedStyle + smilMarkup(traits.expression) + optionalSmil(traits.accessory, traits.background) + scene;
  const present = new Set([...scene.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  // Omit optional-trait references rather than allowing cross-SVG resolution.
  scene = scene.replace(/<animate(?:Transform)?\b[^>]*href="#([^"]+)"[^>]*\/>/g, (tag, id: string) => present.has(id) ? tag : '');
  const ids = [...present];
  for (const id of new Set(ids)) {
    scene = scene.replaceAll(`id="${id}"`, `id="${prefix}-${id}"`).replaceAll(`href="#${id}"`, `href="#${prefix}-${id}"`).replaceAll(`url(#${id})`, `url(#${prefix}-${id})`);
  }
  return scene;
}
