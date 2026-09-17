'use strict';
// Execute canonical Solidity on a local EVM before exporting the preview.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const solc=require('solc'),ganache=require('ganache'),{ethers}=require('ethers');
const root=path.resolve(__dirname,'..');
(async()=>{
 const file='contracts/BanmaoKing/Lib/BanmaoKingBodyEffects.sol';
 const probe='contracts/BanmaoKing/Lib/TitanProbe.sol';
 const out=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources:{[file]:{content:fs.readFileSync(path.join(root,file),'utf8')},[probe]:{content:'pragma solidity ^0.8.30; import "./BanmaoKingBodyEffects.sol"; contract TitanProbe { function render() external pure returns(string memory) { return BanmaoKingTitanSuit.render(); } function eye() external pure returns(string memory) { return BanmaoKingTitanSuit.eye(); } }'}},settings:{optimizer:{enabled:true,runs:200},evmVersion:'shanghai',outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}}),{import:p=>{for(const base of [root,path.join(root,'node_modules')]){const f=path.join(base,p);if(fs.existsSync(f))return {contents:fs.readFileSync(f,'utf8')};}return {error:p};}}));
 assert.deepEqual((out.errors||[]).filter(e=>e.severity==='error'),[]);
 const rpc=ganache.provider({logging:{quiet:true}});
 try {
  const provider=new ethers.providers.Web3Provider(rpc);provider.pollingInterval=10;
  const a=out.contracts[probe].TitanProbe;
  const c=await new ethers.ContractFactory(a.abi,a.evm.bytecode.object,provider.getSigner()).deploy();await c.deployed();
  const svg=await c.render();assert.equal((svg.match(/data-titan-plate=/g)||[]).length,3);
  const target=path.join(root,'app/collection/banmaoking/titan-suit-contract.json'),text=JSON.stringify(svg)+'\n';
  if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8'),text);else fs.writeFileSync(target,text);
  const eye=await c.eye();assert.equal((eye.match(/data-titan-eye=/g)||[]).length,1);
  const eyeTarget=path.join(root,'app/collection/banmaoking/titan-eye-contract.json'),eyeText=JSON.stringify(eye)+'\n';
  if(process.argv.includes('--check'))assert.equal(fs.readFileSync(eyeTarget,'utf8'),eyeText);else fs.writeFileSync(eyeTarget,eyeText);
  console.log('PASS: canonical Titan armor and machine eye compiled, executed and preview verified');
 } finally {await rpc.disconnect();}
})().catch(e=>{console.error(e);process.exitCode=1;});
