import{test,expect,type Page,type Locator}from'@playwright/test';import{mkdirSync,writeFileSync}from'node:fs';import{revealPlace}from'./helpers/places.ts';
const out='test-results/browser',state=(p:Page)=>p.evaluate(()=>(window as any).__pilot.workshop()),scene=(p:Page)=>p.evaluate(()=>(window as any).__pilot.snapshot());
for(const shape of[{name:'desktop',width:1440,height:900,touch:false},{name:'phone',width:360,height:640,touch:true}])test('crafting clarity '+shape.name+': native grouped travel, exact first output, stable real readiness and visible claimed Bag handoff',async({browser})=>{
 mkdirSync(out,{recursive:true});const c=await browser.newContext({viewport:{width:shape.width,height:shape.height},hasTouch:shape.touch}),p=await c.newPage(),errors:string[]=[],api:string[]=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.url().includes('/api/'))api.push(r.url());});const press=async(l:Locator)=>shape.touch?l.tap():l.click();
 async function close(){await press(p.getByRole('button',{name:'Close panel'}));}
 async function visit(id:string){await press(p.locator('#places'));await press(await revealPlace(p,'[data-destination="'+id+'"]'));await expect.poll(async()=>(await scene(p)).walking,{timeout:process.env.CI?30000:12000}).toBe(false);await expect.poll(async()=>(await scene(p)).nearby).toBe(id);await press(p.locator('#interact'));}
 try{
  await p.goto('/');await expect.poll(()=>p.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);const initial=await state(p);await press(p.locator('#places'));await expect(p.locator('[data-destination]')).toHaveCount(40);
  await expect(p.locator('[data-places-group=town] [data-destination=lodging-door]')).toHaveCount(1);
  await expect(p.locator('[data-destination]:not([data-destination^=outing-],[data-destination^=orchard-branch-],[data-destination=lodging-door])')).toHaveCount(32);
  for(const id of ['low-branch','two-forks','over-the-path'])await expect(p.locator('[data-destination="orchard-branch-'+id+'"]')).toHaveCount(1);for(const id of['outing-desk','outing-crossing','outing-detour','outing-post'])await expect(p.locator('[data-destination="'+id+'"]')).toHaveCount(1);await expect(p.locator('[data-destination]:visible')).toHaveCount(3);await expect(p.locator('.places-primary')).toContainText('Scrap depot');await expect(p.locator('.places-primary')).toContainText('Timber depot');await expect(p.locator('.places-primary')).toContainText('Supply depot');await p.screenshot({path:out+'/craft-'+shape.name+'-places.png'});const group=p.locator('[data-places-group=work]');await group.locator('summary').focus();await p.keyboard.press('Enter');await expect(group).toHaveAttribute('open','');expect((await state(p)).inventory).toEqual(initial.inventory);await close();
  await visit('workshop');await expect.poll(async()=>(await scene(p)).room).toBe('workshop');await visit('bench');await expect(p.locator('[data-claim]')).toBeHidden();await expect(p.locator('[data-craft=planter]')).toBeDisabled();await expect(p.locator('[data-recipe-reason=planter]')).toContainText('Need 2 scrap + 2 timber + 1 supplies');await expect(p.locator('[data-recipe-card=planter]')).toContainText('1 Optimistic planter');await expect(p.locator('[data-recipe-card=planter]')).toContainText('Bag · Furniture');await expect(p.locator('[data-recipe-time=planter]')).toHaveText('5 seconds · first planter');await p.screenshot({path:out+'/craft-'+shape.name+'-empty.png'});await close();await visit('door');await expect.poll(async()=>(await scene(p)).room).toBe('square');
  for(const id of['scrap','timber','supplies']){await visit(id);await press(p.locator('[data-collect]'));await expect.poll(async()=>(await state(p)).inventory[id]).toBe(6);await close();}
  await visit('workshop');await expect.poll(async()=>(await scene(p)).room).toBe('workshop');await visit('bench');await expect(p.locator('[data-craft=planter]')).toBeEnabled();await expect(p.locator('[data-recipe-reason="bridge-kit"]')).toContainText('Place your first planter');await p.screenshot({path:out+'/craft-'+shape.name+'-recipe.png'});await press(p.getByRole('button',{name:'Make Optimistic planter',exact:true}));const started=await state(p),job=started.job;expect(job.readyAt-job.startedAt).toBe(5000);expect(started.inventory).toEqual({scrap:4,timber:4,supplies:5});expect(started.owned.planter).toBe(0);await expect(p.locator('[data-bench-title]')).toBeFocused();await expect(p.locator('[data-bench-title]')).toBeInViewport();const claim=p.locator('[data-claim]');await expect(claim).toBeDisabled();const held=(await claim.boundingBox())!;await p.screenshot({path:out+'/craft-'+shape.name+'-working.png'});
  if(!shape.touch){await p.mouse.move(held.x+held.width/2,held.y+held.height/2);await p.mouse.down();}
  await expect(claim).toBeEnabled({timeout:9000});expect(await claim.boundingBox()).toEqual(held);expect((await state(p)).owned.planter).toBe(0);expect((await state(p)).job).toEqual(job);await p.screenshot({path:out+'/craft-'+shape.name+'-ready.png'});if(!shape.touch){await p.mouse.move(1,1);await p.mouse.up();expect((await state(p)).owned.planter).toBe(0);}await press(claim);await expect(claim).toBeHidden();await expect(claim).toBeDisabled();const bag=p.locator('[data-bench-bag]');await expect(bag).toBeFocused();await expect(bag).toBeInViewport();expect(await bag.boundingBox()).toEqual(held);await expect(p.locator('[data-bench-work] [data-job]')).toContainText('Collected');await expect(p.locator('[data-bench-work] [data-job]')).toBeInViewport();const claimed=await state(p);expect(claimed.owned.planter).toBe(1);expect(claimed.job).toBe(null);expect(claimed.inventory).toEqual(started.inventory);await expect(p.locator('[data-recipe-time=planter]')).toHaveText('8 real hours');await p.screenshot({path:out+'/craft-'+shape.name+'-collected.png'});if(shape.touch){await p.setViewportSize({width:320,height:640});await p.evaluate(()=>document.documentElement.style.fontSize='200%');await bag.focus();await expect(bag).toBeInViewport();const word=await p.locator('[data-bench-title]').evaluate(el=>{const text=el.firstChild!,start=text.textContent!.indexOf('Optimistic'),r=document.createRange();r.setStart(text,start);r.setEnd(text,start+10);return r.getClientRects().length;});expect(word).toBe(1);await p.screenshot({path:out+'/craft-phone-collected200.png'});await p.evaluate(()=>document.documentElement.style.fontSize='100%');await p.setViewportSize({width:shape.width,height:shape.height});}await press(bag);await expect(p.locator('[data-bag-item=planter] h4')).toHaveText('Optimistic planter');await expect(p.locator('[data-bag-item=planter] .bag-stack-count')).toHaveText('1');await p.screenshot({path:out+'/craft-'+shape.name+'-bag.png'});
  if(shape.touch){await close();await press(p.locator('#journal'));await press(p.locator('[data-activity-open=bench]'));for(const s of[{name:'narrow',width:320,height:640,text:100},{name:'short200',width:844,height:390,text:200},{name:'narrow200',width:320,height:640,text:200}]){await p.setViewportSize({width:s.width,height:s.height});await p.evaluate(n=>document.documentElement.style.fontSize=n+'%',s.text);expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const word=await p.locator('[data-recipe-card=planter] h4').evaluate(el=>{const text=el.firstChild!,start=text.textContent!.indexOf('Optimistic'),r=document.createRange();r.setStart(text,start);r.setEnd(text,start+'Optimistic'.length);return r.getClientRects().length;});expect(word,'item name must wrap at a word boundary').toBe(1);await p.getByRole('button',{name:'Close panel'}).focus();await p.keyboard.press('Tab');await expect(p.locator('[data-craft=planter]')).toBeFocused();const a=(await p.locator('[data-craft=planter]').boundingBox())!,head=(await p.locator('.dialog-head').boundingBox())!;expect(a.y).toBeGreaterThanOrEqual(head.y+head.height);expect(a.y+a.height).toBeLessThanOrEqual(s.height);const measurements=await p.locator('#panel-body').evaluate(root=>{
    const closed=[...root.querySelectorAll<HTMLDetailsElement>('details:not([open])')];
    // A closed HTML disclosure can report zero bounds for its descendants.
    // Measure the real controls after revealing them, then restore the panel.
    closed.forEach(node=>{node.open=true;});
    try{
     return [...root.querySelectorAll<HTMLElement>('button, summary')].filter(node=>node.getClientRects().length)
      .map(node=>{const {width,height}=node.getBoundingClientRect();
       return {label:node.textContent,width,height,fits:node.scrollHeight<=node.clientHeight};});
    }finally{closed.forEach(node=>{node.open=false;});}
   });
   for(const action of measurements){
    expect(action.width,action.label??'control').toBeGreaterThanOrEqual(44);
    expect(action.height,action.label??'control').toBeGreaterThanOrEqual(44);
    expect(action.fits,action.label??'control').toBe(true);
   }
   await p.screenshot({path:out+'/craft-responsive-'+s.name+'.png'});}expect((await state(p)).inventory).toEqual(claimed.inventory);expect((await state(p)).owned.planter).toBe(1);}
  expect(errors).toEqual([]);expect(api).toEqual([]);writeFileSync(out+'/craft-'+shape.name+'-proof.json',JSON.stringify({disclosure:'Fresh ordinary local defaults, native keyboard/pointer/touch-emulated travel and gathering, real5secondcraft/explicit claim. Viewport/root200only; no player state, position, clock, stock or response fixture. Desktop held press is cancelled outside before explicit claim. Not physical-device testing.',shape,actualJob:job,initialInventory:initial.inventory,startedInventory:started.inventory,claimedInventory:claimed.inventory,unclaimedOutputStayedZero:true,exactClaimedOutput:1,claimAndBagSameActionBounds:held,errors,api},null,2)+'\n');
 }finally{await c.close();}
});
test('shared crafting: pending server response preserves start and collection focus, closed panel stays closed',async({page:p})=>{
 const errors:string[]=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('/?town=1');await p.getByRole('button',{name:'Ivy',exact:true}).click();await expect.poll(()=>p.evaluate(()=>(window as any).__pilot?.town()?.playerId)).toBe('craft-maker');
 const close=()=>p.getByRole('button',{name:'Close panel'}).click();async function visit(id:string){await p.locator('#places').click();await(await revealPlace(p,'[data-destination="'+id+'"]')).click();await expect.poll(async()=>(await scene(p)).walking,{timeout:process.env.CI?30000:12000}).toBe(false);await expect.poll(async()=>(await scene(p)).nearby).toBe(id);await p.locator('#interact').click();}
 expect((await state(p)).inventory).toEqual({scrap:0,timber:0,supplies:0});for(const id of['scrap','timber','supplies']){await visit(id);await p.locator('[data-collect]').click();await expect.poll(async()=>(await state(p)).inventory[id]).toBe(6);await close();}
 await visit('workshop');await expect.poll(async()=>(await scene(p)).room).toBe('workshop');await visit('bench');await p.locator('[data-craft=planter]').click();await expect(p.locator('[data-bench-title]')).toBeFocused();const job=(await state(p)).job;expect(job.readyAt-job.startedAt).toBe(5000);expect((await state(p)).owned.planter).toBe(0);const head=(await p.locator('.dialog-head').boundingBox())!,title=(await p.locator('[data-bench-title]').boundingBox())!;expect(title.y).toBeGreaterThanOrEqual(head.y+head.height);await expect(p.locator('[data-claim]')).toBeEnabled({timeout:9000});expect((await state(p)).owned.planter).toBe(0);await p.locator('[data-claim]').click();await expect(p.locator('[data-bench-bag]')).toBeFocused();expect((await state(p)).owned.planter).toBe(1);
 let release!:()=>void,received!:()=>void;const held=new Promise<void>(r=>release=r),seen=new Promise<void>(r=>received=r);await p.route('**/api/town/command',async route=>{if(route.request().postDataJSON().kind!=='craft')return route.continue();const response=await route.fetch();expect(response.ok()).toBe(true);received();await held;await route.fulfill({response}).catch(()=>{});});
 try{await p.locator('[data-craft=planter]').click();await seen;await close();release();await expect.poll(async()=>(await state(p)).job?.recipe).toBe('planter');await expect(p.getByRole('dialog')).toBeHidden();await expect(p.locator('[data-bench-title]')).toBeHidden();expect(await p.evaluate(()=>document.activeElement?.matches('[data-bench-title],[data-bench-bag]'))).toBe(false);const after=await state(p);expect(after.job.readyAt-after.job.startedAt).toBe(8*60*60*1000);expect(after.inventory).toEqual({scrap:2,timber:2,supplies:4});expect(after.owned.planter).toBe(1);expect(errors).toEqual([]);mkdirSync(out,{recursive:true});writeFileSync(out+'/craft-shared-proof.json',JSON.stringify({disclosure:'Fresh fictional Ivy on real disposable ih2_browser HTTP/SQL; native gathering and real5secondcraft, explicit claim. Second real server craft reply held unchanged until panel closed. No stock, clock or position injection. Aster/Bea/Casey48kit/2planter existing seeds unused.',firstJob:job,secondJob:after.job,inventory:after.inventory,ownedPlanter:after.owned.planter,closedPanelNotReopened:true,errors},null,2)+'\n');}finally{release();}
});

