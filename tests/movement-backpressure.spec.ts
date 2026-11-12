import { test, expect, type Route } from '@playwright/test';
import { createWorkshop } from '../src/game/workshop.ts';

test('intercepted movement fixture: delayed acknowledgments bound prediction and preserve the walk and portal arrival', async ({ page }) => {
  // Isolated transport fixture only. No real town rows, grants, or production timing changes.
  let loggedIn = false, holdNext = true, held: Route | null = null;
  let position = { room: 'square', position: { x: 24, y: 25 } };
  let serverAt = Date.now(), credit = 2;
  const rejected: string[] = [], sent: typeof position[] = [];
  const workshop = createWorkshop(Date.now());
  const snapshot = () => ({ playerId: 'aster', name: 'Aster', workshop, position, quest: { contentVersion: 1, awarded: [] }, bridge: { contributed: 0, target: 3, restored: false }, plot: null, plots: [], seasonKey: '2026-11-06', scores: [], serverTime: Date.now(), serverInstance: 'backpressure-fixture' });
  await page.addInitScript(() => {
    class FixtureEvents extends EventTarget {
      onopen: (() => void) | null = null;
      constructor() { super(); queueMicrotask(() => this.onopen?.()); }
      close() {}
    }
    (window as any).EventSource = FixtureEvents;
  });
  await page.route('**/api/town/**', async route => {
    const path = new URL(route.request().url()).pathname.split('/').at(-1);
    if (path === 'fixtures') return route.fulfill({ json: { fixtures: [{ id: 'aster', name: 'Aster' }] } });
    if (path === 'login') { loggedIn = true; return route.fulfill({ json: { snapshot: snapshot() } }); }
    if (path === 'snapshot') return route.fulfill(loggedIn ? { json: { snapshot: snapshot() } } : { status: 401, json: { message: 'Choose a fixture.' } });
    if (path === 'movement') {
      const value = route.request().postDataJSON() as typeof position;
      sent.push(value);
      const now = Date.now(); credit = Math.min(2, credit + (now - serverAt) / 1000 * 5); serverAt = now;
      const distance = Math.hypot(value.position.x - position.position.x, value.position.y - position.position.y);
      const transition = value.room !== position.room;
      const valid = transition ? value.room === 'workshop' && Math.hypot(value.position.x - 9, value.position.y - 11) < .05 : distance <= credit + .001;
      if (!valid) { rejected.push(JSON.stringify(value)); return route.fulfill({ status: 409, json: { message: 'Fixture movement exceeds the unchanged authority budget.' } }); }
      position = value; credit = transition ? 1 : Math.max(0, credit - distance);
      if (holdNext) { holdNext = false; held = route; return; }
      return route.fulfill({ json: { ok: true, position } });
    }
    return route.fulfill({ status: 400, json: { message: 'Unexpected isolated movement-fixture request.' } });
  });
  await page.goto('/?town=1');
  await expect.poll(() => page.evaluate(() => (window as any).__pilot?.metrics().ready)).toBe(true);
  await page.getByRole('dialog').getByRole('button', { name: 'Aster', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Places', exact: false }).click();
  await page.locator('[data-destination="bridge"]').click();
  await expect.poll(() => !!held).toBe(true);
  await page.waitForTimeout(1000);
  const paused = await page.evaluate(() => (window as any).__pilot.snapshot());
  expect(Math.hypot(paused.position.x - 24, paused.position.y - 25)).toBeLessThanOrEqual(1.50001);
  expect(paused.walking, 'The route stays queued while awaiting its movement acknowledgment.').toBe(true);
  expect(paused.locked).toBe(false);
  await held!.fulfill({ json: { ok: true, position } }); held = null;
  await expect.poll(() => page.evaluate(() => (window as any).__pilot.snapshot().nearby), { timeout: process.env.CI ? 30000 : 12000 }).toBe('bridge');
  expect(sent.length).toBeGreaterThan(1); expect(rejected).toEqual([]);

  await page.getByRole('button', { name: 'Places', exact: false }).click();
  await page.locator('[data-destination="workshop"]').click();
  await expect.poll(() => page.evaluate(() => (window as any).__pilot.snapshot().nearby), { timeout: process.env.CI ? 30000 : 12000 }).toBe('workshop');
  await expect.poll(() => page.evaluate(() => (window as any).__pilot.snapshot().walking)).toBe(false);
  // Hold only the room-transition acknowledgment, not a preceding same-room checkpoint.
  await expect.poll(() => Math.hypot(position.position.x - 20, position.position.y - 22)).toBeLessThan(.01);
  holdNext = true;
  await page.keyboard.press('e');
  await expect.poll(() => !!held).toBe(true);
  expect(position).toEqual({ room: 'workshop', position: { x: 9, y: 11 } });
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(500); await page.keyboard.up('ArrowRight');
  expect(await page.evaluate(() => (window as any).__pilot.snapshot().position)).toEqual({ x: 9, y: 11 });
  await held!.fulfill({ json: { ok: true, position } }); held = null;
  expect(rejected).toEqual([]);
});

test('intercepted movement fixture: switching residents while a movement is held cannot start old-resident recovery',async({page})=>{
 // The fake authority keeps Aster current until Bea's delayed login response.
 // Any recovery GET started by Aster's aborted movement would therefore capture
 // old Aster data under the NEW login generation: the race this guards against.
 let actor:string|null=null,movementHeld:Route|null=null,loginHeld:Route|null=null;
 const staleSnapshots:Array<{route:Route;snapshot:unknown}>=[];
 let recoveryDuringLogin=0;
 const state=createWorkshop(Date.now());
 const value=(id:string)=>({playerId:id,name:id==='aster'?'Aster':'Bea',workshop:state,position:{room:'square',position:{x:id==='aster'?24:26,y:25}},quest:{contentVersion:1,awarded:[]},bridge:{contributed:0,target:3,restored:false},plot:null,plots:[],seasonKey:'2026-11-06',scores:[],serverTime:Date.now(),serverInstance:'identity-movement-fixture'});
 await page.addInitScript(()=>{class Events extends EventTarget{onopen:(()=>void)|null=null;constructor(){super();queueMicrotask(()=>this.onopen?.());}close(){}};(window as any).EventSource=Events;});
 await page.route('**/api/town/**',async route=>{
  const endpoint=new URL(route.request().url()).pathname.split('/').at(-1);
  if(endpoint==='fixtures')return route.fulfill({json:{fixtures:[{id:'aster',name:'Aster'},{id:'bea',name:'Bea'}]}});
  if(endpoint==='login'){const id=route.request().postDataJSON().fixtureId;if(id==='bea'){loginHeld=route;return;}actor=id;return route.fulfill({json:{snapshot:value(id)}});}
  if(endpoint==='snapshot'){if(!actor)return route.fulfill({status:401,json:{message:'Choose a fixture.'}});if(loginHeld&&actor==='aster'){recoveryDuringLogin++;staleSnapshots.push({route,snapshot:value(actor)});return;}return route.fulfill({json:{snapshot:value(actor)}});}
  if(endpoint==='movement'){if(actor==='aster'&&!movementHeld){movementHeld=route;return;}return route.fulfill({json:{ok:true,position:route.request().postDataJSON()}});}
  return route.fulfill({status:400,json:{message:'Unexpected isolated movement/identity request.'}});
 });
 await page.goto('/?town=1');await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
 await page.getByRole('dialog').getByRole('button',{name:'Aster',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.town()?.playerId)).toBe('aster');
 await page.getByRole('button',{name:'Places',exact:false}).click();await page.locator('[data-destination="bridge"]').click();await expect.poll(()=>!!movementHeld).toBe(true);
 await page.getByRole('button',{name:'Choose practice resident'}).click();await page.getByRole('dialog').getByRole('button',{name:'Bea',exact:true}).click();await expect.poll(()=>!!loginHeld).toBe(true);
 await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.town())).toBe(null);
 // Drain cancellation/recovery microtasks while the new identity is not installed.
 await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,200)));
 actor='bea';await loginHeld!.fulfill({json:{snapshot:value(actor)}});loginHeld=null;
 await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.town()?.playerId)).toBe('bea');
 for(const stale of staleSnapshots)await stale.route.fulfill({json:{snapshot:stale.snapshot}}).catch(()=>{});
 await movementHeld!.fulfill({json:{ok:true,position:value('aster').position}}).catch(()=>{});
 await page.waitForTimeout(100);
 expect(recoveryDuringLogin,'Aborted old movement must not issue a new-generation recovery GET.').toBe(0);
 expect(await page.evaluate(()=>(window as any).__pilot.town().playerId)).toBe('bea');
 expect(await page.evaluate(()=>(window as any).__pilot.snapshot().position)).toEqual({x:26,y:25});
 await expect(page.locator('.fixture-label')).toContainText('Bea');
});

