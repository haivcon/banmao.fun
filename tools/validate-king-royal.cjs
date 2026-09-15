'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const solc=require('solc'),ganache=require('ganache'),{ethers}=require('ethers');
const root=path.resolve(__dirname,'..');
async function main(){
 const sources={};
 for(const file of ['Lib/BanmaoKingBodyLib.sol','Lib/BanmaoKingAccessoryLib.sol','Lib/BanmaoKingBackgroundExpansion.sol','NFT/BanmaoKingNFT.sol','Renderer/BanmaoKingRenderer.sol']){const p='contracts/BanmaoKing/'+file;sources[p]={content:fs.readFileSync(path.join(root,p),'utf8')};}
 const output=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources,settings:{optimizer:{enabled:true,runs:200},evmVersion:'shanghai',outputSelection:{'*':{'*':['abi','evm.bytecode.object','evm.deployedBytecode.object']}}}}),{import:p=>{for(const base of [root,path.join(root,'node_modules')]){const f=path.join(base,p);if(fs.existsSync(f))return {contents:fs.readFileSync(f,'utf8')};}return {error:p};}}));
 assert.equal((output.errors||[]).filter(e=>e.severity==='error').length,0,JSON.stringify(output.errors));
 const artifacts=Object.assign({},...Object.values(output.contracts));
 for(const [name,a] of Object.entries(artifacts)){if(!name.startsWith('BanmaoKing'))continue;const runtime=a.evm.deployedBytecode.object.length/2,init=a.evm.bytecode.object.length/2;assert(runtime<=24576&&init<=49152,name);console.log(name, runtime, init);}
 const rpc=ganache.provider({logging:{quiet:true},miner:{blockGasLimit:100000000}});
 try{
 const provider=new ethers.providers.Web3Provider(rpc);provider.pollingInterval=10;
 async function deploy(name,args=[]){const a=artifacts[name];return (await new ethers.ContractFactory(a.abi,a.evm.bytecode.object,provider.getSigner()).deploy(...args,{gasLimit:90000000})).deployed();}
 const royal=require(path.join(root,'app/collection/banmaoking/royal-contract.json'));
 const accessory=await deploy('BanmaoKingAccessoryLib'),bg=await deploy('BanmaoKingBackgroundExpansion'),anatomy=await deploy('BanmaoKingAnatomyPart'),body=await deploy('BanmaoKingBodyLib',[anatomy.address]);
 const flower=require(path.join(root,'app/collection/banmaoking/expansion.json')).accessories[6];
 assert.equal(await accessory.renderRear(18),flower.rearSvg);
 assert.equal(await accessory.render(18),flower.svg);
 assert.equal(await accessory.render(20),royal.REGALIA);assert.equal(await accessory.renderRear(20),royal.REAR);assert.equal(await bg.render(16),royal.THRONE);
 assert.equal(await accessory.traitName(20),'Imperial Regalia');assert.equal(await bg.traitName(16),royal.BACKGROUND_NAME);assert.equal(await body.traitName(16),royal.BODY_NAME);
 for(let pose=0;pose<6;pose++){const svg=await body.render(16,pose);assert(svg.includes(royal.PEEL));assert.equal((svg.match(/id="bk-peel"/g)||[]).length,1);}
 await assert.rejects(accessory.render(21));await assert.rejects(accessory.renderRear(21));await assert.rejects(bg.render(17));await assert.rejects(body.render(17,0));
 console.log('PASS: compile, bytecode limits, local deployment, exact royal layer parity, six body poses, invalid IDs');
 }finally{await rpc.disconnect();}
}
main().then(()=>{fs.writeFileSync(path.join(root,'test-results/royal-evm.exit'),'0');}).catch(e=>{console.error(e);fs.writeFileSync(path.join(root,'test-results/royal-evm.exit'),'1');process.exitCode=1;});
