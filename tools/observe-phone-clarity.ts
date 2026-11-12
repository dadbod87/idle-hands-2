import {chromium,type Page,type Locator} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {neighborhoodFixture} from './neighborhood-fixtures.ts';

// Additional agent audit against an explicit candidate local artifact. No shared login,
// server commands, API interception or edits to practice. Fixtures are separate browser contexts.
const base=process.env.IH2_AUDIT_URL??'http://127.0.0.1:4178/';
if(new URL(base).hostname!=='127.0.0.1'||new URL(base).pathname!=='/')throw Error('Audit accepts loopback root only.');
const dir=resolve(process.env.QA_EVIDENCE_DIR??'test-results/depth-audit');await mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:process.env.CI?undefined:'chrome'}),rows:Array<Record<string,unknown>>=[];
const state=(p:Page)=>p.evaluate(()=>(window as any).__pilot.workshop());
const feet=(p:Page)=>p.evaluate(()=>(window as any).__pilot.snapshot());
async function until(p:Page,read:()=>Promise<boolean>,label:string){const end=Date.now()+20000;while(Date.now()<end){if(await read())return;await p.waitForTimeout(50);}throw Error('Audit timed out: '+label);}
async function worldTap(p:Page,x:number,y:number,touch:boolean){
 for(let n=0;n<15;n++){
  const screen=await p.evaluate(v=>(window as any).__pilot.screenPoint(v.x,v.y),{x,y}),box=(await p.locator('canvas').boundingBox())!;
  const visible=screen.x>20&&screen.x<box.width-20&&screen.y>20&&screen.y<box.height-20;
  const px=box.x+Math.max(20,Math.min(box.width-20,screen.x)),py=box.y+Math.max(20,Math.min(box.height-20,screen.y));
  if(touch)await p.touchscreen.tap(px,py);else await p.mouse.click(px,py);
  if(visible)return;await until(p,async()=>!(await feet(p)).walking,'walk into view');
 }
 throw Error('Audit destination never visible');
}
try{
 for(const shape of [{name:'desktop',width:1440,height:900,touch:false},{name:'phone',width:360,height:640,touch:true},{name:'short',width:844,height:390,touch:true}])for(const scenario of ['fresh','returning','saturated'] as const){
  const ctx=await browser.newContext({viewport:{width:shape.width,height:shape.height},hasTouch:shape.touch}),p=await ctx.newPage(),actions:Array<{action:string;elapsedMs:number}>=[],errors:string[]=[],badResponses:string[]=[];const began=Date.now();
  p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)badResponses.push(r.url()+':'+r.status());});
  const tap=async(l:Locator,label:string)=>{if(shape.touch)await l.tap();else await l.click();actions.push({action:label,elapsedMs:Date.now()-began});};
  const button=(label:string)=>tap(p.getByRole('button',{name:label,exact:true}),label);
  const close=()=>button('Close panel');
  const title=(text:string)=>until(p,async()=>await p.getByRole('dialog').isVisible()&&await p.locator('#panel-title').textContent()===text,'panel '+text);
  try{
   if(scenario!=='fresh'){
    const fixture=neighborhoodFixture(scenario,Date.now());
    await p.addInitScript(s=>{if(!sessionStorage.getItem('depth-fixture-once')){localStorage.setItem('ih2:workshop:v2',JSON.stringify(s));localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'garden',position:{x:9,y:13}}));sessionStorage.setItem('depth-fixture-once','1');}},fixture);
   }
   await p.goto(base);await p.waitForFunction(()=>(window as any).__pilot?.metrics().ready);let protectedBefore;
   if(scenario==='fresh'){
    for(const [resource,x]of [['scrap',21],['timber',23],['supplies',25]] as const){await worldTap(p,x,28,shape.touch);await until(p,async()=>(await feet(p)).locked,'depot');await button('Collect available '+resource);await close();}
    await tap(p.locator('#field-guide'),'Open field guide');await tap(p.locator('#guide-workshop'),'Walk to workshop');await until(p,async()=>(await feet(p)).room==='workshop','workshop entry');await worldTap(p,5,3.5,shape.touch);await until(p,async()=>(await feet(p)).locked,'bench');await button('Make orientation planter');await p.getByRole('button',{name:'Collect finished work',exact:true}).waitFor();await until(p,()=>p.getByRole('button',{name:'Collect finished work',exact:true}).isEnabled(),'real5secondplanter');await button('Collect finished work');await close();await tap(p.locator('#bag'),'Bag & journal');await p.getByRole('combobox',{name:'Furniture to place'}).selectOption('planter');await tap(p.locator('[data-slot="north-east"]'),'Preview planter placement');await button('Place here');await close();await worldTap(p,5,3.5,shape.touch);await until(p,async()=>(await feet(p)).locked,'bench again');await button('Make bridge supplies');protectedBefore=await state(p);assert.equal(protectedBefore.job.recipe,'bridge-kit');await close();
    await tap(p.locator('#bag'),'Bag & journal');await button('Your allotment · crops, markers & quests');await button('Walk to the beds');await until(p,async()=>(await feet(p)).locked&&await p.locator('[data-garden-action=harvest]').isVisible(),'arrived beds dialog');await title('Your rented allotment');await tap(p.locator('[data-garden-action=preview-plant]'),'Preview radish');await tap(p.locator('[data-garden-action=cancel-preview]'),'Cancel free preview');await tap(p.locator('[data-garden-action=preview-plant]'),'Preview radish again');await tap(p.locator('[data-garden-action=plant]'),'Plant starter radish');await tap(p.locator('[data-garden-action=observe]'),'Inspect leaves without output bonus');
   }else{
    protectedBefore=await state(p);await tap(p.locator('#interact'),'Inspect garden beds');await title('Your rented allotment');
    if(scenario==='returning'){
     await tap(p.locator('[data-garden-bed="0"]'),'Select returned radish');await tap(p.locator('[data-garden-action=harvest]'),'Harvest held radish');await tap(p.locator('[data-garden-bed="2"]'),'Select returned flower');await tap(p.locator('[data-garden-action=harvest]'),'Harvest held flower');await button('Visit the allotment attendant');await title('Allotment attendant');await tap(p.locator('[data-garden-action=submit-request]'),'Submit mixed personal request');await button('Return to your beds');await title('Your rented allotment');
    }else{
     const held=(await state(p)).garden.beds.findIndex((b:any)=>b&&b.readyAt<=Date.now());assert.ok(held>=0);await tap(p.locator('[data-garden-bed="'+held+'"]'),'Inspect full held crop');assert.equal(await p.locator('[data-garden-action=harvest]').isEnabled(),false);assert.match(await p.locator('.garden-bed-notice').innerText(),/full/);
    }
   }
   const after=await state(p);for(const key of ['inventory','owned','placements','job','stats','skills','bridgeKits','sketches'])assert.deepEqual(after[key],protectedBefore[key]);
   const enabled=await p.locator('#panel-body button:not(:disabled)').allTextContents(),disabled=await p.locator('#panel-body button:disabled').allTextContents();
   assert.equal(await p.locator('#panel-body').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);await p.screenshot({path:dir+'/'+shape.name+'-'+scenario+'-panel.png'});await close();await p.screenshot({path:dir+'/'+shape.name+'-'+scenario+'-world.png'});
   if(scenario==='saturated'){
    await tap(p.locator('#bag'),'Bag & journal');await button('Your allotment · crops, markers & quests');await button('Visit the allotment attendant');await title('Allotment attendant');assert.equal(await p.locator('[data-garden-action=submit-request]').isEnabled(),false);const timer=await p.locator('.garden-timer').innerText();assert.match(timer,/Next request in/);actions.push({action:timer,elapsedMs:Date.now()-began});await close();
   }
   if(shape.name==='short'){
    await tap(p.locator('#bag'),'Bag & journal');await button('Your allotment · crops, markers & quests');await button('Walk to the beds');await until(p,async()=>(await feet(p)).locked&&await p.locator('[data-garden-action=harvest]').isVisible(),'arrived beds dialog');await title('Your rented allotment');await p.evaluate(()=>document.documentElement.style.fontSize='200%');await p.locator('[data-garden-action=harvest]').scrollIntoViewIfNeeded();assert.equal(await p.locator('#panel-body').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);await p.screenshot({path:dir+'/'+shape.name+'-'+scenario+'-text200.png'});await close();
   }
   // Independent pine supply and a kept furnishing offer a second activity
   // during the ordinary bridge-kit wait; this is still finite authored content.
   await tap(p.locator('#bag'),'Bag & journal');await button('Pine workshop · tools, easels & hampers');
   await button('Walk to Nella');await title('Nella’s pine workshop');
   const confirm=async(action:string)=>{await tap(p.locator('[data-carpentry-action="'+action+'"]'),action+' preview');await tap(p.locator('[data-carpentry-action=confirm]'),action+' confirmation');};
   await confirm('learn-saw');await confirm('equip-saw');
   await button('Find fallen pine');await title('Crooked pine deadfall');await confirm('gather-pine');
   await button('Use the finishing rack');await title('Pine finishing rack');
   await tap(p.locator('[data-carpentry-action=start-easel]'),'Preview independent12heasel');
   const pineQuote=await p.locator('[data-carpentry-quote]').innerText();
   const canStart=await p.locator('[data-carpentry-action=confirm]').isEnabled();
   if(canStart)await tap(p.locator('[data-carpentry-action=confirm]'),'Start independent12heasel');
   else await tap(p.locator('[data-carpentry-action=cancel]'),'Cancel unavailable easel; crops retained');
   const combined=await state(p);assert.deepEqual(combined.job,protectedBefore.job);assert.deepEqual(combined.inventory,protectedBefore.inventory);assert.equal(combined.carpentry.pine.carried,canStart?2:6);
   await p.screenshot({path:dir+'/'+shape.name+'-'+scenario+'-pine-panel.png'});await close();
   assert.deepEqual(errors,[]);assert.deepEqual(badResponses,[]);
   rows.push({shape,scenario,pineQuote,canStart,independentPineJob:combined.carpentry.job,carriedPine:combined.carpentry.pine.carried,method:scenario==='fresh'?'Normal UI from donated starter furnishings/ordinary initial depots; real5secondfirstplanter then12hjob; no state/time/position grants.':'Explicit isolated local elapsed save generated through valid pure commands at past timestamps, plus garden arrival fixture. Not an actual14/52hwait or server-authority test.',actions,elapsedMs:Date.now()-began,jobWaiting:after.job,produce:after.garden.produce,markers:after.garden.markers.length,completedSketches:after.sketches.length,clippings:after.garden.clippings.available,enabled,disabled,protectedOldKeysUnchanged:true,errors,badResponses});console.log('Audited',shape.name,scenario,actions.length,'actions');
  }finally{await ctx.close();}
 }
}finally{await browser.close();}
await writeFile(dir+'/activity-audit.json',JSON.stringify({classification:'IH2-068 actual agent UI observations on candidate068localartifact; not human retention, physical phone, hosted or server authority',base,fixtureDisclosure:'Fresh is normal UI. Returning/saturated local saves and arrival are explicit disposable browser fixtures. No shared-practice login, API interception, real accounts or database writes. Known answers/automated input; action durations are not human enjoyment.',rows},null,2)+'\n');
