import {chromium,expect,type Page,type Locator} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {combinedAuditFixture,type LocalAuditCase} from './combined-audit-fixtures.ts';
import {isCurrentWorkshop,type WorkshopState} from '../src/game/live-workshop.ts';
const base=process.env.IH2_AUDIT_URL??'http://127.0.0.1:4175/',u=new URL(base);
assert.equal(u.hostname,'127.0.0.1');assert.equal(u.pathname,'/');assert.equal(u.search,'');
const output=resolve(process.env.QA_EVIDENCE_DIR??'test-results/combined-local');await mkdir(output,{recursive:true});
const accepted=JSON.parse(await readFile('docs/evidence/IH2-071/source-closeout.json','utf8'));
const htmlSha256=createHash('sha256').update(Buffer.from(await(await fetch(base)).arrayBuffer())).digest('hex');assert.equal(htmlSha256,accepted.artifact.htmlSha256);
const browser=await chromium.launch({channel:'chrome'}),rows:Array<Record<string,unknown>>=[];
const state=(p:Page)=>p.evaluate(()=>(window as any).__pilot.workshop())as Promise<WorkshopState>;
const actor=(p:Page)=>p.evaluate(()=>(window as any).__pilot.snapshot());
const shapes=[{name:'desktop',width:1440,height:900,touch:false},{name:'phone',width:360,height:640,touch:true},{name:'short',width:844,height:390,touch:true}];
try{for(const shape of shapes.filter(s=>!process.env.IH2_AUDIT_SHAPE||s.name===process.env.IH2_AUDIT_SHAPE))for(const kind of ['fresh','returning','both-busy','saturated']as LocalAuditCase[]){
 if(process.env.IH2_AUDIT_CASE&&kind!==process.env.IH2_AUDIT_CASE)continue;
 const context=await browser.newContext({viewport:{width:shape.width,height:shape.height},hasTouch:shape.touch}),p=await context.newPage(),fixture=combinedAuditFixture(kind,Date.now()),errors:string[]=[],bad:string[]=[],api:string[]=[],actions:Array<{name:string;atMs:number}>=[],panels:Array<Record<string,unknown>>=[],began=Date.now();
 p.setDefaultTimeout(10000);
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)bad.push(r.url()+':'+r.status());});p.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))api.push(r.url());});
 const tap=async(l:Locator,name:string)=>{if(shape.touch)await l.tap();else await l.click();actions.push({name,atMs:Date.now()-began});};
 const button=(name:string)=>tap(p.getByRole('button',{name,exact:true}),name),close=()=>button('Close panel');
 const title=async(name:string)=>{await expect(p.locator('#panel-title')).toHaveText(name,{timeout:25000});await expect(p.getByRole('dialog')).toBeVisible();};
 const capture=async(name:string,image=true)=>{
  const view=await p.evaluate(()=>{const d=document.querySelector<HTMLDialogElement>('dialog')!,b=document.querySelector<HTMLElement>('#panel-body')!,h=document.querySelector('.dialog-head')?.getBoundingClientRect();return {title:document.querySelector('#panel-title')?.textContent,text:b.innerText.slice(0,5000),scrollPages:Number((d.scrollHeight/d.clientHeight).toFixed(2)),horizontalOverflow:b.scrollWidth>b.clientWidth+1,buttons:[...b.querySelectorAll<HTMLButtonElement>('button')].filter(e=>e.getBoundingClientRect().height>0).map(e=>{const r=e.getBoundingClientRect();return{name:e.innerText,disabled:e.disabled,height:r.height,visible:r.top>=(h?.bottom??0)&&r.bottom<=innerHeight,x:r.x,y:r.y,width:r.width};})};});
  panels.push({name,atMs:Date.now()-began,...view});if(image)await p.screenshot({path:output+'/'+shape.name+'-'+kind+'-'+name+'.png'});
 };
 const places=async(id:string)=>{await tap(p.locator('#places'),'Places');await tap(p.locator('[data-destination="'+id+'"]'),'Walk '+id);await expect.poll(async()=>{const a=await actor(p);return !a.walking&&a.nearby===id;},{timeout:25000}).toBe(true);await tap(p.locator('#interact'),'Inspect '+id);await expect(p.getByRole('dialog')).toBeVisible();};
 const journal=async(name:string)=>{await tap(p.locator('#bag'),'Bag & journal');await button(name);};
 const carp=(id:string)=>p.locator('[data-carpentry-action="'+id+'"]'),post=(id:string)=>p.locator('[data-commission-action="'+id+'"]');
 const confirm=async(id:string)=>{await tap(carp(id),id+' preview');await tap(carp('confirm'),id+' confirm');};
 try{
  if(fixture.state)await p.addInitScript(s=>{if(!sessionStorage.getItem('combined-once')){localStorage.setItem('ih2:workshop:v2',JSON.stringify(s));localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'square',position:{x:24,y:25}}));sessionStorage.setItem('combined-once','1');}},fixture.state);
  await p.goto(base);await expect.poll(()=>p.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);const before=await state(p);assert.equal(isCurrentWorkshop(before),true);await p.screenshot({path:output+'/'+shape.name+'-'+kind+'-world.png'});
  await places('clerk');await title('Marlow · Town clerk');await capture('clerk-first',false);const firstClerk=panels.at(-1)!.text;await close();
  await journal('Your allotment · crops, markers & quests');await button('Walk to the beds');await title('Your rented allotment');await capture('garden');
  if(kind==='fresh'){await tap(p.locator('[data-garden-action=preview-plant]'),'Free crop preview');await tap(p.locator('[data-garden-action=cancel-preview]'),'Cancel crop preview');await tap(p.locator('[data-garden-action=preview-plant]'),'Review first radish');await tap(p.locator('[data-garden-action=plant]'),'Plant ordinary bound first radish');await tap(p.locator('[data-garden-action=observe]'),'Inspect leaves once');}
  if(kind==='returning'){const ready=(await state(p)).garden.beds.findIndex(b=>b&&b.readyAt<=Date.now());assert.ok(ready>=0);await tap(p.locator('[data-garden-bed="'+ready+'"]'),'Choose returned crop');await tap(p.locator('[data-garden-action=harvest]'),'Harvest returned crop');}
  if(kind==='saturated')assert.equal(await p.locator('[data-garden-action=harvest]').isEnabled(),false);
  if(shape.name==='short'){await p.evaluate(()=>document.documentElement.style.fontSize='200%');await p.keyboard.press('Tab');await p.locator('[data-garden-action=harvest]').focus();await p.waitForTimeout(100);await capture('garden-text200');await p.evaluate(()=>document.documentElement.style.fontSize='');}
  await close();await journal('Pine workshop · tools, easels & hampers');await button('Walk to Nella');await title('Nella’s pine workshop');await capture('nella',false);
  if(!(await state(p)).carpentry.saw.owned)await confirm('learn-saw');if(!(await state(p)).carpentry.saw.equipped)await confirm('equip-saw');
  await button('Find fallen pine');await title('Crooked pine deadfall');await capture('pine');await tap(carp('gather-pine'),'Review personal pine');if(await carp('confirm').isEnabled())await tap(carp('confirm'),'Prepare available pine');else await tap(carp('cancel'),'Keep full/depleted pine');
  await button('Use the finishing rack');await title('Pine finishing rack');await capture('rack');
  if(kind==='returning')await tap(carp('claim-easel'),'Collect returned kept easel');
  else if(await carp('start-easel').isEnabled()){await tap(carp('start-easel'),'Review independent easel');await capture('easel-quote',false);await tap(carp('cancel'),'Keep existing ingredients');}
  await close();
  if(kind==='returning'){
   for(let step=0;step<12;step++){
    await expect.poll(()=>p.evaluate(()=>{const x=(window as any).__pilot;return !x.snapshot().locked&&!x.snapshot().walking&&x.metrics().visual.home.room===x.snapshot().room;})).toBe(true);const frame=await p.evaluate(()=>(window as any).__pilot.metrics().presentation.renderedFrames);await expect.poll(()=>p.evaluate(()=>(window as any).__pilot.metrics().presentation.renderedFrames)).toBeGreaterThan(frame);
    const at=await p.evaluate(()=>(window as any).__pilot.screenPoint(5,3.5)),canvas=(await p.locator('canvas').boundingBox())!,visible=at.x>20&&at.x<canvas.width-20&&at.y>20&&at.y<canvas.height-20;
    const x=canvas.x+Math.max(20,Math.min(canvas.width-20,at.x)),y=canvas.y+Math.max(20,Math.min(canvas.height-20,at.y));
    const prior=await actor(p);if(shape.touch)await p.touchscreen.tap(x,y);else await p.mouse.click(x,y);actions.push({name:(visible?'Direct canvas bench target':'Visible camera approach step')+' '+JSON.stringify({target:at,tap:{x,y},step}),atMs:Date.now()-began});
    if(visible)break;
    await expect.poll(async()=>{const a=await actor(p);return a.locked||a.walking||Math.hypot(a.position.x-prior.position.x,a.position.y-prior.position.y)>.01;},{timeout:25000}).toBe(true);
    if((await actor(p)).locked)break;await expect.poll(async()=>!(await actor(p)).walking,{timeout:25000}).toBe(true);if((await actor(p)).locked)break;assert.ok(step<11,'Bench becomes visible through actual approaches');
   }
   await title('Your work bench');await button('Collect finished work');await capture('ordinary-return',false);await close();
  }
  await journal('Pip’s post · route & letterbox');await tap(post('walk-courier'),'Walk to Pip');await title('Pip · Town courier');await tap(post('open-courier'),'Open post route');
  if(kind==='fresh'){await tap(post('accept'),'Accept free addressed chapter');await tap(post('walk-clerk'),'Walk first addressed parcel');await title('Marlow · Town clerk');await tap(post('open-clerk'),'Choose addressed handover');await tap(post('handover-clerk'),'Hand Marlow parcel explicitly');await close();await journal('Pip’s post · route & letterbox');}
  else if(!(await state(p)).owned.letterbox){await tap(post('review'),'Free letterbox quote');await capture('post-quote',false);await tap(post('cancel'),'Keep all ingredients');}
  await capture('post');await close();await places('clerk');await title('Marlow · Town clerk');await capture('clerk-repeat',false);const repeatClerk=panels.at(-1)!.text;await close();
  const after=await state(p);assert.equal(isCurrentWorkshop(after),true);assert.deepEqual(after.inventory,before.inventory);if(kind!=='returning')assert.deepEqual(after.job,before.job);else{assert.equal(after.bridgeKits,before.bridgeKits+1);assert.equal(after.owned.easel,before.owned.easel+1);}
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);assert.deepEqual(api,[]);
  rows.push({shape,kind,fixture:fixture.disclosure,actions,panels,firstClerk,repeatClerk,sameClerkText:firstClerk===repeatClerk,elapsedMs:Date.now()-began,before:{job:before.job,easelJob:before.carpentry.job,produce:before.garden.produce,pine:before.carpentry.pine.carried},after:{job:after.job,easelJob:after.carpentry.job,produce:after.garden.produce,pine:after.carpentry.pine.carried,box:after.owned.letterbox,freeRoute:after.commission},errors,bad,api,completed:true});console.log('Observed',shape.name,kind,actions.length,'actual inputs');
 }catch(error){await p.screenshot({path:output+'/'+shape.name+'-'+kind+'-failure.png'}).catch(()=>{});rows.push({shape,kind,fixture:fixture.disclosure,actions,panels,errors,bad,api,completed:false,failure:String(error)});console.error('Rejected observation',shape.name,kind,String(error));}
 finally{await context.close();}
}}
finally{await browser.close();}
await writeFile(output+'/local-observations.json',JSON.stringify({classification:'Actual agent UI observations on accepted071artifact; not human retention, physical phone, hosted or server authority',base,htmlSha256,acceptedMerge:accepted.merge,disclosure:'Fresh is empty ordinary input. Three other states are current-pure-command elapsed saves with separately declared default square position; no arbitrary stock/clock changes during UI, no API interception/shared login/practice writes. Short200font is an explicit DOM layout fixture. Known-answer agent durations are not playtime.',rows},null,2)+'\n');
if(rows.some(r=>!r.completed))process.exitCode=1;