for(const approach of ['frame-dependent','one-checkpoint','guide'] as const){
test('intercepted movement fixture: automatic doors confirm the source approach and cancel superseded entry'+(approach==='one-checkpoint'?' (deterministic one-checkpoint approach)':approach==='guide'?' (guide approach waits for final source ACK)':''),async({page})=>{
 let loggedIn=false,holdFirstApproach=true;
 type Position={room:string;position:{x:number;y:number}};
 // The nearer variant guarantees the first checkpoint is already within the
 // portal radius, regardless of software-rendered frame duration.
 let position:Position={room:'square',position:{x:20,y:approach==='one-checkpoint'?23.1:23.95}};
 const sources:Array<{route:Route;value:Position}>=[],rooms:Position[]=[],rejected:string[]=[];
 const state=createWorkshop(Date.now());
 const snapshot=()=>({playerId:'aster',name:'Aster',workshop:state,position,quest:{contentVersion:1,awarded:[]},bridge:{contributed:0,target:3,restored:false},plot:null,plots:[],seasonKey:'2026-11-06',scores:[],serverTime:Date.now(),serverInstance:'automatic-portal-fixture'});
 await page.addInitScript(()=>{class Events extends EventTarget{onopen:(()=>void)|null=null;constructor(){super();queueMicrotask(()=>this.onopen?.());}close(){}};(window as any).EventSource=Events;});
 await page.route('**/api/town/**',async route=>{
  const endpoint=new URL(route.request().url()).pathname.split('/').at(-1);
  if(endpoint==='fixtures')return route.fulfill({json:{fixtures:[{id:'aster',name:'Aster'}]}});
  if(endpoint==='login'){loggedIn=true;return route.fulfill({json:{snapshot:snapshot()}});}
  if(endpoint==='snapshot')return route.fulfill(loggedIn?{json:{snapshot:snapshot()}}:{status:401,json:{message:'Choose a fixture.'}});
  if(endpoint==='movement'){
   const value=route.request().postDataJSON() as Position;
   const valid=value.room===position.room?Math.hypot(value.position.x-position.position.x,value.position.y-position.position.y)<=2.001:value.room==='workshop'&&position.room==='square'&&Math.hypot(position.position.x-20,position.position.y-22)<=1.9&&Math.hypot(value.position.x-9,value.position.y-11)<.05;
   if(!valid){rejected.push(JSON.stringify(value));return route.fulfill({status:409,json:{message:'Fixture portal/endpoint outside unchanged authority limits.'}});}
   const transition=value.room!==position.room;position=value;
   if(transition)rooms.push(value);
   else if(holdFirstApproach&&sources.length<2){sources.push({route,value});return;}
   return route.fulfill({json:{ok:true,position:value}});
  }
  return route.fulfill({status:400,json:{message:'Unexpected isolated automatic-portal fixture request.'}});
 });
 await page.goto('/?town=1');await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);await page.getByRole('dialog').getByRole('button',{name:'Aster',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();
 const tapDoor=async()=>{if(approach==='guide'){await page.locator('#field-guide').click();await page.locator('#guide-workshop').click();return;}await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));const door=await page.evaluate(()=>(window as any).__pilot.screenPoint(19.5,21.5)),canvas=(await page.locator('canvas').boundingBox())!;await page.mouse.click(canvas.x+door.x,canvas.y+door.y);};
 await tapDoor();await expect.poll(()=>sources.length).toBe(1);await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.snapshot().locked)).toBe(true);
 expect(await page.evaluate(()=>(window as any).__pilot.snapshot().room)).toBe('square');expect(rooms).toEqual([]);
 // A delayed software-rendered frame may reach the final source in one step.
 // Both one-checkpoint and two-checkpoint approaches must wait for that final ACK.
 let finalSource=sources[0];
 if(Math.hypot(finalSource.value.position.x-20,finalSource.value.position.y-22)>1.25){
  await finalSource.route.fulfill({json:{ok:true,position:finalSource.value}});await expect.poll(()=>sources.length).toBe(2);finalSource=sources[1];
 }
 expect(Math.hypot(finalSource.value.position.x-20,finalSource.value.position.y-22)).toBeLessThanOrEqual(1.25);
 if(approach==='one-checkpoint')expect(sources).toHaveLength(1);
 expect(await page.evaluate(()=>(window as any).__pilot.snapshot().room)).toBe('square');expect(rooms).toEqual([]);
 // A deliberate new menu/destination intent must cancel the old pending portal.
 await page.getByRole('button',{name:'Open field guide'}).click();await finalSource.route.fulfill({json:{ok:true,position:finalSource.value}});
 // This release ends the first intent's transport fixture. A new approach must
 // receive its ACK rather than consuming an unused second first-intent hold.
 holdFirstApproach=false;await page.waitForTimeout(100);
 await expect(page.getByRole('dialog')).toBeVisible();expect(await page.evaluate(()=>(window as any).__pilot.snapshot().room)).toBe('square');expect(rooms).toEqual([]);
 await page.keyboard.press('Escape');await tapDoor();await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.snapshot().room)).toBe('workshop');await expect.poll(()=>rooms.length).toBe(1);
 expect(rejected).toEqual([]);
});
}
