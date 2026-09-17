'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process'),ts=require('typescript'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,f);
const Module=require('node:module'),resolve=Module._resolveFilename;Module._resolveFilename=function(request,parent,...rest){if(request.startsWith('.')&&parent&&!path.extname(request)){const f=path.resolve(path.dirname(parent.filename),request+'.ts');if(fs.existsSync(f))return f;}return resolve.call(this,request,parent,...rest);};
const {previewSvg}=require(path.join(root,'app/collection/banmaoking/smil-preview.ts'));
const scenes=Array.from({length:21},(_,expression)=>'<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">'+previewSvg({body:0,expression,accessory:19,background:0},1,'e'+expression)+'</svg>');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bubble-smil-'));fs.writeFileSync(path.join(dir,'index.html'),`<div id="host"></div><pre id="result">WAIT</pre><script>
const scenes=${JSON.stringify(scenes)};
const host=document.getElementById('host'),result=document.getElementById('result');
const check=(v,m)=>{if(!v)throw Error(m)};
(async()=>{try{let maxError=0,count=0;
for(let e=0;e<21;e++){
 host.innerHTML=scenes[e];const svg=host.firstChild;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));svg.pauseAnimations();
 const layer=svg.querySelector('[data-bubble-world]');check(layer.parentNode===svg,'not world space '+e);
 const nodes=[...layer.children];
 for(let i=0;i<nodes.length;i++){
  const motion=nodes[i].querySelector('animateMotion'),begin=parseFloat(motion.getAttribute('begin')),period=parseFloat(motion.getAttribute('dur'));
  const [x,y]=motion.getAttribute('path').match(/-?\\d+/g).slice(0,2).map(Number);
  for(const loop of [0,1,3]){
   svg.setCurrentTime(begin+loop*period);const gun=svg.querySelector('[data-blaster-hand="'+(i%2?'left':'right')+'"] use');
   const p=svg.createSVGPoint();p.x=48;p.y=-28;const q=p.matrixTransform(gun.getCTM());const error=Math.hypot(q.x-x,q.y-y);maxError=Math.max(maxError,error);check(error<2,'muzzle mismatch '+e+'/'+i+'/'+loop+': '+error+' actual '+q.x+','+q.y+' expected '+x+','+y+' ancestors '+(()=>{let n=gun,a=[];while(n&&n!==svg){a.push(n.id+':'+getComputedStyle(n).transform);n=n.parentNode;}return a.join('|')})());
  }
  svg.setCurrentTime(begin+2);check(parseFloat(getComputedStyle(nodes[i].querySelector('use')).opacity)>.1,'invisible bubble '+e+'/'+i+' '+nodes[i].outerHTML);
  count++;
 }
 // Exercise actual SVG image decoding with no scripts embedded in the SVG.
 const image=new Image();image.src='data:image/svg+xml;base64,'+btoa(scenes[e]);await image.decode();check(image.naturalWidth===512,'image decode '+e);
}
result.textContent='PASS: '+count+' launches, 3 cycles, max muzzle error '+maxError.toFixed(3)+'px; 21 standalone SVG images decoded';
}catch(e){result.textContent='FAIL: '+e.stack;}})();</script>`);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-sandbox','--disable-gpu','--remote-debugging-port=0','--user-data-dir='+path.join(dir,'profile'),'about:blank'],{stdio:'ignore'});let socket;
try{let port;for(let i=0;i<100;i++){await sleep(100);try{port=fs.readFileSync(path.join(dir,'profile/DevToolsActivePort'),'utf8').split('\n')[0];break;}catch{}}
const pages=await(await fetch('http://127.0.0.1:'+port+'/json')).json();socket=new(require('ws'))(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.on('open',r));let id=0;const pending=new Map();socket.on('message',raw=>{const m=JSON.parse(raw);if(pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}});const call=(method,params={})=>new Promise(r=>{pending.set(++id,r);socket.send(JSON.stringify({id,method,params}));});await call('Page.navigate',{url:'file:///'+path.join(dir,'index.html').replaceAll('\\','/')});let result='WAIT';for(let i=0;i<300;i++){await sleep(100);const r=await call('Runtime.evaluate',{expression:'document.getElementById("result")?.textContent',returnByValue:true});result=r.result?.result?.value||'WAIT';if(result!=='WAIT')break;}if(result==='WAIT')console.log(JSON.stringify(await call('Runtime.evaluate',{expression:'JSON.stringify({url:location.href,text:document.body?.innerText,scripts:document.scripts.length})',returnByValue:true})));assert(result.startsWith('PASS:'),result);console.log(result);
}finally{socket?.close();child.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
