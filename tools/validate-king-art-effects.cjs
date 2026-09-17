'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
// Loads the same TS resolver and first verifies generated sources.
process.argv.push('--check');require('./sync-king-art-effects.cjs');
const solc=require('solc'),ganache=require('ganache'),{ethers}=require('ethers');
const root=path.resolve(__dirname,'..'),load=f=>require(path.join(root,'app/collection/banmaoking',f));
const {animatedExpressionSvg}=load('motion.ts'),{bodySvg}=load('artwork.ts'),{bodyEffects}=load('body-effects.ts'),{backgroundEffects}=load('background-effects.ts'),{smilTargets}=load('smil.ts');
function targets(svg){return svg.replace(/<(g|path|ellipse|circle|rect)\b[^<>]*class="([^"]+)"[^<>]*>/g,tag=>{if(/\bid="/.test(tag))return tag;const classes=tag.match(/class="([^"]+)"/)[1].split(/\s+/),target=smilTargets.find(id=>classes.includes(id));return target?tag.replace('class=',`id="smil-${target}" class=`):tag;});}
async function main(){
 const sources={};for(const f of ['BanmaoKingExpressionLib','BanmaoKingBodyLib','BanmaoKingBackgroundEffects','BanmaoKingArtUpgrade','BanmaoKingAccessoryLib']){const p=`contracts/BanmaoKing/Lib/${f}.sol`;sources[p]={content:fs.readFileSync(path.join(root,p),'utf8')};}
 const rendererPath='contracts/BanmaoKing/Renderer/BanmaoKingRenderer.sol';
 sources[rendererPath]={content:fs.readFileSync(path.join(root,rendererPath),'utf8')};

 const out=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources,settings:{optimizer:{enabled:true,runs:200},evmVersion:'shanghai',outputSelection:{'*':{'*':['abi','evm.bytecode.object','evm.deployedBytecode.object']}}}}),{import:p=>{for(const base of [root,path.join(root,'node_modules')]){const f=path.join(base,p);if(fs.existsSync(f))return{contents:fs.readFileSync(f,'utf8')};}return{error:p};}}));
 assert.equal((out.errors||[]).filter(e=>e.severity==='error').length,0,JSON.stringify(out.errors));
 const artifacts=Object.assign({},...Object.values(out.contracts));
 const sizeFailures=[];
 for(const [name,a]of Object.entries(artifacts)){const runtime=a.evm.deployedBytecode.object.length/2,init=a.evm.bytecode.object.length/2+(a.abi.find(x=>x.type==='constructor')?.inputs||[]).reduce((sum,x)=>sum+32*Number(x.type.match(/\[(\d+)\]$/)?.[1]||1),0);if(runtime>24576||init>49152)sizeFailures.push(`${name}: runtime=${runtime}, init=${init}`);console.log(name,runtime,init);}
 assert.equal(sizeFailures.length,0,'Deployment size limits exceeded:\n'+sizeFailures.join('\n'));
 const rpc=ganache.provider({logging:{quiet:true},miner:{blockGasLimit:100000000}});
 try{
 const provider=new ethers.providers.Web3Provider(rpc);provider.pollingInterval=10;
 async function deploy(name,args=[]){const a=artifacts[name],factory=new ethers.ContractFactory(a.abi,a.evm.bytecode.object,provider.getSigner());const tx=factory.getDeployTransaction(...args);assert((tx.data.length-2)/2<=49152, name+' init + arguments');const deployed=await(await factory.deploy(...args,{gasLimit:90000000})).deployed();console.log('DEPLOY GAS',name,(await deployed.deployTransaction.wait()).gasUsed.toString());return deployed;}
 const {nodes,expression}=await require('./deploy-king-graph.cjs').deployKingGraph(deploy);
 console.log('PASS: complete renderer dependency graph deployed under EIP-170/EIP-3860 limits');
 const accessories=nodes.BanmaoKingAccessoryLib,accessoryExpansion=nodes.BanmaoKingAccessoryExpansion;
 const newAccessories=load('new-accessories-contract.json');
 for(let id=21;id<=22;id++){
  assert.equal(await accessories.render(id),newAccessories[id-21]);
  assert.equal(await accessoryExpansion.render(id),newAccessories[id-21]);
  assert.equal(await accessories.traitName(id),['Mini Companions','Boxing Gloves'][id-21]);
  assert.equal(await accessories.renderRear(id),'');
 }
 for(const id of [23,24,255]){await assert.rejects(accessories.render(id));await assert.rejects(accessories.traitName(id));}
 assert.equal(await accessories.traitName(19),'Bubble Blaster');assert.equal(await accessories.traitName(20),'Imperial Regalia');
 console.log('PASS: migrated accessory routing, SVG bytes, names, rear layers and invalid IDs');
 for(let id=0;id<21;id++)assert.equal(await expression.render(id),targets(animatedExpressionSvg(id)),`expression ${id}`);
 await assert.rejects(expression.render(21));
 const body=await deploy('BanmaoKingBodyEffects'),bg=nodes.BanmaoKingBackgroundEffects,cyborg=await deploy('BanmaoKingCyborgBody');
 for(let id=0;id<15;id++)assert.equal(await body.render(id),bodyEffects(id)); for(let id=0;id<17;id++)assert.equal(await bg.render(id),backgroundEffects(id));
 assert.equal(await cyborg.render(4),targets(bodySvg('#d8d8d8','#777777')));
 await assert.rejects(body.render(15));await assert.rejects(bg.render(17));await assert.rejects(cyborg.render(0));
 const secondaryParts=[];for(let i=0;i<21;i++)secondaryParts.push((await deploy('BanmaoKingSecondaryMotion'+i)).address);
 const secondary=await deploy('BanmaoKingSecondaryMotion',[secondaryParts]);
 for(let id=0;id<21;id++)assert.equal(await secondary.render(id),load('secondary-motion.ts').secondaryMotionSvg(id));
 await assert.rejects(secondary.render(21));
 const upgrade=await deploy('BanmaoKingArtUpgrade');
 const {accessoryUpgrade,backgroundUpgrade,themeUpgrade}=load('art-upgrade.ts');
 for(const id of [0,5]) assert.equal(await upgrade.render(id),backgroundUpgrade(id));
 for(const id of [12,18]) assert.equal(await upgrade.render(id+20),accessoryUpgrade(id));
 const staff=load('expansion.json').accessories[7].svg.replace('<path d="M380 213v204"',accessoryUpgrade(19)+'<path d="M380 213v204"');
 assert(staff.includes('data-accessory-upgrade="19"'),'Staff attachment anchor missing');
 assert.equal(await upgrade.render(39),staff);
 for(let id=8;id<=16;id++) assert.equal(await upgrade.render(48),themeUpgrade(id));
 await assert.rejects(upgrade.render(255));
 console.log('PASS: upgrade EVM parity, staff anchor and renderer bytecode limits');
 console.log('PASS: local EVM exact parity for 21 expressions, 14 body effects, 17 backgrounds, Cyborg; deployment bytecode and invalid IDs');
 }finally{await rpc.disconnect();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
