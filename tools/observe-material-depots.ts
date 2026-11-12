/** Actual-input before/after depot observations, cosmetic lighting fixture only. */
import {chromium,expect,type Page} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
const base=process.argv[2]??'http://127.0.0.1:49525/',url=new URL(base);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.protocol,'http:');assert.equal(url.pathname,'/');assert.equal(url.search,'');
const output=resolve(process.env.QA_EVIDENCE_DIR??'test-results/depot-observations');await mkdir(output,{recursive:true});
const htmlSha256=createHash('sha256').update(Buffer.from(await(await fetch(base)).arrayBuffer())).digest('hex');
const browser=await chromium.launch({channel:'chrome'}),rows:Array<Record<string,unknown>>=[];
const state=(p:Page)=>p.evaluate(()=>(window as any).__pilot.workshop());
async function bodyInput(p:Page,x:number,y:number,touch:boolean){
 for(let n=0;n<12;n++){
  if(await p.evaluate(()=>(window as any).__pilot.snapshot().locked))return;
  const point=await p.evaluate(v=>(window as any).__pilot.screenPoint(v.x,v.y),{x,y}),canvas=(await p.locator('canvas').boundingBox())!;
  const visible=point.x>20&&point.x<canvas.width-20&&point.y>20&&point.y<canvas.height-20;
  const target={x:canvas.x+Math.max(20,Math.min(canvas.width-20,point.x)),y:canvas.y+Math.max(20,Math.min(canvas.height-20,point.y))};
  if(touch)await p.touchscreen.tap(target.x,target.y);else await p.mouse.click(target.x,target.y);
  if(visible)return;
  await expect.poll(()=>p.evaluate(()=>(window as any).__pilot.snapshot().walking),{timeout:15000}).toBe(false);
 }throw Error('Resource body never entered the usable viewport');
}
const shapes=[{name:'desktop',width:1440,height:900,touch:false},{name:'phone',width:360,height:640,touch:true},{name:'short200',width:844,height:390,touch:true}];
try{for(const shape of shapes.filter(s=>!process.env.DEPOT_SHORT_ONLY||s.name==='short200'))for(const phase of (process.env.DEPOT_SHORT_ONLY?['day']:['day','night'])){
 const c=await browser.newContext({viewport:{width:shape.width,height:shape.height},hasTouch:shape.touch}),p=await c.newPage(),errors:string[]=[],bad:string[]=[],api:string[]=[],depotAssets:string[]=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{const path=new URL(r.url()).pathname;if(path.startsWith('/api/'))api.push(path);if(path.startsWith('/art/depots/'))depotAssets.push(path)});p.on('response',r=>{if(r.status()>=400)bad.push(r.status()+' '+r.url())});
 const name=shape.name+'-'+phase,tap=async(locator:ReturnType<Page['locator']>)=>shape.touch?locator.tap():locator.click();
 try{
  await p.goto(base+'?sky-study=1&phase='+phase+'&weather=clear');await expect.poll(()=>p.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
  if(shape.name==='short200')await p.evaluate(()=>document.documentElement.style.fontSize='200%');
  await p.evaluate(async()=>{await document.fonts.ready;await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())))});await p.waitForTimeout(1250);
  const initial=await state(p);assert.equal(initial.revision,0);assert.deepEqual(initial.inventory,{scrap:0,timber:0,supplies:0});await p.screenshot({path:output+'/'+name+'-fresh-world.png'});
  const labelFrames=await p.evaluate(()=>{const h=document.querySelector('canvas')!.getBoundingClientRect().height,p=(window as any).__pilot;return p.metrics().visual.depots?.map((d:any)=>{const r=d.labelBounds,point=p.screenPoint(r.x/32-.5,r.y/32-.5);return{resource:d.resource,top:point.y,bottom:point.y+r.height,canvasHeight:h};})??null;});
  if(labelFrames)for(const r of labelFrames)assert.ok(r.top>=0&&r.bottom<=r.canvasHeight,JSON.stringify(r));
  const depots=await p.evaluate(()=>(window as any).__pilot.metrics().visual.depots??null);
  for(const[resource,x]of[['scrap',21],['timber',23],['supplies',25]]as const){
   await bodyInput(p,x,28,shape.touch);await expect(p.locator('#panel-title')).toHaveText(resource[0].toUpperCase()+resource.slice(1)+' depot',{timeout:15000});
   await tap(p.getByRole('button',{name:'Collect available '+resource,exact:true}));assert.equal((await state(p)).inventory[resource],6);await expect(p.locator('[data-collect]')).toBeDisabled();await tap(p.getByRole('button',{name:'Close panel',exact:true}));
  }
  const after=await state(p);assert.deepEqual(after.inventory,{scrap:6,timber:6,supplies:6});assert.equal(after.revision,3);
  for(const k of ['owned','placements','job','bridgeKits','garden','carpentry','commission'])assert.deepEqual(after[k],initial[k]);
  assert.deepEqual(after.stats,{...initial.stats,gathered:initial.stats.gathered+18});assert.deepEqual(after.skills,{...initial.skills,gathering:initial.skills.gathering+18});
  if(shape.name==='short200'){await tap(p.locator('#bag'));assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.screenshot({path:output+'/'+name+'-controls.png'});await tap(p.getByRole('button',{name:'Close panel',exact:true}));}
  await p.waitForTimeout(1250);await p.screenshot({path:output+'/'+name+'-collected-world.png'});assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);assert.deepEqual(api,[]);
  rows.push({name,shape,phase,depots,labelFrames,initialRevision:initial.revision,finalRevision:after.revision,inventory:after.inventory,otherProgressPreserved:true,errors,bad,api,depotAssets});console.log('PASS',name,'actual body input and18ordinary materials; otherprogressunchanged');
 }finally{await c.close();}
}}finally{await browser.close();await writeFile(output+'/observations.json',JSON.stringify({htmlSha256,base,classification:'Compiled game actual desktop/phone/short input and captures; not physical phone or human-recognition proof',disclosure:'Independent fresh empty contexts, no injected save/position/stock/production clock or response interception. Explicit cosmetic sky-study day/night only; actual job clocks stay real. Doubled DOM text and touch are emulation. Actual normal body taps and collection, no Places directory.',rows},null,2)+'\n');}
