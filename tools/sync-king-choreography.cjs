'use strict';
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'contracts/BanmaoKing/Lib/BanmaoKingChoreography.sol'), 'utf8');
const keys = ['name','duration','left','right','footLeft','footRight','lean','lift','tail'];
const profiles = [...source.matchAll(/return Profile\(([^)]+)\);/g)].map(m => {
  const values = [...m[1].matchAll(/"([^"]*)"/g)].map(v => v[1]);
  if(values.length !== keys.length) throw Error('Invalid profile');
  return Object.fromEntries(keys.map((key,i) => [key,values[i]]));
});
if(profiles.length !== 21) throw Error('Expected 21 expression profiles');
for(const profile of profiles) for(const key of keys.slice(2)) {
  const beats = profile[key].split(';');
  if(beats.length !== 7 || beats.some(v => !Number.isFinite(Number(v))) || beats[0] !== beats[6]) throw Error('Invalid loop: '+key);
}
const output = JSON.stringify(profiles,null,2)+'\n';
const target = path.join(root,'app/collection/banmaoking/choreography.json');
if(process.argv.includes('--check')) { if(fs.readFileSync(target,'utf8') !== output) throw Error('Run sync-king-choreography.cjs'); }
else fs.writeFileSync(target,output);
const anatomy = fs.readFileSync(path.join(root,'contracts/BanmaoKing/Lib/BanmaoKingAnatomyPart.sol'),'utf8');
const parts = [...anatomy.matchAll(/return (".*");}/g)].map(m => JSON.parse(m[1]));
if(parts.length !== 2) throw Error('Expected neutral rig layers');
const rigTarget = path.join(root,'app/collection/banmaoking/neutral-rig.json');
const rig = JSON.stringify({rear:parts[0],front:parts[1]},null,2)+'\n';
if(process.argv.includes('--check')) { if(fs.readFileSync(rigTarget,'utf8') !== rig) throw Error('Neutral rig out of sync'); }
else fs.writeFileSync(rigTarget,rig);
console.log('21 Solidity choreography profiles and neutral rig synchronized');
