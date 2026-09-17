import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import expansion from '../app/collection/banmaoking/expansion.json';
import { previewSvg } from '../app/collection/banmaoking/smil-preview';

const svg = expansion.backgrounds[6].svg;
test('Sakura preserves its identity and adds garden depth', () => {
 expect(expansion.backgrounds[6].name).toBe('Sakura Garden');
 expect(svg).toContain('cx="398" cy="87" r="43"');
 expect(svg).toContain('M20 512Q64 337 41 193');
 expect(svg.match(/data-sakura-distant=/g)).toHaveLength(4);
 expect(svg.match(/data-sakura-tree=/g)).toHaveLength(2);
 expect(svg).toContain('data-sakura-path="true"');
 expect(svg.match(/data-sakura-branch=/g)).toHaveLength(4);
 expect(svg.match(/data-wind-petal=/g)).toHaveLength(16);
 expect(svg).toContain('values="0;360"');
 expect(svg).not.toMatch(/<script|foreignObject|<image|href="(?!#)/);
 const source=readFileSync(join(process.cwd(),'contracts/BanmaoKing/Lib/BanmaoKingBackgroundExpansion.sol'),'utf8');
 expect(source).toContain('if(id!=14)revert InvalidTrait(); return BanmaoKingSakuraGarden.render();');
});
test.each([0,7,19,20])('Sakura composes with accessory %i at full and mini sizes',async accessory=>{
 const fragment=previewSvg({body:6,expression:0,accessory,background:14},0,'sakura');
 const ids=[...fragment.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 expect(new Set(ids).size).toBe(ids.length);
 for(const m of fragment.matchAll(/(?:href="#|url\(#)([^"\)]+)/g))expect(ids).toContain(m[1]);
 for(const size of [512,128]){
  const {info}=await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">${fragment}</svg>`)).resize(size,size).png().toBuffer({resolveWithObject:true});
  expect(info.width).toBe(size);
 }
});
