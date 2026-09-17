'use strict';
// Execute canonical Solidity locally; frontend receives exact returned bytes.
const fs=require('node:fs'),path=require('node:path'),solc=require('solc'),ganache=require('ganache'),{ethers}=require('ethers');
const root=path.resolve(__dirname,'..');
(async()=>{
 const file='contracts/BanmaoKing/Lib/BanmaoKingArtUpgrade.sol';
 const out=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources:{[file]:{content:fs.readFileSync(path.join(root,file),'utf8')}},settings:{optimizer:{enabled:true,runs:200},evmVersion:'shanghai',outputSelection:{'*':{'*':['abi','evm.bytecode.object','evm.deployedBytecode.object']}}}}),{import:p=>{for(const base of [root,path.join(root,'node_modules')]){const f=path.join(base,p);if(fs.existsSync(f))return {contents:fs.readFileSync(f,'utf8')};}return {error:p};}}));
 const errors=(out.errors||[]).filter(e=>e.severity==='error');if(errors.length)throw Error(errors.map(e=>e.formattedMessage).join('\n'));
 const a=out.contracts[file].BanmaoKingArtUpgrade;const size=a.evm.deployedBytecode.object.length/2;if(size>24576)throw Error('Runtime size '+size);
 const rpc=ganache.provider({logging:{quiet:true},chain:{hardfork:'shanghai'},miner:{blockGasLimit:100000000}});
 try{
 const provider=new ethers.providers.Web3Provider(rpc);const c=await new ethers.ContractFactory(a.abi,a.evm.bytecode.object,provider.getSigner()).deploy();await c.deployed();
 const scenes=[];for(let i=0;i<21;i++)scenes.push(await c.bubbles(i,{gasLimit:95000000}));
 const target=path.join(root,'app/collection/banmaoking/bubble-flight-smil.json'),text=JSON.stringify(scenes,null,2)+'\n';
 if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8')!==text)throw Error('Stale frontend flight');}else fs.writeFileSync(target,text);
 console.log('PASS: 21 exact EVM bubble layers; ArtUpgrade runtime '+size+' bytes');
 }finally{await rpc.disconnect();}
})().catch(e=>{console.error(e);process.exitCode=1;});
