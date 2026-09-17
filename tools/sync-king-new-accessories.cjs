'use strict';
// Export exact contract-returned bytes using an ephemeral EVM, never a wallet.
const fs=require('node:fs'),path=require('node:path'),solc=require('solc'),ganache=require('ganache'),{ethers}=require('ethers');
const root=path.resolve(__dirname,'..');
(async()=>{
 const file='contracts/BanmaoKing/Lib/BanmaoKingAccessoryExpansion.sol';
 const harness='pragma solidity ^0.8.30; import {BanmaoKingNewAccessories} from "'+file+'"; contract Export { function render(uint8 id) external pure returns(string memory){return BanmaoKingNewAccessories.render(id);} }';
 const out=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources:{'Export.sol':{content:harness}},settings:{optimizer:{enabled:true,runs:200},evmVersion:'shanghai',outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}}),{import:p=>({contents:fs.readFileSync(path.join(root,p),'utf8')})}));
 const errors=(out.errors||[]).filter(e=>e.severity==='error');if(errors.length)throw Error(errors.map(e=>e.formattedMessage).join('\n'));
 const rpc=ganache.provider({logging:{quiet:true},chain:{hardfork:'shanghai'}});
 try { const a=out.contracts['Export.sol'].Export,provider=new ethers.providers.Web3Provider(rpc),c=await new ethers.ContractFactory(a.abi,a.evm.bytecode.object,provider.getSigner()).deploy();await c.deployed();
 const rows=[];for(let id=21;id<=22;id++)rows.push(await c.render(id));
 const target=path.join(root,'app/collection/banmaoking/new-accessories-contract.json'),text=JSON.stringify(rows,null,2)+'\n';
 if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8')!==text)throw Error('Stale new accessories');}else fs.writeFileSync(target,text);
 console.log('PASS: accessories 21–22 exported from exact EVM output');
 } finally {await rpc.disconnect();}
})().catch(e=>{console.error(e);process.exitCode=1;});
