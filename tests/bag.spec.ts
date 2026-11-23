import{test,expect,type Page}from'@playwright/test';import{mkdirSync,writeFileSync}from'node:fs';import{createWorkshop,applyWorkshop,isCurrentWorkshop,type WorkshopCommand}from'../src/game/live-workshop.ts';
const out='test-results/browser',stack=(p:Page,id:string)=>p.locator('[data-bag-item="'+id+'"]'),count=(p:Page,id:string)=>stack(p,id).locator('.bag-stack-count');
async function ready(p:Page){await expect.poll(()=>p.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);}
function queuedSecond(){const start=Date.now()-8*3600000-5000;let s=createWorkshop(start);for(const resource of ['scrap','timber','supplies'])s=applyWorkshop(s,{kind:'gather',resource,id:'bag-'+resource,expectedRevision:s.revision},start).state;for(const [kind,id,at]of [['craft','first',start],['claim','first-claim',start+5000],['craft','second',start+5000]] as const){const result=applyWorkshop(s,{kind,id,...(kind==='craft'?{recipe:'planter'}:{}),expectedRevision:s.revision},at);expect(result.ok).toBe(true);s=result.state;}expect(isCurrentWorkshop(s)).toBe(true);return s;}
test('bag: native claimed craft stacks, placed copies leave the bag, returned copies and reload conserve ownership',async({page})=>{
 mkdirSync(out,{recursive:true});const s=queuedSecond();await page.addInitScript(save=>{if(!sessionStorage.getItem('bag-fixture')){localStorage.setItem('ih2:workshop:v2',JSON.stringify(save));localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'workshop',position:{x:5,y:5}}));sessionStorage.setItem('bag-fixture','1');}},s);await page.goto('/');await ready(page);await page.locator('#bag').click();await expect(count(page,'planter')).toHaveText('1');await page.getByRole('button',{name:'Open journal',exact:true}).click();await page.locator('[data-activity-open=bench]').click();await page.getByRole('button',{name:'Collect finished work',exact:true}).click();await page.getByRole('button',{name:'Close panel'}).click();await page.locator('#bag').click();await expect(count(page,'planter')).toHaveText('2');await expect(count(page,'planter')).toHaveAttribute('aria-label','Optimistic planter: 2 available to place');await expect(page.locator('.bag-count-key')).toHaveText('Numbers show copies available to place.');await page.screenshot({path:out+'/bag-desktop-stacked.png'});
 const choose=page.getByRole('button',{name:'Choose a spot for Optimistic planter',exact:true});
 const originalViewport=page.viewportSize()!;
 for(const [layout,viewport,text]of [['desktop',originalViewport,'100%'],['short',{width:844,height:390},'200%']] as const){
  await page.setViewportSize(viewport);
  await page.evaluate(size=>document.documentElement.style.fontSize=size,text);
  await choose.focus();
  await page.keyboard.press('Enter');
  const firstSpot=page.locator('[data-slot=north-west]');
  await expect(firstSpot).toBeFocused();
  await expect(page.getByRole('button',{name:'Place here',exact:true})).toBeDisabled();
  const spot=(await firstSpot.boundingBox())!,header=(await page.locator('.dialog-head').boundingBox())!;
  expect(spot.y).toBeGreaterThanOrEqual(header.y+header.height);
  expect(spot.y+spot.height).toBeLessThanOrEqual(viewport.height);
  await page.screenshot({path:out+'/bag-choose-spot-'+layout+'.png'});
 }
 await page.setViewportSize(originalViewport);
 await page.evaluate(()=>document.documentElement.style.removeProperty('font-size'));
 await page.getByRole('button',{name:'Arrange furniture',exact:true}).click();await page.getByRole('combobox',{name:'Furniture to place'}).selectOption('planter');await page.locator('[data-slot=north-east]').click();await page.getByRole('button',{name:'Place here',exact:true}).click();await expect(count(page,'planter')).toHaveText('1');await expect(count(page,'planter')).toHaveAttribute('aria-label','Optimistic planter: 1 available to place');await expect(stack(page,'planter')).toContainText('2 owned');await expect(stack(page,'planter')).toContainText('1 placed');await page.locator('[data-slot=north-east]').click();await page.getByRole('button',{name:'Return this furniture to bag',exact:true}).click();await expect(count(page,'planter')).toHaveText('2');await page.reload();await ready(page);await page.locator('#bag').click();await expect(count(page,'planter')).toHaveText('2');expect(await page.evaluate(()=>(window as any).__pilot.workshop().owned.planter)).toBe(2);writeFileSync(out+'/bag-stack-proof.json',JSON.stringify({fixture:'Valid second eight-hour craft built from original pure gather/craft/claim commands; elapsed deadline/workshop spawn declared. Native UI claim and placement/removal/reload; no new grants, interception or rule change.',owned:2,available:2,claimedExplicitly:true},null,2)+'\n');
});
test('bag: a full workshop offers a safe path to make room for an owned item', async ({browser})=>{
 mkdirSync(out,{recursive:true});
 let state=queuedSecond();
 const act=(action:WorkshopCommand)=>{
  const result=applyWorkshop(state,action,Date.now());
  expect(result.ok,result.message).toBe(true);
  state=result.state;
 };
 act({kind:'claim',id:'full-workshop-claim',expectedRevision:state.revision});
 for(const [slot,prop] of [
  ['north-west','stool'],['north-middle','rug'],['north-east','planter'],
  ['south-west','lamp'],['south-middle','crate'],['south-east','shelf'],
 ] as const){
  act({kind:'place',id:'full-workshop-'+slot,expectedRevision:state.revision,slot,prop});
 }
 expect(isCurrentWorkshop(state)).toBe(true);
 for(const shape of [
  {name:'phone',width:320,height:640,text:'100%',touch:true},
  {name:'short',width:844,height:390,text:'200%',touch:false},
 ]){
  const context=await browser.newContext({viewport:{width:shape.width,height:shape.height},hasTouch:shape.touch});
  const page=await context.newPage();
  const errors:string[]=[];
  page.on('pageerror', error=>errors.push(error.message));
  try{
   await page.addInitScript(save=>{
    if(sessionStorage.getItem('full-workshop-fixture'))return;
    localStorage.setItem('ih2:workshop:v2',JSON.stringify(save));
    localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'workshop',position:{x:5,y:5}}));
    sessionStorage.setItem('full-workshop-fixture','1');
   },state);
   await page.goto('/');
   await ready(page);
   await page.evaluate(size=>document.documentElement.style.fontSize=size,shape.text);
   await page.locator('#bag').click();
   const choose=page.getByRole('button',{name:'Choose a spot for Optimistic planter',exact:true});
   if(shape.touch)await choose.tap();
   else{await choose.focus();await page.keyboard.press('Enter');}
   const hint=page.locator('[data-placement-hint]');
   const slot=page.locator('[data-slot=north-west]');
   const place=page.getByRole('button',{name:'Place here',exact:true});
   const remove=page.getByRole('button',{name:'Return this furniture to bag',exact:true});
   await expect(hint).toHaveText('Workshop full. Pick a nook.');
   await expect(hint).toBeFocused();
   await expect(hint).toBeInViewport({ratio:1});
   await expect(slot).toBeInViewport({ratio:.95});
   await expect(place).toBeDisabled();
   await expect(remove).toBeHidden();
   await page.screenshot({path:out+'/bag-full-workshop-'+shape.name+'.png'});
   if(shape.touch)await slot.tap();
   else{await page.keyboard.press('Tab');await expect(slot).toBeFocused();await page.keyboard.press('Enter');}
   await expect(slot).toHaveText('Near the bench: Committee stool · selected');
   await expect(hint).toContainText('to free the nook');
   await expect(place).toBeDisabled();
   const layout=()=>page.evaluate(()=>(window as any).__pilot.workshop().placements);
   expect(await layout()).toEqual(state.placements);
   await remove.click();
   await expect(slot).toHaveText('Near the bench: empty');
   await expect(slot).toBeFocused();
   await expect(count(page,'stool')).toHaveText('1');
   await slot.click();
   await expect(place).toBeEnabled();
   await place.click();
   await expect(slot).toHaveText('Near the bench: Optimistic planter');
   await expect(count(page,'planter')).toHaveText('0');
   await page.reload();
   await ready(page);
   expect(await layout()).toEqual({...state.placements,'north-west':'planter'});
   expect(await page.evaluate(()=>(window as any).__pilot.workshop().owned)).toEqual(state.owned);
   expect(errors).toEqual([]);
  }finally{await context.close();}
 }
});
test('bag: shared snapshots keep slot nodes, free pockets issue no command and identity changes clear old counts',async({page})=>{
 const commands:string[]=[],errors:string[]=[];page.on('request',r=>{if(r.url().endsWith('/api/town/command'))commands.push(r.postData()??'');});page.on('pageerror',e=>errors.push(e.message));await page.goto('/?town=1');await page.getByRole('button',{name:'Mira',exact:true}).click();await ready(page);await page.locator('#bag').click();await expect(page.locator('#panel-body')).toHaveAttribute('aria-busy','false');await expect(count(page,'planter')).toHaveText('0');await page.evaluate(()=>(window as any).__bagSlot=document.querySelector('[data-bag-item=planter]'));await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await expect(page.locator('#panel-body')).toHaveAttribute('aria-busy','false');expect(await page.evaluate(()=>(window as any).__bagSlot===document.querySelector('[data-bag-item=planter]'))).toBe(true);
 for(const [person,kits]of [['Aster','48'],['Sol','0']] as const){await page.getByRole('button',{name:'Close panel'}).click();await page.locator('#resident').click();await page.getByRole('button',{name:person,exact:true}).click();await page.locator('#bag').click();await expect(page.locator('#panel-body')).toHaveAttribute('aria-busy','false');await page.locator('[data-bag-pocket=materials]').click();await expect(count(page,'bridge-kit')).toHaveText(kits);await expect(count(page,'bridge-kit')).toHaveAttribute('aria-label','Bridge repair kits: '+kits+' carried');await expect(page.locator('.bag-count-key')).toHaveText('Numbers show carried materials.');}
 await page.screenshot({path:out+'/bag-shared-materials.png'});expect(commands).toEqual([]);expect(errors).toEqual([]);writeFileSync(out+'/bag-shared-proof.json',JSON.stringify({fixture:'Disposable ih2_browser: ordinary-zero Mira/Sol; Aster existing48kits/2planters test baseline, not ordinary entitlement. No interception/protected writes.',commands,errors,stableSlot:true},null,2)+'\n');
});
test('bag: pocket, keyboard shortcuts and original icons stay readable on narrow/short doubled-text views with art fallback',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/art/homes/home-stool-icon.svg',r=>r.abort());await page.goto('/');await ready(page);await page.locator('#bag').click();const layouts=[];
 for(const shape of [{name:'phone320',w:320,h:568,text:100},{name:'phone360',w:360,h:640,text:100},{name:'short200',w:844,h:390,text:200},{name:'phone200',w:320,h:640,text:200}]){await page.setViewportSize({width:shape.w,height:shape.h});await page.evaluate(n=>document.documentElement.style.fontSize=n+'%',shape.text);const gap=await page.locator('.canvas-bag').evaluate(root=>{const heading=root.querySelector('h3')!,button=root.querySelector('.bag-shortcuts button')!,h=heading.getBoundingClientRect(),b=button.getBoundingClientRect(),icon=getComputedStyle(heading,'::before');const extra=icon.boxSizing==='border-box'?0:parseFloat(icon.borderTopWidth)+parseFloat(icon.borderBottomWidth);return b.top-Math.max(h.bottom,h.top+parseFloat(icon.top)+parseFloat(icon.height)+extra);});expect(gap).toBeGreaterThanOrEqual(4);for(const group of ['furniture','materials','garden','equipment']){const b=page.locator('[data-bag-pocket='+group+']');await b.focus();await page.keyboard.press('Enter');await expect(b).toHaveAttribute('aria-pressed','true');await expect(page.locator('.bag-count-key')).toHaveText(group==='furniture'?'Numbers show copies available to place.':group==='materials'?'Numbers show carried materials.':group==='garden'?'Numbers show kept items.':'Hand tool');if(group==='equipment'){await expect(count(page,'saw')).toHaveAttribute('aria-label','Bound hand saw: 0 kept');await expect(page.getByRole('button',{name:'Visit Nella’s workshop',exact:true})).toBeVisible();}expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);expect(await b.evaluate(el=>{const node=el.firstChild!;let offset=0;for(const part of el.textContent!.split(/(\s+)/)){if(part.trim()){const range=document.createRange();range.setStart(node,offset);range.setEnd(node,offset+part.length);if(range.getClientRects().length>1)return false;}offset+=part.length;}return true;})).toBe(true);expect(await page.locator('dialog').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);for(const card of await page.locator('.bag-slots:not([hidden]) .bag-slot').all())expect(await card.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);}
 await page.locator('[data-bag-pocket=furniture]').focus();await page.keyboard.press('Enter');await expect(stack(page,'stool').locator('.bag-art-fallback')).toBeVisible();await page.screenshot({path:out+'/bag-'+shape.name+'.png'});await page.getByRole('button',{name:'Open journal',exact:true}).focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'Close panel'}).focus();await page.keyboard.press('Tab');await page.keyboard.press('Tab');await expect(page.locator('[data-activity=bench] .activity-status')).toBeFocused();const h=(await page.locator('.dialog-head').boundingBox())!,b=(await page.locator('[data-activity=bench] .activity-status').boundingBox())!;expect(b.y).toBeGreaterThanOrEqual(h.y+h.height);await page.getByRole('button',{name:'Open bag',exact:true}).click();layouts.push(shape);}
 expect(errors).toEqual([]);writeFileSync(out+'/bag-responsive-proof.json',JSON.stringify({fixture:'Fresh ungranted local defaults; deliberately intercepted stool artwork failure only. Native keyboard/viewport/text emulation, not a physical phone.',layouts,errors},null,2)+'\n');
});
test('bag: declared shared home allocation snapshots subtract placed copies without rebuilding held slots',async({page})=>{
 await page.clock.install();
 let state=createWorkshop(Date.now());const commands:string[]=[];state.placements['north-east']='stool';expect(isCurrentWorkshop(state)).toBe(true);let logged=false,atHome=true;
 const plot=()=>({id:'42',ownerId:'bag-owner',ownerName:'Bag tester',level:1,placements:{'north-west':null,'north-middle':'rug','north-east':null,'south-west':null,'south-middle':null,'south-east':null},workroomPlacements:{'workroom-north':null,'workroom-south':null},pennantOwned:false,letterboxMotif:'sun'});
 const snapshot=()=>({playerId:'bag-owner',name:'Bag tester',workshop:state,position:{room:'workshop',position:{x:5,y:5}},quest:{contentVersion:1,awarded:[]},bridge:{contributed:3,target:3,restored:true,phase:'open'},plot:atHome?plot():null,plots:atHome?[plot()]:[],seasonKey:'2026-11-06',scores:[],serverTime:Date.now(),serverInstance:'bag-home-fixture'});
 await page.addInitScript(()=>{class Events extends EventTarget{onopen:((e:Event)=>void)|null=null;constructor(){super();queueMicrotask(()=>this.onopen?.(new Event('open')));}close(){}};(window as any).EventSource=Events;});
 await page.route('**/api/town/**',route=>{const path=new URL(route.request().url()).pathname.split('/').at(-1);if(path==='fixtures')return route.fulfill({json:{fixtures:[{id:'bag-owner',name:'Bag tester'}]}});if(path==='login'){logged=true;return route.fulfill({json:{snapshot:snapshot()}});}if(path==='snapshot')return logged?route.fulfill({json:{snapshot:snapshot()}}):route.fulfill({status:401,json:{message:'Choose a fixture.'}});if(path==='movement')return route.fulfill({json:{ok:true,position:snapshot().position}});if(path==='command')commands.push(route.request().postData()??'');return route.fulfill({status:400,json:{message:'No fixture commands permitted.'}});});
 await page.goto('/?town=1');await page.getByRole('button',{name:'Bag tester',exact:true}).click();await ready(page);await page.locator('#bag').click();await expect(page.locator('#panel-body')).toHaveAttribute('aria-busy','false');await expect(count(page,'stool')).toHaveText('0');await expect(count(page,'rug')).toHaveText('0');await expect(stack(page,'rug')).toContainText('1 placed');await expect(stack(page,'rug')).toContainText('1 owned');await expect(count(page,'rug')).toHaveAttribute('aria-label','Welcome-ish rug: 0 available to place');await expect(count(page,'stool')).toHaveAttribute('aria-label','Committee stool: 0 available to place');await expect(page.locator('.bag-count-key')).toHaveText('Numbers show copies available to place.');await page.locator('.bag-count-key').scrollIntoViewIfNeeded();expect((await page.locator('.bag-count-key').boundingBox())!.y).toBeLessThan((await stack(page,'stool').boundingBox())!.y);
 const arrangement=page.locator('.bag-arrangement');
 await arrangement.locator('summary').click();
 await expect(arrangement.locator('[data-slot=north-east]')).toHaveText('Near the window: Committee stool');
 await arrangement.locator('#placement').evaluate(placement=>{
  const labels=[...placement.querySelectorAll('[data-owned], [data-slot]')];
  const sample={labels:labels.length,writes:0,ticks:0};
  const timer=window.setInterval(()=>sample.ticks++,1000);
  const observer=new MutationObserver(records=>{sample.writes+=records.length;});
  for(const label of labels)observer.observe(label,{childList:true,characterData:true,subtree:true});
  (window as any).__readPlacementIdle=()=>{clearInterval(timer);observer.disconnect();return sample;};
 });
 await page.clock.runFor(3200);
 const arranged=await page.evaluate(()=> (window as any).__readPlacementIdle());
 expect(arranged.labels).toBe(7);
 expect(arranged.ticks).toBeGreaterThanOrEqual(3);
 expect(arranged.writes).toBe(0);
 await arrangement.getByRole('combobox',{name:'Furniture to place'}).selectOption('stool');
 await arrangement.locator('[data-slot=south-west]').click();
 const place=arrangement.getByRole('button',{name:'Place here',exact:true});
 await expect(place).toBeEnabled();
 const moved=applyWorkshop(state,{kind:'place',id:'bag-fixture-move',expectedRevision:state.revision,prop:'stool',fromSlot:'north-east',slot:'south-west'},Date.now());
 expect(moved.ok,moved.message).toBe(true);
 state=moved.state;
 await page.evaluate(()=>(window as any).__bagHeld=document.querySelector('[data-bag-item=rug]'));
 atHome=false;
 await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 await expect(count(page,'rug')).toHaveText('1');
 await expect(arrangement.locator('[data-slot=north-east]')).toHaveText('Near the window: empty');
 await expect(arrangement.locator('[data-slot=south-west]')).toHaveText('Left nook: Committee stool · selected');
 await expect(place).toBeDisabled();
 await expect(arrangement.getByRole('button',{name:'Return this furniture to bag',exact:true})).toBeEnabled();
 expect(await page.evaluate(()=>(window as any).__bagHeld===document.querySelector('[data-bag-item=rug]'))).toBe(true);await expect(count(page,'stool')).toHaveText('0');expect(commands).toEqual([]);writeFileSync(out+'/bag-home-allocation-proof.json',JSON.stringify({fixture:'Explicitly intercepted shared snapshot/EventSource with donated stool in workshop and rug in fictional home. New snapshot returns the rug and moves the workshop stool through the pure placement rules. The browser sends no command.',stableSlot:true,arranged,commands},null,2)+'\n');
});
test('bag: failed local persistence is disclosed without calling held contents saved',async({page})=>{
 mkdirSync(out,{recursive:true});
 await page.clock.install();
 await page.addInitScript(()=>{
  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
   if(key==='ih2:workshop:v2')throw new DOMException('Deliberate bag persistence fixture','QuotaExceededError');
   return original.call(this,key,value);
  };
 });
 await page.goto('/');
 await ready(page);
 await page.locator('#bag').click();
 await expect(page.locator('.bag-status')).toContainText('Unsaved contents');
 await expect(count(page,'stool')).toHaveText('1');
 expect(await page.evaluate(()=>localStorage.getItem('ih2:workshop:v2'))).toBe(null);
 await page.locator('.canvas-bag').evaluate(bag=>{
  const counter={ticks:0,writes:0,slotCount:bag.querySelectorAll('.bag-slot').length};
  const timer=window.setInterval(()=>counter.ticks++,1000);
  const observer=new MutationObserver(entries=>{counter.writes+=entries.length;});
  observer.observe(bag,{subtree:true,attributes:true,attributeFilter:['aria-label','data-empty']});
  (window as any).__readBagIdleWrites=()=>{clearInterval(timer);observer.disconnect();return counter;};
 });
 await page.clock.runFor(3200);
 const evidence=await page.evaluate(()=>(window as any).__readBagIdleWrites());
 expect(evidence.ticks).toBeGreaterThanOrEqual(3);
 expect(evidence.slotCount).toBeGreaterThan(10);
 expect(evidence.writes).toBe(0);
 await expect(count(page,'stool')).toHaveAttribute('aria-label','Committee stool: 1 available to place');
 writeFileSync(out+'/bag-idle-mutations.json',JSON.stringify(evidence,null,2)+'\n');
});

