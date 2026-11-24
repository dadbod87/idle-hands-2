import{revealPlace}from'./helpers/places.ts';
import{test,expect,type Page}from'@playwright/test';import{mkdirSync,writeFileSync}from'node:fs';
const out=process.env.QA_EVIDENCE_DIR??'test-results/browser',view=(p:Page)=>p.locator('.collection-receipt'),town=(p:Page)=>p.evaluate(()=>(window as any).__pilot.town());
async function visit(p:Page,id:string){await p.locator('#places').click();await (await revealPlace(p,'[data-destination="'+id+'"]')).click();await expect.poll(()=>p.evaluate(()=>(window as any).__pilot.snapshot().walking),{timeout:process.env.CI?40000:12000}).toBe(false);await p.locator('#interact').click();await expect(p.locator('#panel-title')).toContainText('depot');}
const cleanup=new WeakMap<Page,()=>void>();test.afterEach(({page})=>{cleanup.get(page)?.();});
const close=(p:Page)=>p.getByRole('button',{name:'Close panel'}).click();
test('saved starter receipts offer an explicit walk through the remaining materials and bench',async({browser})=>{
 for(const touch of [false,true]){
  const context=await browser.newContext({viewport:touch?{width:320,height:640}:{width:1440,height:900},hasTouch:touch});
  try{
   const page=await context.newPage(),requests:string[]=[],errors:string[]=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))requests.push(request.url());});
   const stock=()=>page.evaluate(()=>(window as any).__pilot.workshop());
   const button=(name:string)=>page.getByRole('button',{name,exact:true});
   const hit=async(name:string)=>{if(touch)await button(name).tap();else await button(name).press('Enter');};
   await page.goto('/');
   await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
   await visit(page,'scrap');
   const gather=button('Collect available scrap'),starting=await gather.boundingBox();
   await expect(button('Walk to Timber depot')).toBeHidden();
   await hit('Collect available scrap');
   await expect(view(page)).toHaveAttribute('data-collection-saved','true');
   expect(await gather.boundingBox()).toEqual(starting);
   expect((await stock()).inventory).toEqual({scrap:6,timber:0,supplies:0});
   await hit('Walk to Timber depot');
   await expect(page.getByRole('dialog',{name:'Timber depot'})).toBeVisible({timeout:20000});
   expect((await stock()).inventory.timber).toBe(0);
   await hit('Collect available timber');
   await expect(view(page)).toHaveAttribute('data-collection-saved','true');
   await hit('Walk to Supplies depot');
   await expect(page.getByRole('dialog',{name:'Supplies depot'})).toBeVisible({timeout:20000});
   expect((await stock()).inventory.supplies).toBe(0);
   await hit('Collect available supplies');
   await expect(view(page)).toHaveAttribute('data-collection-saved','true');
   await button('Walk to the work bench').evaluate(element=>element.scrollIntoView({block:'center'}));
   await expect(button('Walk to the work bench')).toBeInViewport({ratio:1});
   await page.screenshot({path:`${out}/starter-route-${touch?'phone':'desktop'}.png`});
   if(touch){
    await page.setViewportSize({width:844,height:390});
    await page.evaluate(()=>document.documentElement.style.fontSize='200%');
    const next=button('Walk to the work bench');
    await next.evaluate(element=>element.scrollIntoView({block:'center'}));
    await expect(next).toBeInViewport({ratio:1});
    await expect.poll(async()=>{
     const bounds=await next.boundingBox(),header=await page.locator('.dialog-head').boundingBox();
     return !!bounds&&!!header&&bounds.y>=header.y+header.height&&bounds.height>=44;
    }).toBe(true);
    await page.screenshot({path:`${out}/starter-route-short.png`});
   }
   await hit('Walk to the work bench');
   if(touch){
    await page.setViewportSize({width:320,height:640});
    await page.evaluate(()=>document.documentElement.style.fontSize='100%');
   }
   await expect(page.getByRole('dialog',{name:'Your work bench',exact:true})).toBeVisible({timeout:30000});
   const journal=page.locator('#journal'),journalBox=await journal.boundingBox();
   const mark=journal.locator('#journal-ready-mark');
   await expect(mark).toBeHidden();
   const atBench=await stock();
   expect(atBench.inventory).toEqual({scrap:6,timber:6,supplies:6});
   expect(atBench.job).toBeNull();
   await hit('Make Optimistic planter');
   await expect.poll(async()=>(await stock()).job?.recipe).toBe('planter');
   await expect(mark).toBeHidden();
   await expect(button('Collect finished work')).toBeEnabled({timeout:8000});
   await expect(mark).toBeVisible({timeout:3000});
   expect(await journal.boundingBox()).toEqual(journalBox);
   expect((await stock()).owned.planter).toBe(0);
   await hit('Close panel');
   await expect(button('Journal')).toHaveAccessibleDescription('Work is ready to check in the Journal.');
   await page.screenshot({path:`${out}/starter-ready-${touch?'phone':'desktop'}.png`});
   await hit('Journal');
   await expect(page.locator('.activity-note').first()).toHaveAttribute('data-activity','bench');
   await hit('Open work bench · jobs & recipes');
   await hit('Collect finished work');
   await expect.poll(async()=>(await stock()).owned.planter).toBe(1);
   await expect(mark).toBeHidden();
   await expect(journal).not.toHaveAttribute('aria-describedby');
   await hit('Open bag');
   await expect(page.getByRole('dialog',{name:'Bag',exact:true})).toBeVisible();
   expect(requests).toEqual([]);
   expect(errors).toEqual([]);
  }finally{await context.close();}
 }
});
test('actual shared collection: snapshot before lost reply, original retry, stale view and legacy/corrupt metadata',async({page})=>{
 mkdirSync(out,{recursive:true});const errors:string[]=[],ids:string[]=[],responses:any[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1440,height:900});await page.goto('/?town=1');await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);await page.getByRole('button',{name:'Mira',exact:true}).click();await expect.poll(async()=>(await town(page))?.playerId).toBe('receipt-maker');
 let first:()=>void=()=>{},second:()=>void=()=>{},third:()=>void=()=>{},attempts=0;const firstGate=new Promise<void>(r=>first=r),secondGate=new Promise<void>(r=>second=r),thirdGate=new Promise<void>(r=>third=r);cleanup.set(page,()=>{first();second();third();});
 await page.route('**/api/town/command',async route=>{const dto=route.request().postDataJSON();if(dto.kind!=='gather')return route.continue();ids.push(dto.id);const response=await route.fetch(),body=await response.json();responses.push(body);if(dto.resource==='scrap'){if(++attempts===1){await firstGate;await route.abort();return;}if(attempts===2)await secondGate;else await thirdGate;return route.fulfill({response,json:body});}if(dto.resource==='timber')body.collection={...body.collection,commandId:'foreign-command'};else delete body.collection;await route.fulfill({response,json:body});});
 await visit(page,'scrap');await expect(view(page)).toHaveAttribute('data-collection-art','ready');await page.locator('[data-collect]').click();await expect.poll(()=>responses.length).toBe(1);
 // Trigger an ordinary real snapshot refresh before the held command reply; no inventory fixture.
 await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await expect.poll(async()=>(await town(page)).workshop.inventory.scrap).toBe(6);await expect(view(page)).not.toHaveAttribute('data-collection-quantity');first();await expect(page.locator('.remote-retry')).toHaveAttribute('aria-disabled','false');await page.locator('.remote-retry').click();await expect.poll(()=>responses.length).toBe(2);
 const before=await page.locator('[data-collect]').boundingBox(),retryBefore=await page.locator('.remote-retry').boundingBox(),scroll=await page.locator('dialog').evaluate(e=>e.scrollTop),b=before!;await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();second();await expect(view(page)).toHaveAttribute('data-collection-quantity','6');expect(await page.locator('[data-collect]').boundingBox()).toEqual(before);expect(await page.locator('.remote-retry').boundingBox()).toEqual(retryBefore);expect(await page.locator('dialog').evaluate(e=>e.scrollTop)).toBe(scroll);await page.mouse.up();expect(ids[0]).toBe(ids[1]);expect(responses[1].collection).toEqual(responses[0].collection);expect((await town(page)).workshop.inventory.scrap).toBe(6);await expect(view(page)).toHaveAttribute('data-collection-animating','false');await page.screenshot({path:out+'/collection-shared-desktop.png'});await close(page);
 for(const resource of ['timber','supplies']){await visit(page,resource);await page.locator('[data-collect]').click();await expect.poll(async()=>(await town(page)).workshop.inventory[resource]).toBe(6);await expect(view(page)).not.toHaveAttribute('data-collection-quantity');await expect(page.locator('.collection-actor')).toBeHidden();await expect(page.locator('.collection-status')).toContainText('Gathered 6');await close(page);}
 await page.reload();await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);await expect.poll(async()=>(await town(page))?.playerId).toBe('receipt-maker');await visit(page,'scrap');await expect(view(page)).not.toHaveAttribute('data-collection-quantity');await expect(page.locator('.collection-actor')).toBeHidden();await close(page);await page.locator('#resident').click();await page.getByRole('button',{name:'Sol',exact:true}).click();await expect.poll(async()=>(await town(page))?.playerId).toBe('receipt-other');await visit(page,'scrap');await page.locator('[data-collect]').click();await expect.poll(()=>responses.length).toBe(5);await close(page);await page.locator('#field-guide').click();third();await expect.poll(async()=>(await town(page)).workshop.inventory.scrap).toBe(6);await expect(page.locator('#panel-title')).toHaveText('Town field guide');await expect(view(page)).toHaveCount(0);await close(page);await visit(page,'scrap');await expect(view(page)).not.toHaveAttribute('data-collection-quantity');await expect(page.locator('.collection-actor')).toBeHidden();expect(errors).toEqual([]);
 writeFileSync(out+'/collection-shared-proof.json',JSON.stringify({disclosure:'Real isolated ih2_browser server/player and ordinary zero-progress inventory. First committed reply aborted after synthetic visibilitychange caused a real earlier snapshot; retry response held during native pointer press. Timber grant commandId corrupted and supplies grant omitted only on client wire. No protected practice, currency or inventory grants.',ids,originalGrant:responses[0].collection,replayGrant:responses[1].collection,finalInventory:(await town(page)).workshop.inventory,errors},null,2)+'\n');
});
test('local receipt: asset failure/late decode do not gate collection; responsive keyboard controls remain visible',async({page})=>{
 mkdirSync(out,{recursive:true});const errors:string[]=[],layouts:any[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1440,height:900});let failed=0;await page.route('**/art/collection/devon-scrap.svg',route=>{failed++;return route.abort();});await page.goto('/');await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);await visit(page,'scrap');await expect(view(page)).toHaveAttribute('data-collection-art','failed');await page.locator('[data-collect]').click();await expect(view(page)).toHaveAttribute('data-collection-quantity','6');await expect(page.locator('.collection-status')).toContainText('Gathered 6');await expect(page.locator('.collection-art-note')).toContainText('unavailable');expect(failed).toBe(1);await close(page);await page.unroute('**/art/collection/devon-scrap.svg');await visit(page,'scrap');await expect(view(page)).toHaveAttribute('data-collection-art','ready');await expect(view(page)).not.toHaveAttribute('data-collection-quantity');await close(page);
 let release:()=>void=()=>{},held=false;const gate=new Promise<void>(r=>release=r);cleanup.set(page,()=>release());await page.route('**/art/collection/devon-timber.svg',async route=>{held=true;await gate;await route.continue();});await visit(page,'timber');await expect.poll(()=>held).toBe(true);await page.locator('[data-collect]').click();await expect(view(page)).toHaveAttribute('data-collection-quantity','6');await expect(page.locator('.collection-actor')).toBeHidden();release();await expect(view(page)).toHaveAttribute('data-collection-art','ready');await expect(page.locator('.collection-actor')).toBeVisible();await expect(view(page)).toHaveAttribute('data-collection-animating','false');
 for(const shape of [{name:'phone320',w:320,h:568,text:100},{name:'phone360',w:360,h:640,text:100},{name:'short200',w:844,h:390,text:200},{name:'phone200',w:320,h:640,text:200}]){
  const frameBefore=await page.evaluate(()=>(window as any).__pilot.metrics().presentation.renderedFrames);await page.setViewportSize({width:shape.w,height:shape.h});await page.evaluate(text=>document.documentElement.style.fontSize=text+'%',shape.text);await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.metrics().presentation.renderedFrames)).toBeGreaterThanOrEqual(frameBefore+2);await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));await page.getByRole('button',{name:'Close panel'}).focus();await page.keyboard.press('Tab');await expect(page.locator('[data-collect]')).toBeFocused();const button=(await page.locator('[data-collect]').boundingBox())!,head=(await page.locator('.dialog-head').boundingBox())!;expect(button.y).toBeGreaterThanOrEqual(head.y+head.height-1);expect(button.y+button.height).toBeLessThanOrEqual(shape.h);expect(button.height).toBeGreaterThanOrEqual(44);expect(await page.locator('dialog').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);await expect(page.locator('.resource-list dd')).toHaveCount(3);await page.screenshot({path:out+'/collection-runtime-'+shape.name+'.png'});layouts.push({shape,button,header:head});
 }
 expect(errors).toEqual([]);writeFileSync(out+'/collection-local-proof.json',JSON.stringify({disclosure:'Fresh local ordinary game collection; explicit image abort/hold fixtures only, no state/time/position/inventory fixture. Native keyboard/viewport/text emulation, not physical phone.',layouts,initialFailedRequests:failed,lateArtDidNotReplay:true,errors},null,2)+'\n');
});
