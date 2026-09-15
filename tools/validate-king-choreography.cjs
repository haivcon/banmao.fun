'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const solc=require('solc'),ganache=require('ganache'),{ethers}=require('ethers'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,f);
async function main(){
 const file='contracts/BanmaoKing/Lib/BanmaoKingMotionLib.sol';
 const out=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources:{[file]:{content:fs.readFileSync(path.join(root,file),'utf8')}},settings:{optimizer:{enabled:true,runs:200},evmVersion:'shanghai',outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}}),{import:p=>({contents:fs.readFileSync(path.join(root,p.startsWith('@')?'node_modules':'',p),'utf8')})}));
 assert.equal((out.errors||[]).filter(e=>e.severity==='error').length,0,JSON.stringify(out.errors));
 const rpc=ganache.provider({logging:{quiet:true}});
 try {
  const provider=new ethers.providers.Web3Provider(rpc);provider.pollingInterval=10;
  const a=out.contracts[file].BanmaoKingMotionPart1;
  const contract=await (await new ethers.ContractFactory(a.abi,a.evm.bytecode.object,provider.getSigner()).deploy()).deployed();
  const {choreographySvg}=require(path.join(root,'app/collection/banmaoking/choreography.ts'));
  const profiles=require(path.join(root,'app/collection/banmaoking/choreography.json'));
  for(let i=0;i<21;i++){assert.equal(await contract.choreography(i),choreographySvg(i));assert.equal(await contract.actionName(i),profiles[i].name);}
  await assert.rejects(contract.choreography(21));
  console.log('PASS: all 21 EVM choreography strings exactly match frontend; invalid ordinal rejected');
 } finally {await rpc.disconnect();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