test('bag: move stacks by drag, tap and keyboard, with counts and workshop state unchanged',async({browser})=>{
 for(const [name,width,height] of [['desktop',1440,900],['phone',320,640]] as const){
  const touch=name==='phone';
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch});
  try{
   const page=await context.newPage();
   const original=queuedSecond();
   await page.addInitScript(state=>{
    if(!localStorage.getItem('ih2:workshop:v2'))localStorage.setItem('ih2:workshop:v2',JSON.stringify(state));
   },original);
   await page.goto('/');
   await ready(page);
   await page.locator('#bag').click();
   const playerState=()=>page.evaluate(()=>{
    const {inventory,owned,placements,job,revision}=(window as any).__pilot.workshop();
    return {inventory,owned,placements,job,revision,saved:localStorage.getItem('ih2:workshop:v2')};
   });
   const unchanged=await playerState();
   const edit=page.getByRole('button',{name:'Move stacks',exact:true});
   await edit.click();
   const order=()=>page.locator('[aria-label="Furniture"] > [data-bag-item]').evaluateAll(cards=>cards.map(card=>card.getAttribute('data-bag-item')));
   const before=await order();
   const source=page.getByRole('button',{name:'Move Optimistic planter',exact:true});
   const target=stack(page,'stool');
   if(touch){
    await source.tap();
    await target.getByRole('button',{name:/Swap with/}).tap();
   }else await source.dragTo(target);
   const after=await order();
   expect(after[before.indexOf('stool')]).toBe('planter');
   expect(after[before.indexOf('planter')]).toBe('stool');
   await expect(count(page,'planter')).toHaveText('1');
   await expect(source).toBeFocused();
   expect(await playerState()).toEqual(unchanged);
   const done=page.getByRole('button',{name:'Done moving',exact:true});
   await expect(done).toBeInViewport({ratio:1});
   await page.screenshot({path:out+'/bag-moving-'+name+'.png'});
   if(touch)await done.tap();else await done.click();
   await expect(edit).toBeFocused();
   await expect(source).toBeHidden();
   await page.reload();
   await ready(page);
   await page.locator('#bag').click();
   expect(await order()).toEqual(after);
   await edit.click();
   await source.press('Enter');
   await target.getByRole('button',{name:/Swap with/}).press('Enter');
   expect(await order()).toEqual(before);
   await source.press('Enter');
   await page.getByRole('button',{name:'Materials',exact:true}).click();
   await expect(page.getByRole('button',{name:'Move Scrap',exact:true})).toBeVisible();
   expect(await playerState()).toEqual(unchanged);
  }finally{await context.close();}
 }
});

