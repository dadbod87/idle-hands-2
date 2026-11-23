import{test,expect}from'@playwright/test';import{mkdirSync,writeFileSync}from'node:fs';
import {revealPlace} from "./helpers/places.ts";

import{createWorkshop,applyWorkshop,isCurrentWorkshop}from'../src/game/live-workshop.ts';
const out='test-results/browser',note=(page:any,id:string)=>page.locator('[data-activity="'+id+'"]');
test('notebook: actual five-second job boundary keeps held target, focus, scroll and free inspector actions',async({page})=>{
 mkdirSync(out,{recursive:true});const started=Date.now();let s=createWorkshop(started);for(const resource of['scrap','timber','supplies']as const)s=applyWorkshop(s,{kind:'gather',resource,id:'notebook-'+resource,expectedRevision:s.revision},started).state;expect(isCurrentWorkshop(s)).toBe(true);
 await page.addInitScript(save=>{localStorage.setItem('ih2:workshop:v2',JSON.stringify(save));localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'workshop',position:{x:5,y:5}}));},s);await page.goto('/');await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);await page.locator('#journal').click();await page.locator('[data-activity-open=bench]').click();await page.getByRole('button',{name:'Make Optimistic planter',exact:true}).click();await page.getByRole('button',{name:'Close panel'}).click();await page.locator('#journal').click();await expect(page.locator('.activity-note')).toHaveCount(3);const button=page.locator('[data-activity-open=bench]');await button.focus();await expect(note(page,'bench')).toHaveAttribute('data-phase','running');const bounds=(await button.boundingBox())!,scroll=await page.locator('dialog').evaluate(e=>e.scrollTop);await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.down();await expect(note(page,'bench')).toHaveAttribute('data-phase','ready',{timeout:9000});expect(await button.boundingBox()).toEqual(bounds);expect(await page.locator('dialog').evaluate(e=>e.scrollTop)).toBe(scroll);await expect(button).toBeFocused();expect(await page.evaluate(()=>(window as any).__pilot.workshop().owned.planter)).toBe(0);await page.mouse.up();await expect(page.locator('#panel-title')).toHaveText('Your work bench');await expect(page.getByRole('button',{name:'Collect finished work'})).toBeEnabled();expect(await page.evaluate(()=>(window as any).__pilot.workshop().revision)).toBe(s.revision+1);await page.getByRole('button',{name:'Close panel'}).click();await page.locator('#journal').click();await expect(note(page,'bench')).toHaveAttribute('data-phase','ready');await page.screenshot({path:out+'/notebook-desktop-ready.png'});
 writeFileSync(out+'/notebook-boundary.json',JSON.stringify({fixture:'Valid material save created by ordinary pure gathers and an explicit workshop spawn fixture. Craft starts through the actual UI after boot; the actual five-second teaching job is waited, not claimed. No accelerated time or response interception.',heldBounds:bounds,finalRevision:s.revision+1,ownedPlanter:0},null,2)+'\n');
});
test('notebook: native isolated shared snapshots and all three free inspectors never issue a command',async({page})=>{
 const commands:string[]=[],errors:string[]=[];
 page.on('request',r=>{if(r.url().endsWith('/api/town/command'))commands.push(r.postData()??'');});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?town=1');await page.getByRole('button',{name:'Mira',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.town()?.playerId)).toBe('receipt-maker');
 await page.locator('#journal').click();await expect(page.locator('.activity-note')).toHaveCount(3);
 await expect(page.locator('#panel-body')).toHaveAttribute('aria-busy','false');
 await expect(page.locator('.workshop-status')).toHaveText('Confirmed work notes.');
 await page.evaluate(()=>(window as any).__noteAnchor=document.querySelector('[data-activity-open=bench]'));
 const refreshed=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/town/snapshot'&&r.status()===200);
 await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 await(await refreshed).finished();
 await expect(page.locator('#panel-body')).toHaveAttribute('aria-busy','false');
 expect(await page.evaluate(()=>(window as any).__noteAnchor===document.querySelector('[data-activity-open=bench]'))).toBe(true);
 await expect(page.locator('.workshop-status')).toHaveText('Confirmed work notes.');
 // A stable live status must not be rewritten by each ordinary clock tick.
 const statusMutations=()=>page.evaluate(()=>new Promise<number>(resolve=>{
  const status=document.querySelector('.workshop-status')!;let updates=0;
  const observer=new MutationObserver(()=>updates++);observer.observe(status,{childList:true,subtree:true,characterData:true});
  setTimeout(()=>{observer.disconnect();resolve(updates);},2200);
 }));expect(await statusMutations()).toBe(0);
 // Hold one actual read reply unchanged; cached notes remain useful, but a
 // spending pane must still wait for confirmation. No optimistic inventory.
 let hold=true,release=()=>{},received=()=>{};
 const gate=new Promise<void>(resolve=>release=resolve),seen=new Promise<void>(resolve=>received=resolve);
 await page.route('**/api/town/snapshot',async route=>{
  if(!hold)return route.continue();hold=false;
  const response=await route.fetch();expect(response.status()).toBe(200);received();await gate;await route.fulfill({response}).catch(()=>{});
 });
 try{
  for(const[id,title]of[['bench','Your work bench'],['rack','Pine finishing rack'],['garden','Your rented allotment']]as const){
   await page.locator('[data-activity-open='+id+']').click();await expect(page.locator('#panel-title')).toHaveText(title);
   if(id==='bench'){await seen;await expect(page.locator('[data-craft=planter]')).toBeDisabled();}
   await page.getByRole('button',{name:'Close panel'}).click();await page.locator('#journal').click();
   await expect(page.locator('#panel-body')).toHaveAttribute('aria-busy','false');
   await expect(page.locator('.workshop-status')).toContainText('Last confirmed work · update pending.');
   for(const action of await page.locator('[data-activity-open]').all())await expect(action).toBeEnabled();
  }
  expect(await statusMutations()).toBe(0);
  await page.screenshot({path:out+'/notebook-shared-pending-read.png'});
 }finally{release();}
 await expect(page.locator('.workshop-status')).toHaveText('Confirmed work notes.');
 await page.screenshot({path:out+'/notebook-shared-fresh.png'});
 expect(commands).toEqual([]);expect(errors).toEqual([]);
 expect(await page.evaluate(()=>(window as any).__pilot.town().workshop.inventory)).toEqual({scrap:0,timber:0,supplies:0});
 writeFileSync(out+'/notebook-shared.json',JSON.stringify({disclosure:'Actual disposable ih2_browser fresh zero-progress fictional Mira; normal server snapshots, free inspector navigation and synthetic visibility event. One real unchanged read reply held while opening all3inspectors; no state/time/position/inventory injection or grant. Response-delay interception is explicit.',commandRequests:commands,errors,confirmedNavigationUsableDuringRead:true,spendingStillBlockedUntilReadConfirmed:true},null,2)+'\n');
});
test('notebook: full produce, independent work and doubled-text keyboard reading preserve controls on narrow and short views',async({page})=>{
 const now=Date.now(),s=createWorkshop(now),g=s.garden;g.firstRadishUsed=true;g.seeds.radish=1;g.beds=[{crop:'radish',plantedAt:now-300_000,readyAt:now,cared:false},null,null];g.produce.radish=12;g.harvested.radish=12;g.planted=13;g.practice=12;expect(isCurrentWorkshop(s)).toBe(true);await page.addInitScript(save=>localStorage.setItem('ih2:workshop:v2',JSON.stringify(save)),s);await page.goto('/');await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);await page.locator('#journal').click();await expect(note(page,'garden')).toHaveAttribute('data-phase','blocked');await expect(note(page,'garden').locator('.activity-status')).toContainText('1 need room');const layouts=[];
 for(const shape of[{name:'phone320',w:320,h:568,text:100},{name:'phone360',w:360,h:640,text:100},{name:'short200',w:844,h:390,text:200},{name:'phone200',w:320,h:640,text:200}]){const frame=await page.evaluate(()=>(window as any).__pilot.metrics().presentation.renderedFrames);await page.setViewportSize({width:shape.w,height:shape.h});await page.evaluate(size=>document.documentElement.style.fontSize=size+'%',shape.text);await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.metrics().presentation.renderedFrames)).toBeGreaterThanOrEqual(frame+2);await page.getByRole('button',{name:'Close panel'}).focus();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Open bag',exact:true})).toBeFocused();await page.keyboard.press('Tab');await expect(note(page,'bench').locator('.activity-status')).toBeFocused();await page.keyboard.press('Tab');const button=page.locator('[data-activity-open=bench]');await expect(button).toBeFocused();const b=(await button.boundingBox())!,h=(await page.locator('.dialog-head').boundingBox())!;expect(b.y).toBeGreaterThanOrEqual(h.y+h.height);expect(b.y+b.height).toBeLessThanOrEqual(shape.h);expect(b.height).toBeGreaterThanOrEqual(44);for(const action of await page.locator('[data-activity-open]').all()){expect(await action.getAttribute('aria-label')).toContain((await action.textContent())!.trim());expect(await action.evaluate(e=>e.scrollHeight<=e.clientHeight),shape.name+' '+await action.getAttribute('data-activity-open')).toBe(true);}expect(await page.locator('dialog').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);await page.screenshot({path:out+'/notebook-'+shape.name+'.png'});layouts.push({shape,button:b,header:h});}
 await page.locator('.activity-notebook summary').focus();await page.keyboard.press('Enter');await expect(page.locator('.activity-notebook details')).toHaveAttribute('open','');await expect(page.locator('.activity-notebook details')).toContainText('0 can fit');expect(await page.evaluate(()=>(window as any).__pilot.workshop().garden.produce.radish)).toBe(12);writeFileSync(out+'/notebook-responsive.json',JSON.stringify({disclosure:'Valid elapsed local garden save with full held radishes/one mature teaching crop. No real-player change or UI state mutation after load. Viewport/text/keyboard emulation, not a physical phone.',layouts},null,2)+'\n');
});

