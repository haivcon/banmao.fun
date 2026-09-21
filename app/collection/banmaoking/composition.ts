import { ACCESSORY_IDS, accessoryIndex, BODY_TRAITS, EXPRESSION_TRAITS, ACCESSORY_TRAITS, BACKGROUND_TRAITS, type BanmaoKingTraitSelection } from './traits';
import { WATERMARK_OPEN, WATERMARK_FONT, identityInk, identityOutline } from './contract-identity';
// Body catalog v2 removes old IDs 4–6; no minted-token compatibility is required.
const groups = [BODY_TRAITS.map(t => t.name), EXPRESSION_TRAITS, ACCESSORY_TRAITS, BACKGROUND_TRAITS.map(t => t.name)] as const;
const keys = ['body', 'expression', 'accessory', 'background'] as const;
export function compositionCode(traits: BanmaoKingTraitSelection): string {
  return 'banmao-' + keys.map((key, i) => {
    const id = traits[key];
    if (!Number.isInteger(id) || id < 0 || (key === 'accessory' ? accessoryIndex(id) < 0 : id >= groups[i].length) || id >= 99) throw new Error('Invalid trait ID');
    return String(key === 'accessory' ? id : id + 1).padStart(2, '0');
  }).join('');
}
export function parseCompositionCode(value: string): BanmaoKingTraitSelection {
  const code = value.trim().toLowerCase();
  if (!/^banmao-\d{8}$/.test(code)) throw new Error('Invalid composition code');
  const traits = { body: 0, expression: 0, accessory: 0, background: 0 };
  keys.forEach((key, i) => { traits[key] = Number(code.slice(7 + i * 2, 9 + i * 2)) - (key === 'accessory' ? 0 : 1); });
  compositionCode(traits);
  return traits;
}
export function metadataTraits(attributes: { trait_type: string; value: string }[]): BanmaoKingTraitSelection {
  const traits = { body: 0, expression: 0, accessory: 0, background: 0 };
  keys.forEach((key, i) => {
    const matches = attributes.filter(a => a.trait_type.toLowerCase() === key);
    if (matches.length !== 1) throw new Error('Missing or ambiguous trait');
    const index = groups[i].findIndex(name => name === matches[0].value);
    traits[key] = key === 'accessory' ? (ACCESSORY_IDS[index] ?? -1) : index;
  });
  compositionCode(traits);
  return traits;
}
export function compositionWatermark(traits: BanmaoKingTraitSelection): string {
  return `${WATERMARK_OPEN} fill="${identityInk(traits.background)}" stroke="${identityOutline(traits.background)}"${WATERMARK_FONT}>${compositionCode(traits)}</text></g>`;
}
export function compositionSharePath(traits: BanmaoKingTraitSelection): string {
  return `/collection/banmaoking?code=${compositionCode(traits)}#king-studio`;
}
