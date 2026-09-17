import { miniCompanionsSvg } from './mini-companions';
import newAccessories from './new-accessories-contract.json';
import { accessoryUpgrade, backgroundUpgrade, themeUpgrade } from './art-upgrade';
import { BIRTHDAY_SCENE_SVG } from './accessory-polish';
import { diamondRays } from './expression-effects';
import { choreographySvg } from './choreography';
import { secondaryMotionSvg } from './secondary-motion';
import { backgroundEffects } from './background-effects';
import { compositionWatermark } from "./composition";
import { actionShadowSvg, actionTransform, bodySvg } from './artwork';
import { animatedExpressionSvg } from './motion';
import { tokenBadgeSvg } from './badge';
import { ACCESSORY_SVGS, BACKGROUND_SVGS, accessoryRearSvg } from './scene';
import { BODY_TRAITS, BACKGROUND_TRAITS, type BanmaoKingTraitSelection } from './traits';
import { particleStyle, smilMarkup, smilTargets, optionalSmil } from './smil';

import { expressionDurations } from './expression-design';
import expansion from "./expansion.json";
import { accessoryLabEffects } from './accessory-lab';
import royal from './royal-contract.json';
import bubbleFlight from './bubble-flight-smil.json';
import titanEye from './titan-eye-contract.json';
import cosmicSuit from './cosmic-suit-contract.json';
import natureSuit from './nature-suit-contract.json';


// Scoped IDs prevent multiple preview SVGs from targeting one another.
export function previewSvg(traits: BanmaoKingTraitSelection, tokenId: number, prefix: string, mini = false): string {
  const body = BODY_TRAITS[traits.body];
  let scene = (traits.background === 16 ? royal.THRONE : traits.background < 8 ? BACKGROUND_SVGS[traits.background] : expansion.backgrounds[traits.background - 8].svg).replaceAll('king-jewel', 'king-bg-jewel');
  scene += `<g class="king-particles" aria-hidden="true" fill="${BACKGROUND_TRAITS[traits.background].accent}"><circle cx="66" cy="180" r="3"/><circle cx="442" cy="260" r="4"/><circle cx="82" cy="376" r="2.5"/><path d="M415 160v12m-6-6h12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="110" cy="100" r="3"/></g>`;
  scene += backgroundEffects(traits.background) + backgroundUpgrade(traits.background);
  if (traits.body >= 5 && traits.body + 3 === traits.background) scene += themeUpgrade(traits.body + 3);
  scene += actionShadowSvg(traits.expression) + secondaryMotionSvg(traits.expression);
  if (traits.background !== 0) scene += '<defs><filter id="king-shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#12100d" flood-opacity=".28"/></filter></defs>';
  if (mini) scene = secondaryMotionSvg(traits.expression);

  scene += `<g${traits.background === 0 ? '' : ' filter="url(#king-shadow)"'}><g id="king-action-root" data-action="${traits.expression}" transform="${actionTransform(traits.expression)}"><g transform="translate(256 490)"><g id="king-volume-motion"><g transform="translate(-256 -490)"><g class="king-character-motion" data-accessory="${traits.accessory}">${(traits.accessory >= 21 ? "" : traits.accessory === 20 ? royal.REAR : traits.accessory < 12 ? accessoryRearSvg(traits.accessory) : expansion.accessories[traits.accessory - 12].rearSvg ?? "")}${bodySvg(body.color, body.shade, tokenId).replace(cosmicSuit, '<!--cosmic-clock-->').replace(natureSuit, '<!--nature-clock-->').replace(/dur="[\d.]+s"/g, `dur="${expressionDurations[traits.expression]}s"`).replace('<!--cosmic-clock-->', cosmicSuit).replace('<!--nature-clock-->', natureSuit)}${traits.expression === 13 ? diamondRays((tokenId % 36 * 7 + 3) % 6) + diamondRays(6 + (Math.floor(tokenId / 6) % 6 * 5 + 1) % 6) : ""}${animatedExpressionSvg(traits.expression)}${traits.body === 4 ? titanEye : ''}${(traits.accessory >= 21 ? newAccessories[traits.accessory - 21] : traits.accessory === 20 ? royal.REGALIA : traits.accessory < 12 ? ACCESSORY_SVGS[traits.accessory] : expansion.accessories[traits.accessory - 12].svg)}${traits.accessory === 12 || traits.accessory === 18 ? accessoryUpgrade(traits.accessory) : ''}${accessoryLabEffects(traits.accessory)}</g></g></g></g></g></g></g>${traits.accessory === 19 ? bubbleFlight[traits.expression] : ''}${traits.accessory === 5 ? BIRTHDAY_SCENE_SVG : ''}${mini ? '' : tokenBadgeSvg(tokenId, traits.background)}${mini ? '' : compositionWatermark(traits)}`;
  scene = scene.replace('<g class="king-character-motion"', '<g id="king-full-turn"><g class="king-character-motion"');
  scene = scene.replace(/<(g|path|ellipse|circle|rect)\b[^<>]*class="([^"]+)"[^<>]*>/g, tag => {
    if (/\bid="/.test(tag)) return tag;
    const classes = tag.match(/class="([^"]+)"/)![1].split(/\s+/);
    const target = smilTargets.find(id => classes.includes(id));
    return target ? tag.replace('class=', `id="smil-${target}" class=`) : tag;
  });
  let halo = 0; scene = scene.replace(/id="smil-king-halo-star"/g, () => `id="smil-king-halo-star${halo++ ? '-' + (halo - 1) : ''}"`);
  let pixel = 0;
  scene = scene.replace(/id="smil-king-pixel"/g, () => `id="smil-king-pixel${pixel++ ? '-' + (pixel - 1) : ''}"`);
  scene = particleStyle + smilMarkup(traits.expression) + choreographySvg(traits.expression) + optionalSmil(traits.accessory < 12 ? traits.accessory : 0, traits.background < 8 ? traits.background : 0) + scene;
  if (traits.body === 13) scene = scene.replace(/<linearGradient id="bk-peel"[\s\S]*?<\/linearGradient>/, royal.PEEL);
  const present = new Set([...scene.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  // Omit optional-trait references rather than allowing cross-SVG resolution.
  scene = scene.replace(/<animate(?:Transform)?\b[^>]*href="#([^"]+)"[^>]*\/>/g, (tag, id: string) => present.has(id) ? tag : '');
  const ids = [...present];
  for (const id of new Set(ids)) {
    scene = scene.replaceAll(`id="${id}"`, `id="${prefix}-${id}"`).replaceAll(`href="#${id}"`, `href="#${prefix}-${id}"`).replaceAll(`url(#${id})`, `url(#${prefix}-${id})`);
  }

  // Paint last, outside main-character transforms: tails and effects cannot cover minis.
  return scene + (traits.accessory === 21 ? miniCompanionsSvg(tokenId, (t, slot) => previewSvg(t, tokenId, `${prefix}-mini-${slot}`, true)) : '');
}
