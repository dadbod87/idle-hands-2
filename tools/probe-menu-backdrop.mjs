import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const out=process.env.IH2_MENU_PROBE_OUT??'test-results/menu-probe';mkdirSync(out,{recursive:true});
const baseline=new URL(process.env.IH2_MENU_BASELINE_URL??'http://127.0.0.1:4201'),candidate=new URL(process.env.IH2_MENU_CANDIDATE_URL??'http://127.0.0.1:4175');
for(const url of [baseline,candidate])if(url.protocol!=='http:'||!['127.0.0.1','localhost'].includes(url.hostname))throw new Error('Menu probe accepts loopback HTTP only.');
// Optional controlled local comparison; serve the archived baseline separately.
// No town API, saved-state mutation, assertion or test-budget override.
const results=[];
for(const [label,base]of [['baseline',baseline.origin],['candidate',candidate.origin]]){
 const browser=await chromium.launch({channel:process.env.CI?undefined:'chrome',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const pages=[];
  for(let n=0;n<3;n++){const context=await browser.newContext({viewport:{width:1440,height:900}});const page=await context.newPage();await page.goto(base+'/?sky-study=1&phase=day&weather=clear');await page.waitForFunction(()=>window.__pilot?.metrics().ready);await page.getByRole('button',{name:'Open field guide'}).click();pages.push(page);}
  const samples=await Promise.all(pages.map(async page=>{
   const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');const before=await cdp.send('Performance.getMetrics');
   const raf=await page.evaluate(async()=>{const ts=[];await new Promise(resolve=>{const end=performance.now()+4000;function frame(t){ts.push(t);if(t<end)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});const ds=ts.slice(1).map((t,n)=>t-ts[n]).sort((a,b)=>a-b);return{count:ds.length,mean:ds.reduce((a,b)=>a+b,0)/ds.length,p95:ds[Math.floor(ds.length*.95)]};});
   const after=await cdp.send('Performance.getMetrics'),find=(m,key)=>m.metrics.find(x=>x.name===key)?.value??0;
   return{raf,taskSeconds:find(after,'TaskDuration')-find(before,'TaskDuration'),scriptSeconds:find(after,'ScriptDuration')-find(before,'ScriptDuration'),position:await page.evaluate(()=>window.__pilot.snapshot()),dialog:await page.getByRole('dialog').isVisible()};
  }));
  await pages[0].screenshot({path:out+'/menu-'+label+'.png'});
  const started=performance.now();for(let n=0;n<4;n++){await pages[0].getByRole('button',{name:'Close panel'}).click();await pages[0].getByRole('button',{name:'Open field guide'}).click();}
  results.push({label,samples,fourMenuRoundTripsMs:performance.now()-started});console.log(JSON.stringify(results.at(-1)));
 }finally{await browser.close();}
}
writeFileSync(out+'/menu-backdrop-probe.json',JSON.stringify({method:'Same machine, fixed baseline then candidate order; actual prior CI client artifact vs local candidate, three1440x900software ANGLE SwiftShader contexts with actual DOM field guide open. Four-second browser rAF/CDP TaskDuration windows; not physical-device or CI timing proof. No API or progress grants.',results},null,2));
