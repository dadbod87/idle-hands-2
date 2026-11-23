import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {preview} from 'vite';
import {writeFileSync} from 'node:fs';

process.env.IH2_API_PORT='1';
const port=4353;
const server=await preview({preview:{host:'127.0.0.1',port,strictPort:true}});
const browser=await chromium.launch();
const viewport={width:320,height:640},slowdown=4;
const errors=[],api=[],results=[];
const factors=[
 {name:'nearby workshop',point:{x:24,y:25},dest:'workshop',query:'workshop',note:'Walking to Workshop'},
 {name:'pine to south meadow',point:{x:6,y:26},dest:'commons-meadow',query:'south meadow',note:'Walking to South meadow'},
 {name:'east commons to fallen pine',point:{x:104,y:45},dest:'pine-crooked',query:'crooked pine',note:'Walking to Crooked pine'},
];
try{
 for(const {name,point,dest,query,note} of factors){
  const times=[];
  for(let run=0;run<9;run++){
   const page=await browser.newPage({viewport,hasTouch:true});
   const devtools=await page.context().newCDPSession(page);
   await devtools.send('Emulation.setCPUThrottlingRate',{rate:slowdown});
   page.on('pageerror',error=>errors.push(error.message));
   page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))api.push(request.url());});
   await page.addInitScript(origin=>{
    localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'square',position:origin}));
   },point);
   try{
   await page.goto('http://127.0.0.1:'+port+'/?sky-study=1&phase=day&weather=clear');
   await expect.poll(()=>page.evaluate(()=>window.__pilot?.metrics().ready),{timeout:15000}).toBe(true);
   assert.deepEqual(await page.evaluate(()=>window.__pilot.snapshot().position),point);
   const before=await page.evaluate(()=>localStorage.getItem('ih2:workshop:v2'));
   await page.locator('#places').tap();
   await page.getByRole('searchbox',{name:'Find a place'}).fill(query);
   const option=page.getByRole('region',{name:'Matching places'}).locator('[data-destination='+dest+']');
   await option.evaluate(button=>{
    let startAt=0;
    button.addEventListener('click',()=>{startAt=performance.now();},{capture:true,once:true});
    button.addEventListener('click',()=>{window.__routeHandlerMs=performance.now()-startAt;},{once:true});
   });
   await option.tap();
   await expect(page.locator('#feedback')).toContainText(note);
   await expect(page.getByRole('button',{name:'Stop walking',exact:true})).toBeVisible();
   await page.getByRole('button',{name:'Stop walking',exact:true}).tap();
   assert.equal(await page.evaluate(()=>localStorage.getItem('ih2:workshop:v2')),before);
   const ms=await page.evaluate(()=>window.__routeHandlerMs);
   assert.ok(ms>=0);
   if(run)times.push(ms);
   }finally{await page.close();}
  }
  const sorted=[...times].sort((a,b)=>a-b);
  results.push({name,buttonHandlerMs:times,median:(sorted[3]+sorted[4])/2,longest:sorted[7]});
 }
 assert.deepEqual(api,[]);
 assert.deepEqual(errors,[]);
}finally{
 writeFileSync(process.env.IH2_ROUTE_BROWSER_OUT,JSON.stringify({
  source:process.env.IH2_ROUTE_BROWSER_SHA,
  cpuThrottling:slowdown,viewport,
  classification:'Fictional source position seed, real native touch with relative instrumentation, no simulated game progress or physical-device claim.',
  results,api,errors,
 },null,2)+'\n');
 await browser.close();
 await server.close();
}
