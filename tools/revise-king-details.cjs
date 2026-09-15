'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
const edit=(f,fn)=>{const p=path.join(root,f);fs.writeFileSync(p,fn(fs.readFileSync(p,'utf8')));};
const app='app/collection/banmaoking/',lib='contracts/BanmaoKing/Lib/';
edit(app+'expression-effects.ts',s=>s.replace(/\$\{\[0,1\]\.map\(i=>`<g data-diamond-ray=[\s\S]*?\.join\(''\)\}/,'').replace('<path d="M${x-11} 194h22','<g transform="translate(0 44) scale(1 .8)"><path d="M${x-11} 194h22').replace('stroke-width="1.3"/></g>`;','stroke-width="1.3"/></g></g>`;'));
edit(app+'choreography.ts',s=>s.replace("return rotate(`king-wrist-${side}`, angles, '0 -12') + shapes;","return rotate(`king-wrist-${side}`, angles, '0 -12') + (side === 'right' ? rotate('king-held-wrist', angles, '0 -12') : '') + shapes;").replace("+ rotate('king-arm-right', p.right, '338 302')", "+ rotate('king-arm-right', p.right, '338 302') + rotate('king-held-arm', p.right, '338 302')"));
edit(lib+'BanmaoKingChoreography.sol',s=>s.replace("return string.concat(rotate(string.concat('king-wrist-', side), beats, '0 -12', duration),", "return string.concat(left ? '' : rotate('king-held-wrist', beats, '0 -12', duration), rotate(string.concat('king-wrist-', side), beats, '0 -12', duration),").replace("rotate('king-arm-right', p.right, '338 302', p.duration)","string.concat(rotate('king-arm-right', p.right, '338 302', p.duration), rotate('king-held-arm', p.right, '338 302', p.duration))"));
// The royal crown and collar remain on the torso; only the staff and its effects move.
edit(lib+'BanmaoKingRoyalLib.sol',s=>s.replace(/string internal constant REGALIA = ("(?:\\.|[^"\\])*");/, (m,v)=>{
 let svg=JSON.parse(v);if(svg.includes('smil-king-held-arm'))return m;
 const start=svg.indexOf('<path d="M385 238'), end=svg.lastIndexOf('<g transform="translate(256 91)">');
 if(start<0||end<0)throw Error('Missing imperial staff anchors');
 svg=svg.slice(0,start)+'<g id="smil-king-held-arm"><g transform="translate(369 357)"><g id="smil-king-held-wrist"><g transform="translate(-385 -357)">'+svg.slice(start,end)+'</g></g></g></g>'+svg.slice(end);
 return 'string internal constant REGALIA = '+JSON.stringify(svg)+';';
}));
// Remove obsolete preview overlays that would float apart from the newly attached props.
edit(app+'accessory-lab.ts',s=>s.replace('  switch (id) {','  if (id >= 13) return ""; // These effects now live inside canonical accessory groups.\n  switch (id) {'));
// Taller open silhouette/pads; preserve all existing rig IDs and relaxed/curled paths.
edit(lib+'BanmaoKingAnatomyPart.sol',s=>s.replaceAll('class=\\"king-paw-open\\" opacity=', 'class=\\"king-paw-open\\" transform=\\"scale(.85 1.18)\\" opacity=').replaceAll('scale(.76)', 'scale(.65 .9)'));
console.log('Expression, held-prop rig and palm revisions applied');
