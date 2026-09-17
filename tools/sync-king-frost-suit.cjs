'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const solc=require('solc'),ganache=require('ganache'),{ethers}=require('ethers');
const root=path.resolve(__dirname,'..');
(async()=>{
 const file='contracts/BanmaoKing/Lib/BanmaoKingBodyEffects.sol',probe='contracts/BanmaoKing/Lib/FrostProbe.sol';
 const out=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources:{[file]:{content:fs.readFileSync(path.join(root,file),'utf8')},[probe]:{content:'pragma solidity ^0.8.30; import "./BanmaoKingBodyEffects.sol"; contract FrostProbe { function render() external pure returns(string memory) { return BanmaoKingFrostSuit.render(); } }'}},settings:{optimizer:{enabled:true,runs:200},evmVersion:'shanghai',outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}}),{import:p=>{for(const base of [root,path.join(root,'node_modules')]){const f=path.join(base,p);if(fs.existsSync(f))return {contents:fs.readFileSync(f,'utf8')};}return {error:p};}}));
 assert.deepEqual((out.errors||[]).filter(e=>e.severity==='error'),[]);
 const rpc=ganache.provider({logging:{quiet:true}});
 try{
  const provider=new ethers.providers.Web3Provider(rpc);provider.pollingInterval=10;
  const a=out.contracts[probe].FrostProbe,c=await new ethers.ContractFactory(a.abi,a.evm.bytecode.object,provider.getSigner()).deploy();await c.deployed();
  const svg=await c.render();assert(svg.includes('data-frost-suit="true"'));
  const target=path.join(root,'app/collection/banmaoking/frost-suit-contract.json'),text=JSON.stringify(svg)+'\n';
  if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8'),text);else fs.writeFileSync(target,text);
  const dir=path.join(root,'test-results/frost');fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'canonical-effects.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">'+svg+'</svg>');
  console.log('PASS: Frost Solidity compiled and EVM export verified; standalone effects sample exported');
 }finally{await rpc.disconnect();}
})().catch(e=>{console.error(e);process.exitCode=1;});
