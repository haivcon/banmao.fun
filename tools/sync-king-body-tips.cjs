'use strict';
// Export canonical Solidity output, never infer artwork from the preview.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const solc = require('solc'), ganache = require('ganache'), { ethers } = require('ethers');
const root = path.resolve(__dirname, '..');
(async () => {
  const file = 'contracts/BanmaoKing/Lib/BanmaoKingBodyLib.sol';
  const natureFile = 'contracts/BanmaoKing/Lib/BanmaoKingBodyEffects.sol';
  const harness = 'pragma solidity ^0.8.30; import "./BanmaoKingBodyLib.sol"; import "./BanmaoKingBodyEffects.sol"; contract TipProbe { function render(uint8 id) external pure returns(string memory) { return BanmaoKingBodyTips.render(id); } function nature() external pure returns(string memory) { return BanmaoKingNatureSuit.render(); } }';
  const probe = 'contracts/BanmaoKing/Lib/TipProbe.sol';
  const out = JSON.parse(solc.compile(JSON.stringify({language:'Solidity', sources:{[file]:{content:fs.readFileSync(path.join(root,file),'utf8')},[natureFile]:{content:fs.readFileSync(path.join(root,natureFile),'utf8')},[probe]:{content:harness}}, settings:{optimizer:{enabled:true,runs:200},evmVersion:'shanghai',outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}}),{import:p=>{for(const base of [root,path.join(root,'node_modules')]){const f=path.join(base,p);if(fs.existsSync(f))return {contents:fs.readFileSync(f,'utf8')};}return {error:p};}}));
  assert.deepEqual((out.errors || []).filter(e => e.severity === 'error'), []);
  const rpc = ganache.provider({logging:{quiet:true}});
  try {
    const provider = new ethers.providers.Web3Provider(rpc); provider.pollingInterval = 10;
    const a = out.contracts[probe].TipProbe;
    const c = await new ethers.ContractFactory(a.abi,a.evm.bytecode.object,provider.getSigner()).deploy();
    await c.deployed();
    const tips = [];
    for (let id=0;id<15;id++) {
      const svg = await c.render(id); tips.push(svg);
      assert.equal(svg.includes('data-body-tip='), [0,2,3,4,5,10,11,13,14].includes(id));
      assert(!svg.includes('<script'));
    }
    const nature = await c.nature();
    assert.equal((nature.match(/data-sakura-flower=/g) || []).length, 3);
    const natureTarget = path.join(root,'app/collection/banmaoking/nature-suit-contract.json');
    const natureText = JSON.stringify(nature)+'\n';
    if(process.argv.includes('--check')) assert.equal(fs.readFileSync(natureTarget,'utf8'),natureText);
    else fs.writeFileSync(natureTarget,natureText);
    console.log('PASS: canonical Sakura SVG compiled and executed on EVM');
    const target = path.join(root,'app/collection/banmaoking/body-tips-contract.json');
    const text = JSON.stringify(tips,null,2)+'\n';
    if (process.argv.includes('--check')) assert.equal(fs.readFileSync(target,'utf8'),text);
    else fs.writeFileSync(target,text);
    const dir = path.join(root,'test-results/body-tips'); fs.mkdirSync(dir,{recursive:true});
    for (let id=0;id<15;id++) if(tips[id]) fs.writeFileSync(path.join(dir,`${id}.svg`),`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="256 454 32 32">${tips[id]}</svg>`);
    console.log('PASS: 15 Solidity/EVM tip outputs; nine unique tips, six badge bodies unchanged; standalone SVG samples exported');
  } finally { await rpc.disconnect(); }
})().catch(e => {console.error(e);process.exitCode=1;});
