'use strict';
// Apply the authored accessory revision once, then regenerate its Solidity catalogue.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const write=(f,s)=>fs.writeFileSync(path.join(root,f),s);
const base='app/collection/banmaoking/';
const file=base+'expansion.json', data=JSON.parse(read(file));
const move=(type,values,dur=5)=>`<animateTransform attributeName="transform" type="${type}" values="${values}" dur="${dur}s" repeatCount="indefinite"/>`;
const pulse='<animate attributeName="opacity" values=".25;.9;.25" dur="4s" repeatCount="indefinite"/>';
const held=(svg,dx=0)=>`<g id="smil-king-held-arm"><g transform="translate(369 357)"><g id="smil-king-held-wrist"><g transform="translate(-369 -357)"><g transform="translate(${dx} 0)">${svg}</g></g></g></g></g>`;
if(!data.accessories[1].svg.includes('data-revision="2"')) {
 let s=data.accessories[1].svg.replace('M201 299Q256 359 311 299','M163 283C178 305 208 326 256 334C304 326 334 305 349 283').replace('M201 298Q256 358 311 298','M163 282C178 304 208 325 256 333C304 325 334 304 349 282').replace('M203 299Q256 356 309 299','M164 283C179 304 208 324 256 332C304 324 333 304 348 283');
 s=s.replace('<ellipse cx="256" cy="333"','<g data-revision="2">'+move('rotate','-4 256 330;4 256 330;-4 256 330',5.6)+'<ellipse cx="256" cy="333"');
 data.accessories[1].svg=s.replace(/<\/g>$/, '</g></g>');
 const rays=Array.from({length:8},(_,i)=>`<path d="M357 244L${i%2?490:30} ${30+i*60}" stroke="#bdd6ff" stroke-width="1" opacity=".15">${pulse}${move('rotate','-4 357 244;4 357 244;-4 357 244',8)}</path>`).join('');
 data.accessories[2].svg=held(data.accessories[2].svg.replace('<g class="king-eth-scepter">','<g class="king-eth-scepter">'+rays),12);
 s=data.accessories[3].svg.replace('<g class="king-okb-emblem" fill="#f5f7fa">','<g class="king-okb-emblem" fill="#f5f7fa">'+pulse+'<path d="M-24 0h-12M24 0h12M0-24v-12M0 24v12M-20-20l-8-8M20 20l8 8" stroke="#caffdd" stroke-width="2"/>');
 data.accessories[3].svg=held('<g transform="translate(365 357)"><g>'+move('scale','1.22;1.3;1.22',5.8)+'<g transform="translate(-365 -357)">'+s+'</g></g></g>');
 s=data.accessories[4].svg.replace('<path d="M211 352l-10 8 10 8m88-16 10 8-10 8m-28-22-12 28" fill="none" stroke="#60efc4"/>','');
 const text=Array.from('$banmao', (c,i)=>`<text x="${207+i*13}" y="365" fill="#60efc4" stroke="none" font-family="monospace" font-size="18" opacity="0">${c}<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;${(.1+i*.09).toFixed(2)};.88;1" calcMode="discrete" dur="5s" repeatCount="indefinite"/></text>`).join('');
 data.accessories[4].svg='<g data-laptop-float="true">'+move('translate','0 0;3 -7;-2 -3;0 0',6.4)+s+text+'</g>';
 data.accessories[5].svg=held(data.accessories[5].svg,-34);
 const flowers=Array.from({length:9},(_,i)=>{const x=184+i*18,y=116+Math.round(18*Math.sin(i*Math.PI/8));return `<g transform="translate(${x} ${y})" data-flower="${i}"><path d="M-7 2q-16-16-17-3q8 11 17 3M7 2q16-16 17-3q-8 11-17 3" fill="#65a66f" stroke="#38754f"/>${Array.from({length:5},(_,j)=>`<ellipse cy="-7" rx="4.5" ry="7" transform="rotate(${j*72})" fill="${i%2?'#ffe6f3':'#eea4d1'}" stroke="#ad628e" stroke-width=".7"/>`).join('')}<circle r="3.5" fill="#ffe69a" stroke="#b38b39"/></g>`;}).join('');
 data.accessories[6].svg='<g data-flower-crown="true"><ellipse cx="256" cy="117" rx="79" ry="20" fill="none" stroke="#427b55" stroke-width="5"/>'+flowers+'</g>';
 data.accessories[7].svg=held(data.accessories[7].svg,-11);
 write(file,JSON.stringify(data,null,2)+'\n');
}
// Split the crown ring like Halo: rear arc before the body, front arc beneath flowers.
if (!data.accessories[6].rearSvg) {
 const ring='<ellipse cx="256" cy="117" rx="79" ry="20" fill="none" stroke="#427b55" stroke-width="5"/>';
 if (!data.accessories[6].svg.includes(ring)) throw Error('Missing flower crown ring');
 data.accessories[6].rearSvg='<g id="accessory-rear" data-flower-crown-rear="true"><path d="M177 117a79 20 0 0 1 158 0" fill="none" stroke="#427b55" stroke-width="5"/></g>';
 data.accessories[6].svg=data.accessories[6].svg.replace(ring,'<path data-flower-crown-front="true" d="M177 117a79 20 0 0 0 158 0" fill="none" stroke="#427b55" stroke-width="5"/>');
}
// Revision 3: detached ETH flashes and an upright, wider shield. Safe to rerun.
if (!data.accessories[2].svg.includes('data-eth-burst')) {
 const old = /<path d="M357 244L[^>]+>[\s\S]*?<\/path>/g;
 const rays = Array.from({length:8},(_,i)=>{
  const a=i*Math.PI/4, x=Math.cos(a), y=Math.sin(a);
  const point=r=>`${(357+x*r).toFixed(2)} ${(244+y*r).toFixed(2)}`;
  return `<path data-eth-burst="${i}" d="M${point(22)}L${point(38)}" fill="none" stroke="#bdd6ff" stroke-width="1.5" stroke-linecap="round" opacity="0"><animate attributeName="opacity" values="0;0;.85;0;0" keyTimes="0;.08;.14;.38;1" dur="3.2s" begin="-${(i%3*.18).toFixed(2)}s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="0 0;${(x*45).toFixed(2)} ${(y*45).toFixed(2)};${(x*45).toFixed(2)} ${(y*45).toFixed(2)}" keyTimes="0;.4;1" dur="3.2s" begin="-${(i%3*.18).toFixed(2)}s" repeatCount="indefinite"/></path>`;
 }).join('');
 if ((data.accessories[2].svg.match(old)||[]).length!==8) throw Error('Expected eight legacy ETH rays');
 data.accessories[2].svg=data.accessories[2].svg.replace(old,'').replace('<g class="king-eth-scepter">','<g class="king-eth-scepter">'+rays);
}
if (!data.accessories[3].svg.includes('smil-king-shield-counter-arm')) {
 const anchor='<g transform="translate(365 357)">';
 if (!data.accessories[3].svg.includes(anchor)) throw Error('Missing shield anchor');
 data.accessories[3].svg=data.accessories[3].svg.replace(anchor,'<g id="smil-king-shield-counter-arm"><g id="smil-king-shield-counter-wrist"><g id="smil-king-shield-counter-lean">'+anchor+'<g transform="scale(1.18 1)">')+'</g></g></g></g>';
}
// Coffee uses the existing upright held-prop rig (shared with Shield).
// Its handle meets the paw at x=369; the cup projects outward to the right.
const coffee='<g class="king-coffee-cup" data-upright-coffee="true"><path data-coffee-handle="true" d="M385 344C359 337 358 374 384 369" fill="none" stroke="#85583b" stroke-width="10"/><path d="M385 344C359 337 358 374 384 369" fill="none" stroke="#f9e8c9" stroke-width="6"/><path d="M382 333H430L426 381Q406 396 386 381Z" fill="#fff1d3" stroke="#85583b" stroke-width="2.5"/><path d="M418 341L415 379Q421 378 424 375L428 340Z" fill="#e6c99e"/><path d="M389 344L391 374" fill="none" stroke="#fffdf4" stroke-width="3" stroke-linecap="round"/><ellipse cx="406" cy="333" rx="24" ry="7" fill="#e3c49a" stroke="#85583b" stroke-width="2.5"/><ellipse cx="406" cy="334" rx="19" ry="4" fill="#593727"/><path d="M396 333Q402 330 410 332" fill="none" stroke="#bd8856" stroke-width="1.5" stroke-linecap="round"/><g data-coffee-bean="true" transform="rotate(28 406 360)"><ellipse cx="406" cy="360" rx="8" ry="11" fill="#70462e" stroke="#4c3024" stroke-width="1"/><path d="M408 351C400 356 412 363 404 369" fill="none" stroke="#e5bf88" stroke-width="1.8" stroke-linecap="round"/></g><path d="M393 320Q385 313 393 305T393 291M408 317Q400 309 408 301T408 287M422 320Q416 314 422 307" fill="none" stroke="#f4e9da" stroke-width="2.2" stroke-linecap="round" opacity=".5"><animate attributeName="opacity" values=".25;.7;.25" dur="3s" repeatCount="indefinite"/></path></g>';
data.accessories[5].svg=held('<g id="smil-king-shield-counter-arm"><g id="smil-king-shield-counter-wrist"><g id="smil-king-shield-counter-lean">'+coffee+'</g></g></g>');
// Share burst timing/expansion across the eight rays to keep deployment initcode small.
if (!data.accessories[2].svg.includes('data-eth-burst-group')) {
 const rays = [...data.accessories[2].svg.matchAll(/<path data-eth-burst="\d+"[^>]*>[\s\S]*?<\/path>/g)];
 if (rays.length !== 8) throw Error('Expected eight burst rays');
 const paths = rays.map(([tag])=>tag.slice(0,tag.indexOf('>')+1).replace(' opacity="0"','').replace(/>$/,'/>')).join('');
 const group = '<g data-eth-burst-group="true" opacity="0"><animate attributeName="opacity" values="0;0;.85;0;0" keyTimes="0;.08;.14;.38;1" dur="3.2s" repeatCount="indefinite"/><g transform="translate(357 244)"><g><animateTransform attributeName="transform" type="scale" values="1;2.1;2.1" keyTimes="0;.4;1" dur="3.2s" repeatCount="indefinite"/><g transform="translate(-357 -244)">'+paths+'</g></g></g></g>';
 data.accessories[2].svg=data.accessories[2].svg.replace(rays[0][0],group);
 for (const [tag] of rays.slice(1)) data.accessories[2].svg=data.accessories[2].svg.replace(tag,'');
}
write(file,JSON.stringify(data,null,2)+'\n');
write('contracts/BanmaoKing/Lib/BanmaoKingAccessoryExpansion.sol','// SPDX-License-Identifier: MIT\npragma solidity ^0.8.30;\n// Generated by tools/refine-king-accessories.cjs\ncontract BanmaoKingAccessoryExpansion {\nerror InvalidTrait();\nfunction render(uint8 id) external pure returns(string memory){\n'+data.accessories.map((a,i)=>`if(id==${i+12}) return ${JSON.stringify(a.svg)};`).join('\n')+'\nrevert InvalidTrait();}\nfunction traitName(uint8 id) external pure returns(string memory){\n'+data.accessories.map((a,i)=>`if(id==${i+12}) return ${JSON.stringify(a.name)};`).join('\n')+'\nrevert InvalidTrait();}\n}\n');
const contract='contracts/BanmaoKing/Lib/BanmaoKingAccessoryExpansion.sol';
write(contract,read(contract).replace('error InvalidTrait();','error InvalidTrait();\nfunction renderRear(uint8 id) external pure returns(string memory){\n'+data.accessories.map((a,i)=>a.rearSvg?`if(id==${i+12}) return ${JSON.stringify(a.rearSvg)};`:'').join('\n')+'\nreturn "";\n}'));
console.log('Accessory revision generated');
