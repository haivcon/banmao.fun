import { utils } from 'ethers';
import type { BanmaoKingTraitSelection } from './traits';

// Mirrors BanmaoKingRenderer.miniTraits; separate seed domain per companion.
export function miniTraits(tokenId: number, slot: number): BanmaoKingTraitSelection {
  if (!Number.isSafeInteger(tokenId) || tokenId < 0 || (slot !== 0 && slot !== 1)) throw new RangeError('Invalid mini seed');
  const seed = BigInt(utils.keccak256(utils.defaultAbiCoder.encode(['string', 'uint256', 'uint8'], ['banmao-mini-v1', tokenId, slot])));
  let accessory = Number((seed >> 128n) % 22n);
  if (accessory >= 21) accessory++;
  return { body: Number(seed % 15n), expression: Number((seed >> 64n) % 21n), accessory, background: 0 };
}

export function miniCompanionsSvg(tokenId: number, render: (traits: BanmaoKingTraitSelection, slot: number) => string): string {
  return [0, 1].map(slot => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">' + render(miniTraits(tokenId, slot), slot) + '</svg>';
    const image = utils.base64.encode(utils.toUtf8Bytes(svg));
    return `<image data-mini="${slot}" x="${slot === 0 ? 24 : 348}" y="334" width="140" height="140" href="data:image/svg+xml;base64,${image}"/>`;
  }).join('');
}
