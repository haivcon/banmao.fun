import { utils } from 'ethers';
import art from './cyborg-contract.json';

/** Public deterministic allocation, not unpredictable mint entropy or an exact quota. */
export function cyborgForm(tokenId: number): 0 | 1 {
  if (!Number.isSafeInteger(tokenId) || tokenId < 0) throw new RangeError('Invalid Cyborg token ID');
  return Number(BigInt(utils.keccak256(utils.defaultAbiCoder.encode(['string', 'uint256'], ['banmao-cyborg-v1', tokenId.toString()]))) & 1n) as 0 | 1;
}
/** Studio samples only; the actual NFT form always comes from cyborgForm(tokenId). */
export const CYBORG_PREVIEW_TOKEN_IDS = [1, 0] as const;

export function cyborgFormName(tokenId: number): string {
  return cyborgForm(tokenId) ? 'Full Machine' : 'Hybrid';
}
export function cyborgFinish(svg: string, tokenId: number): string {
  const full = cyborgForm(tokenId) === 1;
  return `<g data-cyborg-form="${full ? 'full-machine' : 'hybrid'}">${full ? art.fullStyle : ''}${svg}${full ? art.faceSeams : ''}</g>`;
}
export function cyborgExpression(svg: string, expression: number, tokenId: number): string {
  if (!Number.isInteger(expression) || expression < 0 || expression >= 21) throw new RangeError('Invalid Cyborg expression');
  const full = cyborgForm(tokenId) === 1;
  return `${full ? art.fullClip : art.hybridClip}<g clip-path="url(#cyborg-face-clip)">${svg}</g>${full ? art.left[expression] : ''}${art.right[expression]}`;
}
