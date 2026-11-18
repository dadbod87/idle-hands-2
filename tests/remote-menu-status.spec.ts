import{test,expect,type Page,type Route}from'@playwright/test';
import{mkdirSync,writeFileSync}from'node:fs';
import{createWorkshop,applyWorkshop,type WorkshopState}from'../src/game/live-workshop.ts';
const out='test-results/browser/menu-confirmation';mkdirSync(out,{recursive:true});
/** Intercepted client-only fixture. No database, real player, clock override or grant. */
async function fixture(page:Page){
 const started=Date.now();let state=createWorkshop(started),sequence=0;
 for(const resource of ['scrap','timber','supplies']as const){const r=applyWorkshop(state,{kind:'gather',resource,id:'earned-'+(++sequence),expectedRevision:state.revision},started);expect(r.ok,r.message).toBe(true);state=r.state;}
 let actor=false,hold=false,held:Route|null=null,failRead=false,loseCommand=false,refuseCommand=false,cached:{payload:string;state:WorkshopState;message:string;ok:boolean}|null=null;
 const commands:string[]=[],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const snapshot=()=>({playerId:'fixture-menu',name:'Menu fixture',workshop:state,position:{room:'square',position:{x:24,y:25}},quest:{contentVersion:1,awarded:[]},bridge:{contributed:0,target:3,restored:false},plot:null,plots:[],seasonKey:'2026-11-13',scores:[],serverTime:Date.now(),serverInstance:'menu-fixture'});
 await page.addInitScript(()=>{class FixtureEvents extends EventTarget{onopen:(()=>void)|null=null;constructor(){super();queueMicrotask(()=>this.onopen?.());}close(){}};(window as any).EventSource=FixtureEvents;});
 await page.route('**/api/town/**',async route=>{
  const path=new URL(route.request().url()).pathname.split('/').at(-1);
  if(path==='fixtures')return route.fulfill({json:{fixtures:[{id:'fixture-menu',name:'Menu fixture'}]}});
  if(path==='login'){actor=true;return route.fulfill({json:{snapshot:snapshot()}});}
  if(path==='snapshot'){
   if(!actor)return route.fulfill({status:401,json:{message:'Choose the intercepted fixture.'}});if(hold){hold=false;held=route;return;}
   if(failRead){failRead=false;return route.fulfill({status:503,json:{message:'Fixture read unavailable. Nothing was replaced.'}});}
   return route.fulfill({json:{snapshot:snapshot()}});
  }
  if(path==='movement')return route.fulfill({json:{ok:true,position:route.request().postDataJSON()}});
  if(path==='command'){
   const payload=route.request().postData()!;commands.push(payload);
   if(!cached){const result=refuseCommand?{state,ok:false,message:'Fixture job refused. Materials were not spent.'}:applyWorkshop(state,route.request().postDataJSON(),Date.now());state=result.state;cached={payload,state,message:result.message,ok:result.ok};}
   else expect(payload).toBe(cached.payload);
   if(loseCommand){loseCommand=false;return route.fulfill({status:503,json:{message:'Fixture reply unavailable. Retry the same request.'}});}
   return route.fulfill({json:{ok:cached.ok,message:cached.message,snapshot:snapshot()}});
  }
  throw Error('Unexpected intercepted fixture route '+path);
 });
 await page.goto('/?town=1');await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);await page.getByRole('button',{name:'Menu fixture',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.town()?.playerId)).toBe('fixture-menu');
 await expect(page.locator('#resident')).toHaveText('Menu fixture');
 return{commands,errors,delay:()=>hold=true,waitHeld:()=>expect.poll(()=>!!held).toBe(true),release:async()=>{await held!.fulfill({json:{snapshot:snapshot()}});held=null;},failRead:()=>failRead=true,loseCommand:()=>loseCommand=true,refuseCommand:()=>refuseCommand=true,state:()=>state};
}
async function settled(page:Page){await expect(page.locator('#panel-body')).toHaveAttribute('aria-busy','false');}
async function openBench(page:Page){await page.locator('#journal').click();await page.locator('[data-activity-open=bench]').click();await expect(page.locator('#panel-title')).toHaveText('Your work bench');await settled(page);}

