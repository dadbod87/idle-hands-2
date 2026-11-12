import {TOWN_SCHEMA} from '../src/game/protocol-version.ts';
import {test,expect,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {database} from '../server/db.ts';
import {TRAIL_LANDMARK_IDS} from '../src/game/world.ts';

const evidence=process.env.QA_EVIDENCE_DIR??'test-results/browser';
const arrivalTimeout=process.env.CI?40_000:12_000;
const town=(page:Page)=>page.evaluate(()=>(window as any).__pilot.town());
const actor=(page:Page)=>page.evaluate(()=>(window as any).__pilot.snapshot());
const economy=(snapshot:any)=>({inventory:snapshot.workshop.inventory,kits:snapshot.workshop.bridgeKits,owned:snapshot.workshop.owned,job:snapshot.workshop.job,skills:snapshot.workshop.skills,scores:snapshot.scores});
async function close(page:Page){await page.getByRole('button',{name:'Close panel',exact:true}).click();}
async function ready(page:Page,name:string){
 await page.goto('/?town=1&sky-study=1&phase=day&weather=clear');
 await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
 await page.getByRole('dialog').getByRole('button',{name,exact:true}).click();
 await expect.poll(async()=>(await town(page))?.playerId).toBe(name.toLowerCase());
 await expect(page.getByRole('dialog')).not.toBeVisible();
}
async function point(page:Page,x:number,y:number,touch=false){
 // A transport snapshot can precede Phaser boot/authoritative feet adoption.
 // Measure against one actually rendered camera frame after input unlocks,
 // keeping the original direct canvas target and arrival assertions intact.
 await expect.poll(()=>page.evaluate(()=>{const p=(window as any).__pilot;return !!p?.metrics().ready&&!p.snapshot().locked&&p.metrics().visual.home.room===p.snapshot().room;})).toBe(true);
 const frame=await page.evaluate(()=>(window as any).__pilot.metrics().presentation.renderedFrames);
 await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.metrics().presentation.renderedFrames)).toBeGreaterThan(frame);
 const screen=await page.evaluate(value=>(window as any).__pilot.screenPoint(value.x,value.y),{x,y}),canvas=(await page.locator('canvas').boundingBox())!;
 expect(screen.x).toBeGreaterThan(0);expect(screen.x).toBeLessThan(canvas.width);expect(screen.y).toBeGreaterThan(0);expect(screen.y).toBeLessThan(canvas.height);
 if(touch)await page.touchscreen.tap(canvas.x+screen.x,canvas.y+screen.y);else await page.mouse.click(canvas.x+screen.x,canvas.y+screen.y);
}
async function walkTo(page:Page,id:string,touch=false){
 const places=page.getByRole('button',{name:'Places',exact:false});if(touch)await places.tap();else await places.click();
 const destination=page.locator(`[data-destination="${id}"]`);if(touch)await destination.tap();else await destination.click();
 await expect.poll(async()=>(await actor(page)).walking,{timeout:arrivalTimeout}).toBe(false);
 await expect.poll(async()=>(await actor(page)).nearby).toBe(id);
}
async function inspect(page:Page,touch=false){if(touch)await page.locator('#interact').tap();else await page.locator('#interact').click();await expect(page.getByRole('dialog')).toBeVisible();}
async function leaveInterior(page:Page,touch=false){
 const room=(await actor(page)).room;
 if(room==='home'||room==='home-expanded'){await point(page,9,13.5,touch);await expect.poll(async()=>(await actor(page)).room,{timeout:arrivalTimeout}).toBe('square');}
 else if(room==='workshop'){await point(page,9,13.5,touch);await expect.poll(async()=>(await actor(page)).room,{timeout:arrivalTimeout}).toBe('square');}
}
async function apiSnapshot(page:Page){const response=await page.request.get('/api/town/snapshot',{headers:{'X-IH2-Schema':TOWN_SCHEMA}});expect(response.status()).toBe(200);return(await response.json()).snapshot;}
async function post(page:Page,endpoint:string,data:unknown){return page.request.post('/api/town/'+endpoint,{headers:{Origin:new URL(page.url()).origin,'X-IH2-Schema':TOWN_SCHEMA},data});}

