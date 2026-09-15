'use strict';
// Real Chromium SMIL checks, using the same inline SVG insertion as the studio.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,f);
// Match TypeScript/Next resolution: .ts precedes .json for extensionless imports.
const Module=require('node:module'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){
 if(request.startsWith('.') && parent && !path.extname(request)) {
  const candidate=path.resolve(path.dirname(parent.filename),request+'.ts');
  if(fs.existsSync(candidate)) return candidate;
 }
 return resolve.call(this,request,parent,...rest);
};
const {previewSvg}=require(path.join(root,'app/collection/banmaoking/smil-preview.ts'));
const profiles=require(path.join(root,'app/collection/banmaoking/choreography.json'));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'king-playback-'));
const css=['banmaoking.css','experience.css'].map(f=>fs.readFileSync(path.join(root,'app/collection/banmaoking',f),'utf8')).join('\n');
const artEffects=process.env.KING_ART_EFFECTS==='1';
const scenes=profiles.map((_,expression)=>previewSvg({body:process.env.KING_SUIT?Number(process.env.KING_SUIT):artEffects?7:16,expression,accessory:process.env.KING_SUIT?expression:process.env.KING_COFFEE==='1'?17:process.env.KING_STAFF?Number(process.env.KING_STAFF):process.env.KING_SHIELD==='1'?15:artEffects?0:20,background:artEffects?expression%17:16},1,`e${expression}`));
const html=`<!doctype html><style>${css}</style><div class="king-experience" id="host"></div><pre id="result">WAIT</pre><script>
const scenes=${JSON.stringify(scenes)},profiles=${JSON.stringify(profiles)};
const host=document.getElementById('host');
function mount(i){host.innerHTML='<svg class="king-art" data-animated="true" viewBox="0 0 512 512">'+scenes[i]+'</svg>';return host.firstElementChild;}
function matrix(node){return Array.from({length:node.transform.animVal.numberOfItems},(_,i)=>{const m=node.transform.animVal.getItem(i).matrix;return [m.a,m.b,m.c,m.d,m.e,m.f]}).flat().join(',');}
const check=(ok,message)=>{if(!ok)throw Error(message)};
(async()=>{try{
 for(let i=0;i<21;i++){
  const svg=mount(i);await new Promise(r=>setTimeout(r,20));
  const xml=new DOMParser().parseFromString(svg.outerHTML,'image/svg+xml');check(!xml.querySelector('parsererror'),'SVG parse '+i);
  if(${artEffects}) {
   for(const part of ['arm-right','leg-right','ear-right','tail']) check(!!svg.querySelector('.king-'+part+' [fill="url(#e'+i+'-bk-cyber-metal)"]'),'mechanical attachment '+i+'/'+part);
   check(!!svg.querySelector('.king-arm-left [fill="url(#e'+i+'-bk-fur)"]'),'organic arm '+i);
   if(i===7){const drops=[...svg.querySelectorAll('[data-tear]')];check(drops.length===6,'six tears');svg.pauseAnimations();svg.setCurrentTime(.3);const a=matrix(drops[0]);svg.setCurrentTime(2.3);check(matrix(drops[0])!==a,'tears must fall');}
   if(i===12){const orbit=svg.querySelector('[data-cosmic-orbit]');svg.pauseAnimations();svg.setCurrentTime(0);const a=matrix(orbit);svg.setCurrentTime(2);check(matrix(orbit)!==a,'cosmic orbit');}
   if(i===13){
    const rays=[...svg.querySelectorAll('[data-diamond-ray]')];
    check(rays.length===15,'token 1 has nine left and six right diamond rays');
    svg.pauseAnimations();
    svg.setCurrentTime(.65);
    check(rays.every(ray=>Number(getComputedStyle(ray).opacity)>.5),'diamond burst visible');
    const offset=parseFloat(getComputedStyle(rays[0]).strokeDashoffset);
    svg.setCurrentTime(1.5);
    check(parseFloat(getComputedStyle(rays[0]).strokeDashoffset)<offset,'diamond packet travels outward');
    for(const time of [2.1,2.6,3.1]){
     svg.setCurrentTime(time);
     check(rays.every(ray=>Number(getComputedStyle(ray).opacity)===0),'diamond rays fully off during rest');
    }
    svg.setCurrentTime(3.85);
    check(rays.every(ray=>Number(getComputedStyle(ray).opacity)>.5),'diamond burst repeats');
    svg.setCurrentTime(0);svg.unpauseAnimations();
   }
   if(i===14){const line=svg.querySelector('[data-code-line]');svg.pauseAnimations();svg.setCurrentTime(.1);const a=getComputedStyle(line).strokeDashoffset;svg.setCurrentTime(2.5);check(getComputedStyle(line).strokeDashoffset!==a,'code typing');}
  }
  if (${!!process.env.KING_STAFF}) {
   svg.pauseAnimations();
   const staff=svg.querySelector('[data-staff-bob]');
   check(!!staff,'staff exists');
   const xs=[],ys=[];
   for(let step=0;step<=28;step++) {
    svg.setCurrentTime(Number(profiles[i].duration)*step/28);
    const m=staff.getCTM();
    check(Math.abs(m.b)<.001 && Math.abs(m.c)<.001 && m.a>0 && m.d>0,'upright staff '+i+'/'+step);
    xs.push(m.e);ys.push(m.f);
   }
   check(Math.max(...xs)-Math.min(...xs)<.001,'staff must not drift sideways '+i);
   if([0,1,2,3,5,10].includes(i))check(Math.max(...ys)-Math.min(...ys)>.1,'staff vertical movement '+i);
   const crown=svg.querySelector('.king-solar-regalia');
   if(crown)check(!crown.closest('[data-upright-staff]'),'crown jewels outside staff');
   svg.setCurrentTime(0);svg.unpauseAnimations();
  }
  if (${!!process.env.KING_SUIT}) {
   const badge=svg.querySelector('.king-crypto-badge');
   const m=new DOMMatrix(getComputedStyle(badge).transform);
   check(Math.abs(m.e-256)<.01 && Math.abs(m.f-([2,5,11,13,16,20].includes(i)?410:348))<.01,'suit placement '+i);
   check(Math.abs(badge.firstElementChild.transform.baseVal.consolidate().matrix.a-1/3)<.001,'suit badge scale');
  }
  if (${process.env.KING_COFFEE==='1'}) {
   svg.pauseAnimations();
   const cup=svg.querySelector('.king-coffee-cup');
   check(!!cup.querySelector('[data-coffee-bean]'),'coffee bean emblem');
   for(let step=0;step<=28;step++) {
    svg.setCurrentTime(Number(profiles[i].duration)*step/28);
    const m=cup.getCTM();
    check(Math.abs(m.b)<.001 && Math.abs(m.c)<.001 && m.a>0 && m.d>0,'upright coffee '+i+'/'+step);
   }
   svg.setCurrentTime(0);svg.unpauseAnimations();
  }
  if (${process.env.KING_SHIELD==='1'}) {
   svg.pauseAnimations();
   const shield=svg.querySelector('.king-okb-shield');
   for(let step=0;step<=28;step++) {
    svg.setCurrentTime(Number(profiles[i].duration)*step/28);
    const m=shield.getCTM();
    check(Math.abs(m.b)<.001 && Math.abs(m.c)<.001 && m.a>0 && m.d>0,'upright shield '+i+'/'+step);
   }
   svg.setCurrentTime(0);svg.unpauseAnimations();
  }
  const arm=document.getElementById('e'+i+'-smil-king-arm-left');
  const shell=document.getElementById('e'+i+'-banana-shell');
  check(!!(arm.compareDocumentPosition(shell)&Node.DOCUMENT_POSITION_FOLLOWING),'arm paint order '+i);
  svg.pauseAnimations();svg.setCurrentTime(0);const rest=matrix(arm);
  svg.setCurrentTime(Number(profiles[i].duration)*.3);check(matrix(arm)!==rest,'static arm '+i);
  check(!document.getElementById('e'+i+'-front-paws'),'foreground arms '+i);
  for(const side of ['left','right']) {
   const palm=document.getElementById('e'+i+'-king-palm-'+side);
   const visible=[1,3,5,10].includes(i)||(side==='right'&&[0,2].includes(i));
   check(Number(getComputedStyle(palm).opacity)===(visible?1:0),'palm visibility '+i+'/'+side);
   check(palm.closest('.king-arm-'+side)!==null,'detached palm '+i+'/'+side);
  }
 }
 const svg=mount(0);await new Promise(r=>setTimeout(r,80));const before=svg.getCurrentTime();const arm=document.getElementById('e0-smil-king-arm-right'),first=matrix(arm);
 await new Promise(r=>setTimeout(r,850));check(svg.getCurrentTime()>before,'clock stopped');check(matrix(arm)!==first,'autoplay stopped');
 const restarted=mount(20);await new Promise(r=>setTimeout(r,30));check(restarted.getCurrentTime()<.3,'restart failed');
 document.getElementById('result').textContent='PASS: 21 moving arms, rear layering, autoplay, remount restart; reduced='+matchMedia('(prefers-reduced-motion: reduce)').matches;
}catch(e){document.getElementById('result').textContent='FAIL: '+e.message}})();
</script>`;
fs.writeFileSync(path.join(dir,'index.html'),html);
const chrome=process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
async function run(reduced){
 const userDir=path.join(dir,reduced?'reduce':'normal');
 const args=['--headless=new','--no-sandbox','--disable-gpu','--no-first-run','--disable-background-networking','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--remote-debugging-port=0',`--user-data-dir=${userDir}`];
 args.push(`--force-prefers-reduced-motion=${reduced?'reduce':'no-preference'}`);args.push('about:blank');
 const child=spawn(chrome,args,{stdio:'ignore'});let socket;
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 try {
  const portFile=path.join(userDir,'DevToolsActivePort');
  for(let i=0;i<100&&!fs.existsSync(portFile);i++)await sleep(100);
  const port=fs.readFileSync(portFile,'utf8').split('\n')[0];
  const pages=await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const WS=require('ws');socket=new WS(pages.find(page=>page.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.once('open',resolve);socket.once('error',reject)});
  let seq=0;const pending=new Map();socket.on('message',data=>{const m=JSON.parse(data);if(pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id)}});
  const call=(method,params={})=>new Promise(resolve=>{const id=++seq;pending.set(id,resolve);socket.send(JSON.stringify({id,method,params}))});
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:reduced?'reduce':'no-preference'}]});
  await call('Page.navigate',{url:'file:///'+path.join(dir,'index.html').replaceAll('\\','/')});
  let result='WAIT';
  for(let i=0;i<100;i++){
   await sleep(100);const response=await call('Runtime.evaluate',{expression:'document.getElementById("result")?.textContent',returnByValue:true});
   result=response.result?.result?.value||'WAIT';if(result!=='WAIT')break;
  }
  if(result==='WAIT') console.log(JSON.stringify(await call('Runtime.evaluate',{expression:'JSON.stringify({url:location.href,state:document.readyState,text:document.body?.innerText,svgs:document.querySelectorAll("svg").length})',returnByValue:true})));
  assert(result.startsWith('PASS:'),result);if(reduced)assert(result.endsWith('true'));console.log(result);
   if (!reduced && process.env.KING_CAPTURE) {
    const sharp=require('sharp'),tiles=[];
    await call('Emulation.setDeviceMetricsOverride',{width:512,height:512,deviceScaleFactor:1,mobile:false});
    for(const [row,i] of (artEffects?[7,12,13,14,18,19]:[0,1,2,3,5,10]).entries()) for(const [col,beat] of [0,.3,.43,.58].entries()) {
     await call('Runtime.evaluate',{expression:`(()=>{document.body.style.margin='0';host.style.cssText='width:512px;height:512px';const s=mount(${i});s.style.cssText='width:512px;height:512px';s.pauseAnimations();s.setCurrentTime(${Number(profiles[i].duration)*beat});})()`});
     await sleep(60);
     const shot=await call('Page.captureScreenshot',{format:'png',clip:{x:0,y:0,width:512,height:512,scale:1}});
     tiles.push({input:await sharp(Buffer.from(shot.result.data,'base64')).resize(256,256).png().toBuffer(),left:col*256,top:row*256});
    }
    const output=path.resolve(root,process.env.KING_CAPTURE);fs.mkdirSync(path.dirname(output),{recursive:true});
    await sharp({create:{width:1024,height:1536,channels:4,background:'#ffffff'}}).composite(tiles).png().toFile(output);
    console.log('Gesture contact sheet: '+output);
   }

 }finally{if(socket)socket.close();child.kill();await sleep(500);}
}
(async()=>{try{await run(false);await run(true);}finally{try{fs.rmSync(dir,{recursive:true,force:true,maxRetries:5,retryDelay:200});}catch(e){console.warn('Chrome profile still locked; temporary files retained at '+dir);}}})().catch(e=>{console.error(e);process.exitCode=1});
