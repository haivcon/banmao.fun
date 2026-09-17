'use strict';
// Contract-first: never overwrite the renderer's canonical artwork from TypeScript.
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..'), check = process.argv.includes('--check');
const canonical = fs.readFileSync(path.join(root, 'contracts/BanmaoKing/Lib/BanmaoKingArtUpgrade.sol'), 'utf8');
const branches = [...canonical.matchAll(/if\(id==39\)return ("(?:[^"\\]|\\.)*");/g)];
if (branches.length !== 1) throw Error('Expected one canonical Bubble Blaster branch');
const BUBBLE_BLASTER_SVG = JSON.parse(branches[0][1]);
if (!BUBBLE_BLASTER_SVG.includes('data-bubble-blaster="true"')) throw Error('Invalid canonical artwork');
function write(file, text) {
  const target = path.join(root, file);
  if (check) { if (fs.readFileSync(target, 'utf8') !== text) throw Error('Out of sync: ' + file); }
  else fs.writeFileSync(target, text);
}
const file = 'app/collection/banmaoking/expansion.json';
const catalogue = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
if (!['Royal Staff', 'Bubble Blaster'].includes(catalogue.accessories[7].name)) throw Error('Unexpected accessory 19');
catalogue.accessories[7] = { ...catalogue.accessories[7], name: 'Bubble Blaster', svg: BUBBLE_BLASTER_SVG };
write(file, JSON.stringify(catalogue, null, 2) + '\n');
write('app/collection/banmaoking/bubble-blaster.ts', '// Generated from BanmaoKingArtUpgrade.sol. Edit Solidity first.\nexport const BUBBLE_BLASTER_SVG = ' + JSON.stringify(BUBBLE_BLASTER_SVG) + ';\n');
for (const [name, id] of [['BanmaoKingAccessoryExpansion', 19]]) {
  const file = `contracts/BanmaoKing/Lib/${name}.sol`;
  let source = fs.readFileSync(path.join(root, file), 'utf8');
  const pattern = new RegExp(`if\\(id==${id}\\)return "<g [^\\r\\n]*";`, 'g');
  if ((source.match(pattern) || []).length !== 1) throw Error('Expected one artwork branch: ' + name);
  source = source.replace(pattern, () => `if(id==${id})return ${JSON.stringify(BUBBLE_BLASTER_SVG)};`);
  if (id === 19) source = source.replace(/if\(id==19\)return "(?:Royal Staff|Bubble Blaster)";/, 'if(id==19)return "Bubble Blaster";');
  write(file, source);
}
console.log('Bubble Blaster preview, name and both Solidity render branches synchronized');