test('real isolated town: timed opening, personal trail journal and permanent home pennant',async({browser})=>{
 test.setTimeout(process.env.CI?300_000:120_000);
 // This suite continues the actual shared-town + starter-homes fixtures. They
 // earn the three contributions and Casey's house through UI, never this test.
 const url=process.env.IH2_BROWSER_DATABASE_URL??'postgres://ih2:local-synthetic-only@127.0.0.1:55432/ih2_browser';
 const parsed=new URL(url);if(parsed.pathname!=='/ih2_browser'||!['127.0.0.1','localhost'].includes(parsed.hostname))throw new Error('Trail time fixture is restricted to the disposable loopback ih2_browser database.');
 const pool=database(url),desktop=await browser.newContext({viewport:{width:1440,height:900}});
 let phone:Awaited<ReturnType<typeof browser.newContext>>|undefined;
 const owner=await desktop.newPage(),errors:string[]=[],stampCommands:Record<string,unknown>[]=[];
 const observe=(page:Page)=>{page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(new URL(request.url()).pathname==='/api/town/command'){const command=request.postDataJSON();if(command.kind==='stamp-trail')stampCommands.push(command);}});};observe(owner);
 mkdirSync(evidence,{recursive:true});
 try{
  await ready(owner,'Casey');const initial=await town(owner);
  expect(initial.bridge.phase,'Run shared-town.spec.ts and starter-homes.spec.ts first; no synthetic funding is added here.').toBe('building');
  expect(initial.bridge.contributed).toBe(3);expect(initial.bridge.restored).toBe(false);expect(initial.bridge.grandfathered).toBe(false);
  expect(initial.bridge.readyAt-initial.bridge.startedAt).toBe(6*3_600_000);expect(initial.bridge.openedAt).toBe(null);
  expect(initial.plot?.ownerId).toBe('casey');expect(initial.plot.level).toBe(2);expect(initial.trail.stamps).toEqual([]);expect(initial.trail.pennantOwned).toBe(false);
  const plotId=initial.plot.id,beforeEconomy=economy(initial);
  await leaveInterior(owner);await walkTo(owner,'bridge');await inspect(owner);
  await expect(owner.getByRole('dialog')).toContainText(/building|inspection|construction/i);
  await expect(owner.locator('[data-enter-trail]')).toBeDisabled();
  await owner.screenshot({path:evidence+'/trail-desktop-building.png'});await close(owner);
  await point(owner,25.5,11.25);await expect(owner.getByRole('dialog')).toBeVisible();
  expect((await actor(owner)).room).toBe('square');await expect(owner.locator('[data-enter-trail]')).toBeDisabled();await close(owner);
  const denied=await post(owner,'movement',{room:'trail',position:{x:9,y:22}});expect(denied.status()).toBe(409);
  expect((await apiSnapshot(owner)).position.room).toBe('square');

  // Only project timing is accelerated, preserving the six-hour duration.
  // Player stock, stamps, quest awards, housing and opened_at are never changed.
  const fixtureNow=Date.now(),advanced=await pool.query('update ih2.bridge set started_at=$1,ready_at=$2 where id=1 and phase=$3 and contributed=target returning phase,started_at,ready_at',[fixtureNow-6*3_600_000-1000,fixtureNow-1000,'building']);
  expect(advanced.rowCount).toBe(1);
  const opened=await apiSnapshot(owner);expect(opened.bridge.phase).toBe('open');expect(opened.bridge.restored).toBe(true);expect(opened.bridge.openedAt).toBe(opened.bridge.readyAt);
  const opening=opened.projectJournal.filter((entry:any)=>entry.id==='bridge-opened-v2');expect(opening).toHaveLength(1);
  expect(opening[0].effectiveAt).toBe(opened.bridge.readyAt);
  for(let check=0;check<2;check++){const again=await apiSnapshot(owner);expect(again.bridge).toEqual(opened.bridge);expect(again.projectJournal).toEqual(opened.projectJournal);}
  await walkTo(owner,'bridge');await inspect(owner);await owner.locator('[data-bridge-check]').click();
  await expect(owner.locator('[data-project-event="bridge-opened-v2"]')).toHaveCount(1);
  await expect(owner.locator('[data-enter-trail]')).toBeEnabled();
  await expect(owner.locator('[data-bridge-clock]')).toContainText('The trail stays open');
  expect((await town(owner)).bridge.readyAt).toBe(opened.bridge.readyAt);
  await owner.screenshot({path:evidence+'/trail-desktop-opening-journal.png'});await close(owner);
  await owner.reload();await expect.poll(async()=>(await town(owner))?.bridge.phase).toBe('open');
  // Actual direct canvas doorway input; no position injection or movement API shortcut.
  await point(owner,25.5,11.25);await expect.poll(async()=>(await actor(owner)).room,{timeout:arrivalTimeout}).toBe('trail');
  expect((await actor(owner)).position).toEqual({x:9,y:22});
  await owner.screenshot({path:evidence+'/trail-desktop-entry.png'});
  for(const landmarkId of TRAIL_LANDMARK_IDS){
   await walkTo(owner,landmarkId);
   if(landmarkId==='trailhead'){await point(owner,6,17.4);await expect(owner.getByRole('dialog')).toBeVisible();}else await inspect(owner);
   await owner.locator(`[data-trail-stamp="${landmarkId}"]`).click();
   await expect.poll(async()=>(await town(owner)).trail.stamps.includes(landmarkId)).toBe(true);
   await expect(owner.locator(`[data-trail-stamp="${landmarkId}"]`)).toBeDisabled();
   if(landmarkId==='lookout')await owner.screenshot({path:evidence+'/trail-desktop-lookout-pennant-earned.png'});
   await close(owner);
  }
  const completed=await town(owner);expect([...completed.trail.stamps].sort()).toEqual([...TRAIL_LANDMARK_IDS].sort());expect(completed.trail.pennantOwned).toBe(true);
  expect(completed.quest.awarded.filter((id:string)=>id==='trail-pennant-v1')).toHaveLength(1);expect(completed.plot.pennantOwned).toBe(true);expect(economy(completed)).toEqual(beforeEconomy);
  expect(stampCommands).toHaveLength(3);
  const replay=await post(owner,'command',stampCommands[0]);expect(replay.status()).toBe(200);const replayed=await replay.json();expect(replayed.replayed).toBe(true);expect(replayed.snapshot.trail).toEqual(completed.trail);
  const stampRows=await pool.query('select landmark_id from ih2.trail_stamps where player_id=$1 order by landmark_id',['casey']);expect(stampRows.rows.map(row=>row.landmark_id)).toEqual([...TRAIL_LANDMARK_IDS].sort());
  await owner.reload();await expect.poll(async()=>(await town(owner))?.trail.pennantOwned).toBe(true);expect((await town(owner)).trail.stamps).toHaveLength(3);
  await walkTo(owner,'trail-exit');await point(owner,9,24);
  await expect.poll(async()=>(await actor(owner)).room,{timeout:arrivalTimeout}).toBe('square');expect((await actor(owner)).position).toEqual({x:25.5,y:12.6});
  await expect.poll(async()=>(await apiSnapshot(owner)).position.room).toBe('square');
  expect((await apiSnapshot(owner)).position.position).toEqual({x:25.5,y:12.6});
  await walkTo(owner,'home-front');await point(owner,30,34.5);
  await expect.poll(async()=>(await actor(owner)).room,{timeout:arrivalTimeout}).toBe('home-expanded');
  await expect.poll(()=>owner.evaluate(()=>(window as any).__pilot.metrics().visual.home.plotId)).toBe(plotId);
  const homeVisual=await owner.evaluate(()=>(window as any).__pilot.metrics().visual.home);
  // Renderer diagnostic assertion is paired with the actual in-game PNG review.
  expect(homeVisual.pennantVisible).toBe(true);await owner.screenshot({path:evidence+'/trail-desktop-home-wall-pennant.png'});
  await desktop.close();

  // Sequential phone newcomer: no need to render another desktop canvas while walking.
  phone=await browser.newContext({viewport:{width:360,height:640},hasTouch:true});const newcomer=await phone.newPage();observe(newcomer);
  await ready(newcomer,'Bea');expect((await town(newcomer)).trail.stamps).toEqual([]);expect((await town(newcomer)).trail.pennantOwned).toBe(false);
  const newcomerEconomy=economy(await town(newcomer));await leaveInterior(newcomer,true);await walkTo(newcomer,'bridge',true);
  await point(newcomer,25.5,11.25,true);await expect.poll(async()=>(await actor(newcomer)).room,{timeout:arrivalTimeout}).toBe('trail');
  await walkTo(newcomer,'trailhead',true);await inspect(newcomer,true);await newcomer.locator('[data-trail-stamp="trailhead"]').tap();
  await expect.poll(async()=>(await town(newcomer)).trail.stamps).toEqual(['trailhead']);expect((await town(newcomer)).trail.pennantOwned).toBe(false);
  expect((await town(newcomer)).plots.find((plot:any)=>plot.id===plotId).pennantOwned).toBe(true);expect(economy(await town(newcomer))).toEqual(newcomerEconomy);
  await newcomer.screenshot({path:evidence+'/trail-phone-newcomer-stamp.png'});await close(newcomer);
  await newcomer.goto('/?town=1&sky-study=1&phase=night&weather=clear');
  await expect.poll(async()=>(await actor(newcomer))?.room).toBe('trail');
  await expect.poll(()=>newcomer.evaluate(()=>(window as any).__pilot.metrics().climate?.interior)).toBe(false);
  const nightClimate=await newcomer.evaluate(()=>(window as any).__pilot.metrics().climate);expect(nightClimate.effectiveAlpha).toBeCloseTo(.36,5);
  expect((await town(newcomer)).trail.stamps).toEqual(['trailhead']);expect(economy(await town(newcomer))).toEqual(newcomerEconomy);
  await newcomer.screenshot({path:evidence+'/trail-phone-night-outdoor.png'});
  await newcomer.setViewportSize({width:844,height:390});await newcomer.evaluate(()=>document.documentElement.style.fontSize='200%');
  await expect.poll(async()=>{const canvas=(await newcomer.locator('canvas').boundingBox())!,wrap=(await newcomer.locator('.world-wrap').boundingBox())!;return Math.max(Math.abs(canvas.height-wrap.height),Math.abs(canvas.width-wrap.width));}).toBeLessThan(2);
  const shortWorld=(await newcomer.locator('.world-wrap').boundingBox())!;expect(shortWorld.height).toBeGreaterThanOrEqual(195);
  expect(await newcomer.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const shortControls=[];for(const target of await newcomer.locator('nav button,#field-guide').all()){const box=(await target.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(844);expect(box.y+box.height).toBeLessThanOrEqual(390);shortControls.push(box);}
  await newcomer.screenshot({path:evidence+'/trail-short-text200-world.png'});
  await newcomer.getByRole('button',{name:'Bag & journal',exact:true}).tap();await newcomer.getByRole('button',{name:'Trail field notebook',exact:true}).tap();
  await expect(newcomer.getByRole('button',{name:'Close panel',exact:true})).toBeInViewport();
  expect(await newcomer.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  const explanation=newcomer.getByText('Discoveries belong to you, even if someone else repaired the bridge.',{exact:false});await explanation.scrollIntoViewIfNeeded();await expect(explanation).toBeInViewport();
  await newcomer.getByRole('button',{name:'Close panel',exact:true}).scrollIntoViewIfNeeded();await expect(newcomer.getByRole('button',{name:'Close panel',exact:true})).toBeInViewport();
  await newcomer.screenshot({path:evidence+'/trail-short-text200-notebook.png'});await close(newcomer);
  await newcomer.evaluate(()=>document.documentElement.style.fontSize='100%');await newcomer.setViewportSize({width:360,height:640});
  await expect.poll(async()=>{const canvas=(await newcomer.locator('canvas').boundingBox())!,wrap=(await newcomer.locator('.world-wrap').boundingBox())!;return Math.max(Math.abs(canvas.height-wrap.height),Math.abs(canvas.width-wrap.width));}).toBeLessThan(2);
  await walkTo(newcomer,'trail-exit',true);await point(newcomer,9,24,true);await expect.poll(async()=>(await actor(newcomer)).room,{timeout:arrivalTimeout}).toBe('square');expect((await actor(newcomer)).position).toEqual({x:25.5,y:12.6});
  expect(errors).toEqual([]);
  writeFileSync(evidence+'/trail-authority.json',JSON.stringify({
   disclosure:'Actual disposable loopback ih2_browser backend, fictional browser-server residents and stock; shared-town/starter-homes tests earn initial project funding and Casey home. No HTTP/EventSource interception or player inventory/stamp/property mutation. The sole SQL write moves both project timestamps six hours earlier while preserving duration; a real snapshot settles opening. Explicit day/clear and phone night/clear sky-study URLs are cosmetic only; Date.now, player production and scores are unchanged. Desktop/touch viewport emulation is not a physical-device test.',
   initialBridge:initial.bridge,projectTimeFixture:advanced.rows[0],openedBridge:opened.bridge,openingJournal:opening,
   ownerStamps:completed.trail,ownerEconomyUnchanged:true,stampCommands,duplicateReplayed:replayed.replayed,homeVisual,
   newcomerTrail:(await town(newcomer)).trail,newcomerEconomyUnchanged:true,nightClimate,shortLayout:{viewport:{width:844,height:390},rootText:'200%',world:shortWorld,controls:shortControls},errors
  },null,2));
 }finally{await desktop.close();await phone?.close();await pool.end();}
});
