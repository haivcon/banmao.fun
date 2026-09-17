'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'test-results/sakura');fs.mkdirSync(dir,{recursive:true});
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,f);
const Module=require('node:module'),resolve=Module._resolveFilename;Module._resolveFilename=function(request,parent,...rest){if(request.startsWith('.')&&parent&&!path.extname(request)){const f=path.resolve(path.dirname(parent.filename),request+'.ts');if(fs.existsSync(f))return f;}return resolve.call(this,request,parent,...rest);};
const {previewSvg}=require(path.join(root,'app/collection/banmaoking/smil-preview.ts'));
const garden=require(path.join(root,'app/collection/banmaoking/expansion.json')).backgrounds[6].svg;
const wrap=s=>'<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">'+s+'</svg>';
const scenes=[wrap(garden),...[0,7,19,20].map(accessory=>wrap(previewSvg({body:6,expression:0,accessory,background:14},0,'s'+accessory)))];
fs.writeFileSync(path.join(dir,'browser.html'),`<style>body{margin:0}img{width:256px;height:256px}#inline{position:absolute;left:-1000px}</style><div id="images"></div><div id="inline">${scenes[0]}</div><pre id="result">WAIT</pre><script>
(async()=>{try{
const scenes=${JSON.stringify(scenes)};const ok=(x,m)=>{if(!x)throw Error(m)};
await new Promise(r=>setTimeout(r,100));const svg=document.querySelector('#inline svg');svg.pauseAnimations();
for(const use of svg.querySelectorAll('use'))ok(svg.querySelector(use.getAttribute('href')),'use reference');
const branch=svg.querySelector('[data-sakura-branch]');ok(branch.querySelector('path')&&branch.querySelector('use'),'attached branch and blossom');
svg.setCurrentTime(0);const a=branch.transform.animVal.getItem(0).matrix.b;svg.setCurrentTime(4.5);ok(Math.abs(branch.transform.animVal.getItem(0).matrix.b-a)>.01,'branch sway');
svg.setCurrentTime(9);ok(Math.abs(branch.transform.animVal.getItem(0).matrix.b-a)<.0001,'branch loop');
for(const text of scenes){const image=new Image();image.src=URL.createObjectURL(new Blob([text],{type:'image/svg+xml'}));await image.decode();document.querySelector('#images').append(image);}
const image=document.querySelector('img'),canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d');
const frame=()=>{ctx.clearRect(0,0,512,512);ctx.drawImage(image,0,0);return ctx.getImageData(0,0,512,512).data};
const before=frame();await new Promise(r=>setTimeout(r,1600));const after=frame();let changed=0;for(let i=0;i<before.length;i+=4)if(before[i]!==after[i]||before[i+1]!==after[i+1])changed++;ok(changed>100,'standalone SVG image must visibly animate');
document.querySelector('#result').textContent='PASS: standalone image playback ('+changed+' changed pixels), use references, attached sway and loop, four full character compositions decoded';
}catch(e){document.querySelector('#result').textContent='FAIL: '+e.stack}})();</script>`);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{fs.rmSync(path.join(dir,'profile/DevToolsActivePort'),{force:true});const child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-sandbox','--disable-gpu','--remote-debugging-port=0','--user-data-dir='+path.join(dir,'profile'),'about:blank'],{stdio:'ignore'});let socket;
try{let port;for(let i=0;i<100;i++){await sleep(100);try{port=fs.readFileSync(path.join(dir,'profile/DevToolsActivePort'),'utf8').split('\n')[0];break;}catch{}}
const pages=await(await fetch('http://127.0.0.1:'+port+'/json')).json();socket=new(require('ws'))(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.on('open',r));let id=0;const pending=new Map();socket.on('message',raw=>{const m=JSON.parse(raw);if(pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}});const call=(method,params={})=>new Promise(r=>{pending.set(++id,r);socket.send(JSON.stringify({id,method,params}));});await call('Page.navigate',{url:'file:///'+path.join(dir,'browser.html').replaceAll('\\','/')});let result='WAIT';for(let i=0;i<200;i++){await sleep(100);const r=await call('Runtime.evaluate',{expression:'document.getElementById("result")?.textContent',returnByValue:true});result=r.result?.result?.value||'WAIT';if(result!=='WAIT')break;}assert(result.startsWith('PASS:'),result);console.log(result);const shot=await call('Page.captureScreenshot');fs.writeFileSync(path.join(dir,'browser.png'),Buffer.from(shot.result.data,'base64'));
}finally{socket?.close();child.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
