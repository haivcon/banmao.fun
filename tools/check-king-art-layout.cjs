'use strict';
// Local baseline/verification for source-only artwork relocation. No public RPC.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),solc=require('solc');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'test-results/art-layout');
const sources={};
for(const folder of ['Lib','Renderer','NFT'])for(const f of fs.readdirSync(path.join(root,'contracts/BanmaoKing',folder)))if(f.endsWith('.sol')){
 const p=`contracts/BanmaoKing/${folder}/${f}`;sources[p]={content:fs.readFileSync(path.join(root,p),'utf8')};
}
const out=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources,settings:{optimizer:{enabled:true,runs:200},evmVersion:'shanghai',metadata:{bytecodeHash:'none'},outputSelection:{'*':{'*':['abi','evm.bytecode.object','evm.deployedBytecode.object']}}}}),{import:p=>{for(const base of [root,path.join(root,'node_modules')]){const f=path.join(base,p);if(fs.existsSync(f))return{contents:fs.readFileSync(f,'utf8')};}return{error:p};}}));
assert.deepEqual((out.errors||[]).filter(e=>e.severity==='error'),[]);
const records={};
for(const contracts of Object.values(out.contracts))for(const [name,a]of Object.entries(contracts)){
 const runtime=a.evm.deployedBytecode.object,init=a.evm.bytecode.object;
 const args=(a.abi.find(x=>x.type==='constructor')?.inputs||[]).reduce((n,x)=>n+32*Number(x.type.match(/\[(\d+)\]$/)?.[1]||1),0);
 if(runtime.length/2>24576||init.length/2+args>49152)console.warn(`SIZE BLOCKER ${name}: runtime=${runtime.length/2}, init=${init.length/2+args}`);
 records[name]={abi:a.abi,runtime,init,runtimeBytes:runtime.length/2,initBytes:init.length/2+args};
}
fs.mkdirSync(dir,{recursive:true});const target=path.join(dir,'baseline.json');
if(process.argv.includes('--baseline'))fs.writeFileSync(target,JSON.stringify(records,null,2)+'\n');
else {const baseline=JSON.parse(fs.readFileSync(target,'utf8'));for(const [name,a]of Object.entries(baseline)){
 assert(records[name],`Missing ${name}`);
 const changed=['BanmaoKingAccessoryLib','BanmaoKingAccessoryExpansion'].includes(name);
 if(!changed)assert.deepEqual(records[name].abi,a.abi,`ABI changed: ${name}`);
 else for(const item of a.abi){const actual=records[name].abi.find(x=>x.type===item.type&&x.name===item.name);assert(actual,`Missing ABI ${name}.${item.name}`);assert.deepEqual(item.stateMutability?{...actual,stateMutability:item.stateMutability}:actual,item);}
 // Internal libraries retain their namespaces; compiler metadata paths are excluded.
 if(!['BanmaoKingAccessoryLib','BanmaoKingAccessoryExpansion'].includes(name)){
 assert.equal(records[name].runtime,a.runtime,`Runtime changed: ${name}`);
 assert.equal(records[name].init,a.init,`Initcode changed: ${name}`);
 }
}assert.deepEqual(Object.keys(records).filter(n=>!['BanmaoKingAccessoryBasePart','BanmaoKingAccessoryExtraPart'].includes(n)).sort(),Object.keys(baseline).sort());}
fs.writeFileSync(path.join(dir,'sizes.json'),JSON.stringify(Object.fromEntries(Object.entries(records).map(([n,a])=>[n,{runtime:a.runtimeBytes,init:a.initBytes}])),null,2)+'\n');
console.log(`PASS: ${Object.keys(records).length} artifacts inspected${process.argv.includes('--baseline')?'; baseline captured':'; unchanged executable bytecode outside accessory partitions'}`);
const failures=Object.entries(records).filter(([,a])=>a.runtimeBytes>24576||a.initBytes>49152);
if(!process.argv.includes('--baseline')&&failures.length){console.error('FAIL deployment limits: '+failures.map(([n])=>n).join(', '));process.exitCode=1;}