test('Journal keeps the full recent field note after it has left the playfield',async({browser})=>{
 const evidence=out+'/recent-field-notes';mkdirSync(evidence,{recursive:true});
 for(const {name,width,height,touch,text} of [
  {name:'desktop',width:1440,height:900,touch:false,text:100},
  {name:'phone',width:320,height:640,touch:true,text:100},
  {name:'short',width:844,height:390,touch:true,text:200},
 ]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch});
  try{
   const page=await context.newPage(),errors:string[]=[],api:string[]=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))api.push(request.url());});
   await page.goto('/');
   await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
   await page.evaluate(size=>document.documentElement.style.fontSize=size+'%',text);
   const feedback=page.locator('#feedback'),first=await feedback.innerText();
   const state=await page.evaluate(()=>(window as any).__pilot.workshop());
   await page.locator('#places').click();
   const workshop=await revealPlace(page,'[data-destination=workshop]');
   if(touch)await workshop.tap();else await workshop.press('Enter');
   await expect(feedback).toContainText(/Walking to.*workshop/i);
   const note=await feedback.innerText();
   await page.locator('#journal').click();
   const history=page.locator('.journal-recent-notes'),summary=history.locator('summary');
   await expect(history).not.toHaveAttribute('open');
   if(touch)await summary.tap();else await summary.press('Enter');
   const log=page.getByRole('list',{name:'Recent field notes'});
   await expect(log.getByRole('listitem').first()).toContainText(note);
   await expect(log).toContainText(first);
   const stamp=await log.locator('time').first().getAttribute('datetime');
   expect(Date.parse(stamp??'')).toBeGreaterThan(0);
   expect(await page.getByRole('dialog').evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
   await log.getByRole('listitem').first().scrollIntoViewIfNeeded();
   await page.screenshot({path:evidence+'/'+name+'.png'});
   if(name==='short'){
    const last=log.getByRole('listitem').last();
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport({ratio:1});
    await page.screenshot({path:evidence+'/short-scrolled.png'});
   }

   expect(await page.evaluate(()=>(window as any).__pilot.workshop().inventory)).toEqual(state.inventory);
   expect(errors).toEqual([]);expect(api).toEqual([]);
  }finally{await context.close();}
 }
});
