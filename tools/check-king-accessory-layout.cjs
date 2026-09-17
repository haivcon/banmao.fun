'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),solc=require('solc'),ganache=require('ganache'),{ethers}=require('ethers');
const root=path.resolve(__dirname,'..');
(async()=>{
 const file='contracts/BanmaoKing/Lib/BanmaoKingAccessoryLib.sol';
 const out=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources:{[file]:{content:fs.readFileSync(path.join(root,file),'utf8')}},settings:{optimizer:{enabled:true,runs:200},evmVersion:'shanghai',outputSelection:{'*':{'*':['abi','evm.bytecode.object','evm.deployedBytecode.object']}}}}),{import:p=>{for(const base of [root,path.join(root,'node_modules')]){const f=path.join(base,p);if(fs.existsSync(f))return{contents:fs.readFileSync(f,'utf8')};}return{error:p};}}));
 assert.deepEqual((out.errors||[]).filter(e=>e.severity==='error'),[]);
 const artifacts=Object.assign({},...Object.values(out.contracts));
 for(const [name,a]of Object.entries(artifacts)){const size=a.evm.deployedBytecode.object.length/2;assert(size<=24576,`${name}: ${size}`);if(name.startsWith('BanmaoKingAccessory'))console.log(name,'runtime',size);}
 const rpc=ganache.provider({logging:{quiet:true},chain:{hardfork:'shanghai'},miner:{blockGasLimit:100000000}});
 try{
 const provider=new ethers.providers.Web3Provider(rpc);provider.pollingInterval=10;
 async function deploy(name,args=[]){const a=artifacts[name],f=new ethers.ContractFactory(a.abi,a.evm.bytecode.object,provider.getSigner());assert((f.getDeployTransaction(...args).data.length-2)/2<=49152,name+' initcode');return(await f.deploy(...args,{gasLimit:90000000})).deployed();}
 const royal=await deploy('BanmaoKingRoyalAccessory'),expansion=await deploy('BanmaoKingAccessoryExpansion'),base=await deploy('BanmaoKingAccessoryLib',[royal.address,expansion.address]);
 const expected=JSON.parse(fs.readFileSync(path.join(root,'app/collection/banmaoking/new-accessories-contract.json'),'utf8'));
 for(let id=21;id<=22;id++){assert.equal(await base.render(id),expected[id-21]);assert.equal(await expansion.render(id),expected[id-21]);assert.equal(await base.renderRear(id),'');assert.equal(await base.traitName(id),['Mini Companions','Boxing Gloves'][id-21]);}
 // BasePart contains the exact six original return literals; compare locally executed bytes with those literals.
 const source=fs.readFileSync(path.join(root,file),'utf8').split('contract BanmaoKingAccessoryBasePart {')[1];
 for(let id=1;id<=6;id++){const literal=source.match(new RegExp('if \\(id == '+id+'\\) return (".*");'))[1];assert.equal(await base.render(id),JSON.parse(literal));}
 for(const id of [23,24,255]){await assert.rejects(base.render(id));await assert.rejects(base.traitName(id));await assert.rejects(base.renderRear(id));}
 assert.equal(await base.traitName(19),'Bubble Blaster');assert.equal(await base.traitName(20),'Imperial Regalia');
 console.log('PASS: accessory graph deployed with standard size limits; exact base/extra SVG, names, rear layers and invalid IDs');
 }finally{await rpc.disconnect();}
})().catch(e=>{console.error(e);process.exitCode=1;});
