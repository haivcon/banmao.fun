'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const solc=require('solc'),ganache=require('ganache'),{ethers}=require('ethers');
const root=path.resolve(__dirname,'..'),check=process.argv.includes('--check');
(async()=>{
 const file='contracts/BanmaoKing/Lib/BanmaoKingBackgroundExpansion.sol',probe='contracts/BanmaoKing/Lib/SakuraProbe.sol';
 const out=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources:{[file]:{content:fs.readFileSync(path.join(root,file),'utf8')},[probe]:{content:'pragma solidity ^0.8.30; import "./BanmaoKingBackgroundExpansion.sol"; contract SakuraProbe { function render() external pure returns(string memory) { return BanmaoKingSakuraGarden.render(); } }'}},settings:{optimizer:{enabled:true,runs:200},evmVersion:'shanghai',outputSelection:{'*':{'*':['abi','evm.bytecode.object','evm.deployedBytecode.object']}}}}),{import:p=>{for(const base of [root,path.join(root,'node_modules')]){const f=path.join(base,p);if(fs.existsSync(f))return {contents:fs.readFileSync(f,'utf8')};}return {error:p};}}));
 assert.deepEqual((out.errors||[]).filter(e=>e.severity==='error'),[]);
 const rpc=ganache.provider({logging:{quiet:true}});
 try{
  const provider=new ethers.providers.Web3Provider(rpc);provider.pollingInterval=10;
  const a=out.contracts[probe].SakuraProbe;assert(a.evm.deployedBytecode.object.length/2<24576,'EIP-170');
  const c=await new ethers.ContractFactory(a.abi,a.evm.bytecode.object,provider.getSigner()).deploy();await c.deployed();
  const svg=await c.render();assert.equal((svg.match(/data-wind-petal=/g)||[]).length,16);
  const target=path.join(root,'app/collection/banmaoking/expansion.json'),original=fs.readFileSync(target,'utf8'),data=JSON.parse(original);
  if(check)assert.equal(data.backgrounds[6].svg,svg,'Sakura mirror is stale');
  else {
   const before=structuredClone(data);data.backgrounds[6].svg=svg;
   const text=original.replace(JSON.stringify(before.backgrounds[6].svg),JSON.stringify(svg));
   assert.deepEqual(JSON.parse(text),data,'Only Sakura SVG may change');fs.writeFileSync(target,text);
  }
  if(!check){const dir=path.join(root,'test-results/sakura');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'garden.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">'+svg+'</svg>');}
  console.log('PASS: canonical Sakura EVM export; runtime '+a.evm.deployedBytecode.object.length/2+' bytes; '+(check?'mirror verified':'only Sakura mirror updated'));
 }finally{await rpc.disconnect();}
})().catch(e=>{console.error(e);process.exitCode=1;});