test('menu confirmation: delayed controlled read restores truthful stable status at desktop, phone and short text layouts',async({page})=>{
 const f=await fixture(page),layouts=[];
 for(const[w,h,text]of[[2560,1440,100],[320,640,100],[844,390,200]]){
  await page.setViewportSize({width:w,height:h});await page.evaluate(n=>document.documentElement.style.fontSize=n+'%',text);f.delay();await page.locator('#bag').click();await f.waitHeld();await expect(page.locator('.workshop-status')).toHaveText('Waiting for server confirmation…');await expect(page.locator('#panel-body')).toHaveAttribute('aria-busy','true');
  await page.getByRole('button',{name:'Close panel'}).focus();const before=await page.getByRole('button',{name:'Close panel'}).boundingBox();await f.release();await settled(page);await expect(page.locator('.workshop-status')).toHaveText('Town state confirmed.');await expect(page.getByRole('button',{name:'Close panel'})).toBeFocused();expect(await page.getByRole('button',{name:'Close panel'}).boundingBox()).toEqual(before);
  expect(await page.locator('dialog').evaluate(d=>d.scrollWidth<=d.clientWidth)).toBe(true);await page.locator('.workshop-status').scrollIntoViewIfNeeded();await page.screenshot({path:out+`/confirmed-${w}-${text}.png`});layouts.push({w,h,text});await page.getByRole('button',{name:'Close panel'}).click();
 }
 await page.setViewportSize({width:360,height:640});await page.evaluate(()=>document.documentElement.style.fontSize='100%');await page.locator('#bag').click();await settled(page);await expect(page.locator('.workshop-status')).toHaveText('Town state confirmed.');
 const mutations=await page.locator('.workshop-status').evaluate(el=>new Promise<number>(resolve=>{let changes=0;const observer=new MutationObserver(()=>changes++);observer.observe(el,{childList:true,subtree:true,characterData:true});setTimeout(()=>{observer.disconnect();resolve(changes);},2200);}));expect(mutations).toBe(0);expect(f.commands).toEqual([]);expect(f.errors).toEqual([]);
 writeFileSync(out+'/confirmed.json',JSON.stringify({disclosure:'Intercepted client-only earned material fixture and one held synthetic read per layout, no database/real player changes. Viewport/text emulation, not physical phones.',layouts,stableLiveRegionMutations:mutations,commands:f.commands,errors:f.errors},null,2)+'\n');
});

test('menu confirmation: failed read keeps retry and clears its error only after successful refresh',async({page})=>{
 await page.setViewportSize({width:360,height:640});const f=await fixture(page);f.failRead();await page.locator('#bag').click();await expect(page.locator('.workshop-status')).toContainText('Fixture read unavailable');const retry=page.getByRole('button',{name:'Retry the same request',exact:true});await expect(retry).toBeVisible();await expect(retry).toBeEnabled();f.delay();await retry.click();await f.waitHeld();await expect(page.locator('.workshop-status')).toHaveText('Waiting for server confirmation…');await expect(page.locator('.remote-retry')).toBeDisabled();await f.release();await settled(page);await expect(page.locator('.workshop-status')).toHaveText('Town state refreshed.');await expect(retry).toBeHidden();expect(f.commands).toEqual([]);expect(f.errors).toEqual([]);await page.locator('.workshop-status').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/read-recovered-phone.png'});
});

test('menu confirmation: unresolved save stays blocked across panel change and same UUID retry preserves its confirmed receipt',async({page})=>{
 const f=await fixture(page);await openBench(page);f.loseCommand();await page.locator('[data-craft=planter]').click();await expect(page.locator('.workshop-status')).toContainText('Fixture reply unavailable');expect(f.state().job?.recipe).toBe('planter');const revision=f.state().revision,inventory={...f.state().inventory};
 await page.getByRole('button',{name:'Close panel'}).click();await page.locator('#bag').click();await expect(page.locator('#panel-title')).toHaveText('Confirm pending request');await expect(page.locator('.canvas-bag')).toHaveCount(0);const retry=page.getByRole('button',{name:'Retry the same request',exact:true});await retry.click();await expect(page.locator('dialog')).not.toBeVisible();expect(f.commands).toHaveLength(2);expect(f.commands[1]).toBe(f.commands[0]);expect(f.state().revision).toBe(revision);expect(f.state().inventory).toEqual(inventory);expect(f.errors).toEqual([]);await page.locator('#bag').click();await settled(page);await expect(page.locator('.workshop-status')).toHaveText('Town state confirmed.');await page.locator('.workshop-status').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/same-request-confirmed.png'});
 writeFileSync(out+'/retry.json',JSON.stringify({disclosure:'Intercepted client-only pure earned materials/craft; first synthetic command commits in memory but returns503, same payload replay recovers receipt. No server/database/real-player change.',samePayload:true,revision,inventory,errors:f.errors},null,2)+'\n');
});

test('menu confirmation: an authoritative refusal stays readable after the pending notice clears',async({page})=>{
 const f=await fixture(page);await openBench(page);const before=JSON.stringify(f.state());f.refuseCommand();await page.locator('[data-craft=planter]').click();await settled(page);await expect(page.locator('.workshop-status')).toHaveText('Fixture job refused. Materials were not spent.');await page.waitForTimeout(1100);await expect(page.locator('.workshop-status')).toHaveText('Fixture job refused. Materials were not spent.');expect(JSON.stringify(f.state())).toBe(before);expect(f.commands).toHaveLength(1);await expect(page.getByRole('button',{name:'Retry the same request',exact:true})).toBeHidden();expect(f.errors).toEqual([]);await page.locator('.workshop-status').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/refused-without-spending.png'});
});

test('menu confirmation: successful command restores its receipt instead of a stale waiting or generic success message',async({page})=>{
 const f=await fixture(page);await openBench(page);await page.locator('[data-craft=planter]').click();await settled(page);await expect(page.locator('.workshop-status')).toHaveText(f.state().lastMessage);await expect(page.locator('.workshop-status')).not.toHaveText('Town state confirmed.');await expect(page.locator('.workshop-status')).not.toContainText('Waiting');await page.waitForTimeout(1100);await expect(page.locator('.workshop-status')).toHaveText(f.state().lastMessage);expect(f.commands).toHaveLength(1);expect(f.state().job?.recipe).toBe('planter');expect(f.errors).toEqual([]);await page.locator('.workshop-status').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/command-receipt-confirmed.png'});
});