test('missing bench ingredients lead to a depot without automatically collecting',async({browser,browserName})=>{
 mkdirSync(out,{recursive:true});
 for(const shape of [
  {name:'desktop',width:1440,height:900,text:'100%',touch:false},
  {name:'phone',width:320,height:640,text:'100%',touch:true},
  {name:'short',width:844,height:390,text:'200%',touch:false},
 ]){
  const context=await browser.newContext({viewport:{width:shape.width,height:shape.height},hasTouch:shape.touch});
  try{
   const page=await context.newPage();
   const operations:string[]=[],errors:string[]=[];
   page.on('request',request=>{if(request.url().includes('/api/'))operations.push(request.url());});
   page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(()=>{
    localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'workshop',position:{x:5,y:5}}));
   });
   await page.goto('/');
   await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
   await page.evaluate(text=>document.documentElement.style.fontSize=text,shape.text);
   await expect.poll(async()=>(await scene(page)).room).toBe('workshop');
   await page.locator('#journal').click();
   await page.locator('[data-activity-open=bench]').click();
   const planter=page.locator('[data-recipe-card=planter]');
   const paths=planter.locator('.recipe-material-routes');
   await expect(planter.locator('[data-craft]')).toBeDisabled();
   await expect(page.locator('[data-recipe-card=bridge-kit] .recipe-material-routes')).toBeHidden();
   const toggle=paths.locator('summary');
   if(shape.touch)await toggle.tap();
   else{await toggle.focus();await page.keyboard.press('Enter');}
   await expect(paths).toHaveAttribute('open','');
   await expect(paths.getByRole('button')).toHaveCount(3);
   const scrap=paths.getByRole('button',{name:'Walk to the scrap depot'});
   if(shape.touch)await scrap.scrollIntoViewIfNeeded();
   else{await page.keyboard.press(browserName==='webkit'?'Alt+Tab':'Tab');await expect(scrap).toBeFocused();}
   expect((await scrap.boundingBox())!.height).toBeGreaterThanOrEqual(44);
   await expect(scrap).toBeInViewport();
   expect(await paths.evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
   await page.screenshot({path:out+'/craft-shortfall-'+shape.name+'.png'});
   const before=await state(page);
   if(shape.touch)await scrap.tap();
   else await page.keyboard.press('Enter');
   await expect(page.getByRole('heading',{name:'Scrap depot',exact:true})).toBeVisible({timeout:20_000});
   expect(await scene(page)).toMatchObject({room:'square'});
   const arrived=await state(page);
   expect(arrived.inventory).toEqual(before.inventory);
   expect(arrived.job).toBeNull();
   expect(arrived.owned).toEqual(before.owned);
   expect(arrived.nodes.scrap.stock).toBe(before.nodes.scrap.stock);
   const collect=page.locator('[data-collect=scrap]');
   await collect.click();
   await expect.poll(async()=>(await state(page)).inventory.scrap).toBe(6);
   const gathered=await state(page);
   const returnToBench=page.getByRole('button',{name:'Walk to workbench',exact:true});
   await returnToBench.scrollIntoViewIfNeeded();
   await expect(returnToBench).toBeInViewport({ratio:1});
   expect((await returnToBench.boundingBox())!.height).toBeGreaterThanOrEqual(44);
   await page.screenshot({path:out+'/craft-depot-return-'+shape.name+'.png'});
   if(shape.touch)await returnToBench.tap();
   else{await returnToBench.focus();await page.keyboard.press('Enter');}
   await expect(page.getByRole('heading',{name:'Your work bench',exact:true})).toBeVisible({timeout:20_000});
   expect(await scene(page)).toMatchObject({room:'workshop'});
   expect((await state(page)).inventory).toEqual(gathered.inventory);
   expect((await state(page)).job).toBeNull();
   await paths.locator('summary').click();
   await expect(paths.getByRole('button',{name:'Walk to the timber depot'})).toBeVisible();
   await expect(paths.getByRole('button',{name:'Walk to the scrap depot'})).toBeHidden();
   expect(errors).toEqual([]);
   expect(operations).toEqual([]);
  }finally{await context.close();}
 }
});
