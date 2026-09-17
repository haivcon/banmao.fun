'use strict';
// Execute the actual BodyLib shell functions, not a separately authored drawing.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const solc=require('solc'),ganache=require('ganache'),{ethers}=require('ethers');
const root=path.resolve(__dirname,'..');
(async()=>{
 const source=fs.readFileSync(path.join(root,'contracts/BanmaoKing/Lib/BanmaoKingBodyLib.sol'),'utf8');
 const functions=['_bananaShell','_peelHighlight','_colors'].map(name=>{
  const start=source.indexOf('    function '+name+'('),end=source.indexOf('\n    }',start);
  assert(start>=0&&end>start);return source.slice(start,end+6);
 }).join('\n');
 const file='contracts/BanmaoKing/Lib/ShellProbe.sol';
 const probe='pragma solidity ^0.8.30; import "./BanmaoKingRoyalLib.sol"; contract ShellProbe { error InvalidBody(uint8 id); '+functions+' function render(uint8 id) external pure returns(string memory) { (string memory peel,string memory shade)=id==13?(BanmaoKingRoyalLib.BODY_COLOR,BanmaoKingRoyalLib.BODY_SHADE):_colors(id); return _bananaShell(shade,_peelHighlight(peel)); } }';
 const out=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources:{[file]:{content:probe}},settings:{optimizer:{enabled:true,runs:200},evmVersion:'shanghai',outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}}),{import:p=>({contents:fs.readFileSync(path.join(root,p),'utf8')})}));
 assert.deepEqual((out.errors||[]).filter(e=>e.severity==='error'),[]);
 const rpc=ganache.provider({logging:{quiet:true}});
 try{
  const provider=new ethers.providers.Web3Provider(rpc);provider.pollingInterval=10;
  const a=out.contracts[file].ShellProbe,c=await new ethers.ContractFactory(a.abi,a.evm.bytecode.object,provider.getSigner()).deploy();await c.deployed();
  const shells=[];for(let i=0;i<15;i++){const svg=await c.render(i);assert(!svg.includes('#fff8a6'));assert.equal((svg.match(/data-shell-reflection=/g)||[]).length,2);shells.push(svg);}
  const target=path.join(root,'app/collection/banmaoking/body-shell-contract.json'),text=JSON.stringify(shells,null,2)+'\n';
  if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8'),text);else fs.writeFileSync(target,text);
  console.log('PASS: 15 canonical shell outputs compiled and executed on EVM');
 }finally{await rpc.disconnect();}
})().catch(e=>{console.error(e);process.exitCode=1;});
