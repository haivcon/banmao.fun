'use strict';
// Solidity is authoritative. Never regenerate it from preview artwork.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'contracts/BanmaoKing/Lib/BanmaoKingRoyalLib.sol'), 'utf8');
const data = {};
for (const match of source.matchAll(/string internal constant (\w+) = ("(?:\\.|[^"\\])*");/g)) data[match[1]] = JSON.parse(match[2]);
if (Object.keys(data).length !== 10) throw new Error('Incomplete royal contract catalogue');
const output = JSON.stringify(data, null, 2) + '\n';
const target = path.join(root, 'app/collection/banmaoking/royal-contract.json');
if (process.argv.includes('--check')) {
  if (fs.readFileSync(target, 'utf8') !== output) throw new Error('Run node tools/sync-king-royal.cjs');
} else fs.writeFileSync(target, output);
console.log('Royal Solidity → frontend catalogue synchronized');