test('Bag Equipment keeps an earned saw through equip, pine work, put away and reload',async({browser})=>{
 mkdirSync(out,{recursive:true});
 for(const [name,width,height] of [['desktop',1440,900],['phone',320,640]] as const){
  const touch=name==='phone';
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch});
  try{
   const page=await context.newPage();
   const start=createWorkshop(Date.now()),learned=applyWorkshop(start,{id:'equipment-lesson',kind:'carpentry',expectedRevision:0,carpentryAction:{action:'learn-saw'}},start.observedAt);
   expect(learned.ok).toBe(true);
   await page.addInitScript(({workshop,room,position})=>{
    if(sessionStorage.getItem('equipment-fixture'))return;
    localStorage.setItem('ih2:workshop:v2',JSON.stringify(workshop));
    localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room,position}));
    sessionStorage.setItem('equipment-fixture','1');
   },{workshop:learned.state,room:touch?'square':'workshop',position:touch?{x:6,y:26}:{x:12,y:6.5}});
   await page.goto('/?sky-study=1&phase=day');
   await ready(page);
   const state=()=>page.evaluate(()=>(window as any).__pilot.workshop());
   const feet=()=>page.evaluate(()=>(window as any).__pilot.snapshot().position);
   const startFeet=await feet();
   const pocket=page.getByRole('button',{name:'Equipment',exact:true});
   if(touch){
    await page.locator('#interact').tap();
    await page.getByRole('button',{name:'Open Bag · Equipment',exact:true}).tap();
    await expect(pocket).toBeFocused();
   }else{
    await page.locator('#bag').click();
    await pocket.press('Enter');
   }
   await expect(pocket).toHaveAttribute('aria-pressed','true');
   await expect(count(page,'saw')).toHaveText('1');
   await expect(stack(page,'saw')).toContainText('Put away');
   const equip=page.getByRole('button',{name:'Equip saw',exact:true});
   if(touch)await equip.tap();else await equip.press('Enter');
   await expect(stack(page,'saw').locator('.bag-slot-detail')).toHaveText('Equipped');
   await expect(page.locator('.bag-equip-notice')).toBeEmpty();
   expect(await feet()).toEqual(startFeet);
   const equipped=await state();
   expect(equipped.inventory).toEqual(start.inventory);
   expect(equipped.owned).toEqual(start.owned);
   expect(equipped.carpentry.pine).toMatchObject({available:6,carried:0,gathered:0,spent:0});
   expect(equipped.revision).toBe(learned.state.revision+1);
   await page.screenshot({path:out+'/bag-equipment-'+name+'.png'});
   if(touch){
    await page.getByRole('button',{name:'Back to pine work',exact:true}).tap();
    await expect(page.locator('#panel-title')).toHaveText('Crooked pine deadfall');
    await page.getByRole('button',{name:'Preview preparing fallen pine',exact:true}).tap();
    const gather=page.locator('[data-carpentry-action=confirm]');
    await expect(gather).toBeEnabled();
    await gather.tap();
    await expect.poll(async()=>(await state()).carpentry.pine.carried).toBe(6);
   }
   await page.reload();
   await ready(page);
   await page.locator('#bag').click();
   await pocket.click();
   await expect(stack(page,'saw').locator('.bag-slot-detail')).toHaveText('Equipped');
   await page.getByRole('button',{name:'Put away',exact:true}).click();
   await expect(count(page,'saw')).toHaveText('1');
   await expect(stack(page,'saw').locator('.bag-slot-detail')).toHaveText('Put away');
   await page.reload();
   await ready(page);
   expect((await state()).carpentry.saw).toEqual({owned:true,equipped:false});
   if(!touch){
    await page.locator('#interact').click();
    await expect(page.locator('#panel-title')).toHaveText('Pine finishing rack');
    await page.getByRole('button',{name:'Open Bag · Equipment',exact:true}).click();
    await expect(pocket).toHaveAttribute('aria-pressed','true');
    await page.getByRole('button',{name:'Back to pine work',exact:true}).click();
    await expect(page.locator('#panel-title')).toHaveText('Pine finishing rack');
    await page.getByRole('button',{name:'Close panel',exact:true}).click();
   }
   await page.locator('#bag').click();
   await pocket.click();
   await expect(page.locator('.bag-appearance')).toContainText('Original look');
   const inventoryBefore=(await state()).inventory;
   await page.getByRole('button',{name:'Edit headwear',exact:true}).click();
   await page.getByLabel('Name on your badge').fill('Avery');
   await page.getByLabel('Headwear',{exact:true}).selectOption('clerk');
   await page.getByRole('button',{name:'Save changes',exact:true}).click();
   await expect(page.locator('.resident-profile-status')).toHaveText('Resident saved in this browser.');
   await page.getByRole('button',{name:'Close panel',exact:true}).click();
   await page.locator('#bag').click();
   await pocket.click();
   await expect(page.locator('.bag-appearance')).toContainText('Clerk cap');
   expect((await state()).inventory).toEqual(inventoryBefore);
   if(touch){
    await page.getByRole('button',{name:'Edit headwear',exact:true}).scrollIntoViewIfNeeded();
    await page.screenshot({path:out+'/bag-headwear-phone.png'});
   }
  }finally{await context.close();}
 }
});

