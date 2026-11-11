// Optional bounded local renderer comparison. No town API, real accounts or DB.
import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=new URL(process.env.IH2_RENDER_PROBE_URL??'http://127.0.0.1:4175');
if(base.protocol!=='http:'||!['127.0.0.1','localhost'].includes(base.hostname))throw new Error('Renderer probe accepts loopback HTTP only.');
const software=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'];
const results=[];
for(const spec of [{id:'native-msaa-on',args:[],aa:true,n:1},{id:'software-msaa-on',args:software,aa:true,n:1},{id:'software-no-msaa',args:software,aa:false,n:1},{id:'software-three-msaa-on',args:software,aa:true,n:3},{id:'software-three-no-msaa',args:software,aa:false,n:3}]){
 const browser=await chromium.launch({channel:process.env.CI?undefined:'chrome',headless:true,args:spec.args});
 try{
  const pages=[];
  for(let i=0;i<spec.n;i++){
   const context=await browser.newContext({viewport:{width:1440,height:900}});
   // Override only MSAA at context creation, independently of the app default.
   // Texture filtering, SVG rasterization, camera and canvas dimensions stay intact.
   await context.addInitScript(aa=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,attrs,...rest){return get.call(this,type,/^webgl/.test(type)?{...attrs,antialias:aa}:attrs,...rest);};},spec.aa);
   const page=await context.newPage();await page.goto(base.origin+'/?sky-study=1&phase=night&weather=drizzle');await page.waitForFunction(()=>window.__pilot?.metrics().ready);pages.push(page);
  }
  await pages[0].waitForTimeout(1000);
  const samples=await Promise.all(pages.map(page=>page.evaluate(async()=>{
   const times=[];await new Promise(resolve=>{const end=performance.now()+4000;function frame(t){times.push(t);if(t<end)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
   const delta=times.slice(1).map((t,i)=>t-times[i]).sort((a,b)=>a-b),canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl2')??canvas.getContext('webgl'),extension=gl?.getExtension('WEBGL_debug_renderer_info');
   return{count:delta.length,p50:delta[Math.floor(delta.length*.5)],p95:delta[Math.floor(delta.length*.95)],mean:delta.reduce((a,b)=>a+b,0)/delta.length,renderer:extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):'unavailable',attrs:gl?.getContextAttributes(),size:[canvas.width,canvas.height],metrics:window.__pilot.metrics().p95FrameMs,hidden:document.hidden};
  })));
  if(samples.some(sample=>sample.attrs?.antialias!==spec.aa||sample.hidden))throw new Error('Context attributes or visibility did not match the probe.');
  results.push({spec,samples});console.log(spec.id+': '+samples.map(sample=>sample.mean.toFixed(2)+'ms').join(', '));
 }finally{await browser.close();}
}
mkdirSync('test-results',{recursive:true});writeFileSync('test-results/renderer-probe.json',JSON.stringify({method:'Four-second rAF windows after one-second settle, one/three1440x900contexts. Explicit cosmetic night/drizzle; only WebGL creation MSAA varied. No backend. Fixed order/local machine; not hosted or physical-device proof.',results},null,2)+'\n');
