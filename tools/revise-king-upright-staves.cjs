'use strict';
// Idempotent staff-only revision. Keep crown/collar effects out of the staff rig.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const write=(f,s)=>fs.writeFileSync(path.join(root,f),s);
function groupAt(svg,start){
 let depth=0;
 for(const m of svg.slice(start).matchAll(/<g\b[^>]*>|<\/g>/g)){
  depth+=m[0]==='</g>'?-1:1;
  if(depth===0)return svg.slice(start,start+m.index+m[0].length);
 }
 throw Error('Unbalanced staff group');
}
function upright(svg){
 if(svg.includes('data-upright-staff'))return svg.replace('<g data-staff-bob="true"><animateTransform attributeName="transform" type="translate" values="0 0;0 -8;0 0" dur="5.6s" repeatCount="indefinite"/>','<g id="smil-king-staff-bob" data-staff-bob="true">');
 if(!svg.includes('id="smil-king-held-arm"'))throw Error('Missing held staff');
 return svg.replace('<g id="smil-king-held-arm">','<g id="smil-king-staff-counter-lean" data-upright-staff="true">')
 .replace('<g id="smil-king-held-wrist">','<g id="smil-king-staff-bob" data-staff-bob="true">');
}
const file='app/collection/banmaoking/expansion.json',data=JSON.parse(read(file));
for(const i of [2,7]) data.accessories[i].svg=upright(data.accessories[i].svg);
write(file,JSON.stringify(data,null,2)+'\n');
const fileSol='contracts/BanmaoKing/Lib/BanmaoKingRoyalLib.sol';
let sol=read(fileSol);
const match=sol.match(/string internal constant REGALIA = ("(?:\\.|[^"\\])*");/);
if(!match)throw Error('Missing REGALIA');
let svg=JSON.parse(match[1]);
if(!svg.includes('data-upright-staff')){
 // The old held-arm wrapper incorrectly included crown jewels and crown arcs.
 const solarStart=svg.indexOf('<g class="king-solar-regalia">');
 const staffStart=svg.indexOf('<path d="M385 420V238"',solarStart);
 if(solarStart<0||staffStart<0)throw Error('Missing solar split');
 const crown=svg.slice(solarStart,staffStart)+'</g>';
 svg=svg.slice(0,solarStart)+'<g class="king-solar-staff">'+svg.slice(staffStart);
 const arcStart=svg.indexOf('<g transform="translate(256 91)">');
 if(arcStart<0)throw Error('Missing crown arc');
 const arc=groupAt(svg,arcStart);
 svg=svg.slice(0,arcStart)+svg.slice(arcStart+arc.length);
 svg=svg.replace('<g id="smil-king-held-arm">',crown+arc+'<g id="smil-king-held-arm">');
 svg=upright(svg)
 .replace('rx="28" ry="10"','rx="23" ry="8"')
 .replace('values="19;19;40;44;19"','values="19;19;24;26;19"')
 .replaceAll('values="18;42"','values="18;25"')
 .replaceAll('M385 404C353 375 416 346 385 318S354 261 385 239S413 207 385 175','M385 404C379 375 391 346 385 318S379 261 385 239S391 207 385 185');
 sol=sol.replace(match[1],JSON.stringify(svg));
 write(fileSol,sol);
}
sol=sol.replace(JSON.stringify(svg),JSON.stringify(upright(svg)));
write(fileSol,sol);
console.log('Upright staves and attached regalia effects revised');