test('shared earned headwear switches a single slot and renders on a visible neighbor',async({browser})=>{
 mkdirSync(out,{recursive:true});
 for(const [shape,width,height] of [['desktop',1440,900],['phone',320,640],['short',844,390]] as const){
  const context=await browser.newContext({viewport:{width,height},hasTouch:shape!=='desktop'});
  try{
   const page=await context.newPage(),errors:string[]=[];
   const position={room:'square',position:{x:24,y:25}};
   let workshop=createWorkshop(Date.now()),logged=false,owned=false,clerkOwned=false,worn:null|'inkwood'|'clerk'=null;
   const snapshot=()=>({playerId:'aster',name:'Aster',workshop,position,headwear:{owned,clerkOwned,worn},quest:{contentVersion:1,awarded:[]},bridge:{contributed:3,target:3,restored:true,phase:'open'},trail:{stamps:owned?['trailhead','old-sign','lookout']:[],pennantOwned:owned},plot:null,plots:[],seasonKey:'2026-11-20',scores:[],serverTime:Date.now(),serverInstance:'headwear-visual-fixture'});
   const commands:{kind:string;item:string|null}[]=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(()=>{
    class Events extends EventTarget{
     onopen:(()=>void)|null=null;
     constructor(){super();(window as any).__headwearStream=this;queueMicrotask(()=>this.onopen?.());}
     close(){}
    }
    (window as any).EventSource=Events;
   });
   await page.route('**/api/town/**',async route=>{
    const path=new URL(route.request().url()).pathname.split('/').at(-1);
    if(path==='fixtures')return route.fulfill({json:{fixtures:[{id:'aster',name:'Aster'}]}});
    if(path==='login'){logged=true;return route.fulfill({json:{snapshot:snapshot()}});}
    if(path==='snapshot')return logged?route.fulfill({json:{snapshot:snapshot()}}):route.fulfill({status:401,json:{message:'Choose a fixture.'}});
    if(path==='movement')return route.fulfill({json:{ok:true,position}});
    if(path==='command'){
     const command=route.request().postDataJSON();
     commands.push(command);
     if(command.kind==='wear-headwear'&&(command.item===null||(command.item==='inkwood'?owned:clerkOwned))){
      worn=command.item;
      workshop={...workshop,revision:workshop.revision+1};
      return route.fulfill({json:{ok:true,message:'Headwear saved.',snapshot:snapshot()}});
     }
    }
    return route.fulfill({status:400,json:{message:'Unknown fixture command.'}});
   });
   await page.goto('/?town=1&sky-study=1&phase=day');
   await page.getByRole('button',{name:'Aster',exact:true}).click();
   await ready(page);
   const bag=page.locator('#bag'),equipment=page.getByRole('button',{name:'Equipment',exact:true});
   const card=page.locator('[data-earned-headwear=inkwood]');
   const cap=page.locator('[data-earned-headwear=clerk]');
   const wear=page.getByRole('button',{name:'Wear Inkwood hood',exact:true});
   const putAway=page.getByRole('button',{name:'Put hood away',exact:true});
   await bag.click();await equipment.click();
   await expect(card).toContainText('Record all three Inkwood discoveries');
   await expect(wear).toBeHidden();
   await expect(cap).toContainText('Record your first completed easel');
   await expect(cap.getByRole('button',{name:'Wear Clerk cap',exact:true})).toBeHidden();
   expect(commands).toEqual([]);
   await page.getByRole('button',{name:'Open trail journal',exact:true}).click();
   const rewardLink=page.getByRole('button',{name:'Open Bag · Inkwood hood',exact:true});
   await expect(rewardLink).toBeHidden();
   owned=true;
   await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
   await rewardLink.click();
   await expect(equipment).toHaveAttribute('aria-pressed','true');
   await expect(wear).toBeEnabled();
   if(shape==='desktop')await wear.press('Enter');else await wear.tap();
   await expect(card).toContainText('Wearing · visible to nearby residents');
   expect(commands).toHaveLength(1);
   expect(commands[0]).toMatchObject({kind:'wear-headwear',item:'inkwood'});
   await putAway.scrollIntoViewIfNeeded();
   await page.screenshot({path:out+'/inkwood-equipment-'+shape+'.png'});
   await page.getByRole('button',{name:'Close panel',exact:true}).click();
   const visual=()=>page.evaluate(()=>(window as any).__pilot.metrics().visual);
   await expect.poll(async()=>(await visual()).headwear?.texture).toBe('headwear-inkwood');
   const presence=(item?:'inkwood'|'clerk')=>page.evaluate(headwear=>{
    const data=[{id:'bea',name:'Bea',room:'square',position:{x:22,y:25.5},...(headwear?{headwear}:{})}];
    (window as any).__headwearStream.dispatchEvent(new MessageEvent('presence',{data:JSON.stringify(data)}));
   },item);
   await presence('inkwood');
   await expect.poll(async()=>(await visual()).peerHeadwear).toEqual([{id:'bea',texture:'headwear-inkwood'}]);
   await page.screenshot({path:out+'/inkwood-neighbor-'+shape+'.png'});
   await presence();
   await expect.poll(async()=>(await visual()).peerHeadwear).toEqual([]);
   await bag.click();await equipment.click();await putAway.click();
   await expect(card).toContainText('Earned · put away');
   await page.getByRole('button',{name:'Close panel',exact:true}).click();
   await expect.poll(async()=>(await visual()).headwear).toBeNull();
   expect(commands).toHaveLength(2);
   clerkOwned=true;
   await bag.click();await equipment.click();
   await cap.getByRole('button',{name:'Wear Clerk cap',exact:true}).click();
   await expect(cap).toContainText('Wearing · visible to nearby residents');
   await expect(card).toContainText('Earned · put away');
   await cap.getByRole('button',{name:'Put cap away',exact:true}).scrollIntoViewIfNeeded();
   await page.screenshot({path:out+'/clerk-cap-'+shape+'.png'});
   await page.getByRole('button',{name:'Close panel',exact:true}).click();
   await expect.poll(async()=>(await visual()).headwear?.texture).toBe('headwear-clerk');
   await presence('clerk');
   await expect.poll(async()=>(await visual()).peerHeadwear).toEqual([{id:'bea',texture:'headwear-clerk'}]);
   await bag.click();await equipment.click();
   await wear.click();
   await expect(cap).toContainText('Earned · put away');
   await expect(card).toContainText('Wearing · visible to nearby residents');
   await page.getByRole('button',{name:'Close panel',exact:true}).click();
   await expect.poll(async()=>(await visual()).headwear?.texture).toBe('headwear-inkwood');
   expect(commands.slice(2).map(command=>command.item)).toEqual(['clerk','inkwood']);
   expect(errors).toEqual([]);
  }finally{await context.close();}
 }
});
