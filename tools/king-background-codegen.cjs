'use strict';
const { contract } = require('./king-svg-codegen.cjs');
// Explicit partitions keep the large Sakura scene isolated. Measure compiled
// bytecode after changing these groups; source length is not a deployment limit.
const sceneGroups = [[8,9,10], [11,12,13,15], [14]];
const effectGroups = [[0,1,2,3,4,5,6,7], [8,9,10,11,12], [13,14,15,16]];
function generate(name, entries, groups, royal = false) {
  const imports = royal ? 'import {BanmaoKingRoyalBackground} from "./BanmaoKingRoyalBackground.sol";\nimport {BanmaoKingRoyalLib} from "./BanmaoKingRoyalLib.sol";\n' : '';
  const parts = groups.map((ids, i) => contract(name+'Part'+i, entries.filter(([id]) => ids.includes(id)))).join('');
  const fields = groups.map((_,i)=>`${name}Part${i} public immutable part${i};`).join('\n');
  const assignments = groups.map((_,i)=>`require(addresses[${i}].code.length>0,"Invalid background part");part${i}=${name}Part${i}(addresses[${i}]);`).join('\n');
  const dispatch = groups.map((ids,i)=>`if(${ids.map(id=>'id=='+id).join('||')})return part${i}.render(id);`).join('\n');
  return imports + parts + `contract ${name} {\nerror InvalidTrait();\n${fields}\n${royal?'BanmaoKingRoyalBackground public immutable royal;':''}
constructor(address[3] memory addresses${royal?',address royal_':''}) {${assignments}
${royal?'require(royal_.code.length>0,"Invalid royal background");royal=BanmaoKingRoyalBackground(royal_);':''}}
function render(uint8 id) external view returns(string memory){
${royal?'if(id==16)return royal.render();':''}
${dispatch}
revert InvalidTrait();}
`;
}
module.exports = { generate, sceneGroups, effectGroups };
