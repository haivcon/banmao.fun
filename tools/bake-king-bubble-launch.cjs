'use strict';
// Build-time only. Read canonical Solidity, never frontend choreography.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,'contracts/BanmaoKing/Lib',f),'utf8');
const choreography=read('BanmaoKingChoreography.sol'),direction=read('BanmaoKingDirection.sol'),secondary=read('BanmaoKingSecondaryMotion.sol');
const profiles=[...choreography.matchAll(/return Profile\(([^\n]+)\);/g)].map(m=>[...m[1].matchAll(/"([^"]*)"/g)].map(x=>x[1]));
if(profiles.length!==21)throw Error('Expected 21 canonical profiles');
function directed(name,id){const section=direction.split('function '+name+'(')[1]?.split('\n}')[0];const values=[...section.matchAll(/return "([^"]*)";/g)].map(m=>m[1]);return values[id];}
const socket=read('BanmaoKingAnatomyPart.sol').match(/smil-king-held-arm\\"\]>g\{transform:translate\(([\d.]+)px,([\d.]+)px\)/);
if(!socket)throw Error('Missing canonical grip socket');
const socketX=Number(socket[1]),socketY=Number(socket[2]);
const list=s=>s.split(';').map(Number),times=[0,.12,.3,.43,.58,.82,1];
function sample(values,t,keys=times,ease=[.4,0,.6,1]){
 let i=0;while(i<keys.length-2&&t>keys[i+1])i++;
 const x=(t-keys[i])/(keys[i+1]-keys[i]);let lo=0,hi=1;
 const bez=(u,a,b)=>3*(1-u)**2*u*a+3*(1-u)*u*u*b+u**3;
 for(let j=0;j<40;j++){const u=(lo+hi)/2;if(bez(u,ease[0],ease[2])<x)lo=u;else hi=u;}
 const f=bez((lo+hi)/2,ease[1],ease[3]);return values[i]+(values[i+1]-values[i])*f;
}
function rotate(p,a,x,y){a*=Math.PI/180;const c=Math.cos(a),s=Math.sin(a);return [x+(p[0]-x)*c-(p[1]-y)*s,y+(p[0]-x)*s+(p[1]-y)*c];}
function launch(id,phase,left){
 const p=profiles[id],arm=sample(list(p[left?2:3]),phase,list(directed(left?'leftTime':'rightTime',id)),directed('ease',id).split(' ').map(Number));
 const lean=sample(list(p[6]),phase),lift=sample(list(p[7]),phase);
 const part=secondary.split('contract BanmaoKingSecondaryMotion'+id+' {')[1].split('\ncontract ')[0];
 const raw=part.match(/king-volume-motion\\" attributeName=\\"transform\\" type=\\"scale\\" values=\\"([^"\\]+)\\"/);
 if(!raw)throw Error('Missing canonical scale '+id);
 const scales=raw[1].split(';').map(v=>v.split(' ').map(Number));
 const sx=sample(scales.map(v=>v[0]),phase),sy=sample(scales.map(v=>v[1]),phase);
 function transform(point){
  let q=point;
  if(left){q=rotate([-q[0],q[1]],28,0,-12);q=[q[0]+143,q[1]+357];q=rotate(q,arm,174,302);}
  else {q=rotate(q,-arm-lean,0,-12);q=[q[0]+socketX,q[1]+socketY];q=rotate(q,arm,338,302);}
  q=rotate(q,lean,256,450);
  if(id===8)q=rotate(q,sample([0,0,90,180,270,360,360],phase),256,256);
  return [256+(q[0]-256)*sx,490+(q[1]-490)*sy+lift];
 }
 const o=transform([48,-28]),d=transform([49,-28]);const length=Math.hypot(d[0]-o[0],d[1]-o[1]);
 return [...o,(d[0]-o[0])/length*30,(d[1]-o[1])/length*30].map(Math.round);
}
const rows=profiles.map((p,id)=>{
 const duration=Math.round(Number(p[1])*1000),period=duration*(duration<=5000?2:1),count=2*Math.round(period/500);
 const records=Array.from({length:count},(_,i)=>launch(id,((i*period/count)%duration)/duration,i%2===1));
 const buffer=Buffer.alloc(count*8);records.flat().forEach((v,i)=>buffer.writeInt16BE(v,i*2));return {id,period,count,hex:buffer.toString('hex')};
});
const output='// SPDX-License-Identifier: MIT\npragma solidity ^0.8.30;\n// Baked from canonical Solidity choreography; run tools/bake-king-bubble-launch.cjs.\nlibrary BanmaoKingBubbleLaunch {\nfunction get(uint8 id) internal pure returns(bytes memory data,uint256 period,uint256 count){\n'+rows.map(r=>`if(id==${r.id})return(hex"${r.hex}",${r.period},${r.count});`).join('\n')+'\nrevert("Invalid expression");\n}\n}\n';
const target=path.join(root,'contracts/BanmaoKing/Lib/BanmaoKingArtUpgrade.sol');
const previous=require('./king-canonical-sections.cjs').section('contracts/BanmaoKing/Lib/BanmaoKingArtUpgrade.sol','BubbleLaunch');
const baked='// BEGIN CANONICAL BubbleLaunch\n'+output.replace(/^\/\/ SPDX[^\n]*\npragma[^\n]*\n/,'').trim()+'\n// END CANONICAL BubbleLaunch\n';
if(process.argv.includes('--check')){if(previous!==baked)throw Error('Stale launch data');}else fs.writeFileSync(target,fs.readFileSync(target,'utf8').replace(previous,baked));
console.log('PASS canonical launch data: 21 expressions');
module.exports={rows,launch};
