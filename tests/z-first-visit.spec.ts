import {test,expect,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';

const evidence=process.env.QA_EVIDENCE_DIR??'test-results/browser';
const arrival=process.env.CI?40_000:12_000;
const town=(page:Page)=>page.evaluate(()=>(window as any).__pilot.town());
const actor=(page:Page)=>page.evaluate(()=>(window as any).__pilot.snapshot());
async function close(page:Page){await page.getByRole('button',{name:'Close panel',exact:true}).tap();}
async function walk(page:Page,id:string){
 await page.getByRole('button',{name:'Places',exact:false}).tap();
 await page.locator(`[data-destination="${id}"]`).tap();
 await expect.poll(async()=>(await actor(page)).walking,{timeout:arrival}).toBe(false);
 await expect.poll(async()=>(await actor(page)).nearby).toBe(id);
}
async function inspect(page:Page){await page.locator('#interact').tap();await expect(page.getByRole('dialog')).toBeVisible();}
async function point(page:Page,x:number,y:number){
 const screen=await page.evaluate(p=>(window as any).__pilot.screenPoint(p.x,p.y),{x,y});
 const canvas=(await page.locator('canvas').boundingBox())!;
 expect(screen.x).toBeGreaterThan(0);expect(screen.x).toBeLessThan(canvas.width);
 expect(screen.y).toBeGreaterThan(0);expect(screen.y).toBeLessThan(canvas.height);
 await page.touchscreen.tap(canvas.x+screen.x,canvas.y+screen.y);
}
async function bag(page:Page){await page.getByRole('button',{name:'Bag & journal',exact:true}).tap();await expect(page.locator('[data-quest]')).toBeVisible();}
async function snapshot(page:Page){const response=await page.request.get('/api/town/snapshot');expect(response.status()).toBe(200);return(await response.json()).snapshot;}

test('fresh phone resident: real first planter, queued return job, sixty-second upkeep and independent trail discovery',async({browser})=>{
 test.setTimeout(process.env.CI?300_000:120_000);
 // Ordered after shared-town, starter-homes and trail: those cases open the town
 // project. Drew is an ordinary fresh fixture, never one of their48-kit residents.
 // No SQL, intercepted response, clock override, position write or progress grant.
 const context=await browser.newContext({viewport:{width:360,height:640},hasTouch:true});
 const page=await context.newPage(),commands:any[]=[],errors:string[]=[],guest401:string[]=[];
 const timings:Record<string,number>={},guidance:Record<string,string>={};
 page.on('pageerror',error=>errors.push(error.message));
 page.on('request',request=>{if(new URL(request.url()).pathname==='/api/town/command')commands.push(request.postDataJSON());});
 page.on('response',response=>{const path=new URL(response.url()).pathname;if(response.status()>=400){if(response.status()===401&&path==='/api/town/snapshot')guest401.push(path);else errors.push(`${response.status()} ${path}`);}});
 mkdirSync(evidence,{recursive:true});
 try{
  await page.goto('/?town=1');await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
  const firstInput=Date.now();await page.getByRole('dialog').getByRole('button',{name:'Drew',exact:true}).tap();
  await expect.poll(async()=>(await town(page))?.playerId).toBe('drew');await expect(page.getByRole('dialog')).not.toBeVisible();
  const initial=await snapshot(page);expect(initial.workshop.inventory).toEqual({scrap:0,timber:0,supplies:0});expect(initial.workshop.bridgeKits).toBe(0);expect(initial.workshop.stats.plantersCrafted).toBe(0);expect(initial.lesson.startedAt).toBeNull();expect(initial.lesson.legacySatisfied).toBe(false);expect(initial.bridge.phase,'Run ordered shared-town, starter-homes and trail fixtures first.').toBe('open');
  const bridge=structuredClone(initial.bridge),journal=structuredClone(initial.projectJournal);
  await bag(page);guidance.fresh=(await page.locator('[data-quest]').textContent())!;await close(page);
  // Actual visible depot bodies, not synthetic actor relocation.
  for(const [resource,x] of [['scrap',21],['timber',23],['supplies',25]] as const){
   await point(page,x,28);await expect(page.locator(`[data-collect="${resource}"]`)).toBeVisible({timeout:arrival});await page.locator(`[data-collect="${resource}"]`).tap();await expect.poll(async()=>(await town(page)).workshop.inventory[resource]).toBe(6);await close(page);
  }
  await walk(page,'workshop');await page.locator('#interact').tap();await expect.poll(async()=>(await actor(page)).room,{timeout:arrival}).toBe('workshop');
  await walk(page,'bench');await inspect(page);await page.locator('[data-craft="planter"]').tap();
  await expect.poll(async()=>(await town(page)).workshop.job?.recipe).toBe('planter');const planterJob=(await town(page)).workshop.job;expect(planterJob.readyAt-planterJob.startedAt).toBe(5000);
  await expect(page.locator('[data-claim]')).toBeEnabled({timeout:10_000});await page.locator('[data-claim]').tap();await expect.poll(async()=>(await town(page)).workshop.owned.planter).toBe(1);await expect(page.locator('[data-craft="planter"]')).toHaveText('Make another planter · 8 real hours');await close(page);
  await bag(page);await page.getByRole('combobox',{name:'Furniture to place'}).selectOption('planter');await page.locator('[data-slot="north-west"]').tap();await page.getByRole('button',{name:'Place here',exact:true}).tap();await expect.poll(async()=>(await town(page)).workshop.stats.planterPlacedAfterCraft).toBe(true);await expect(page.locator('[data-quest]')).toContainText('Leave useful work on the bench');guidance.placed=(await page.locator('[data-quest]').textContent())!;await close(page);
  await inspect(page);await page.locator('[data-craft="bridge-kit"]').tap();await expect.poll(async()=>(await town(page)).workshop.job?.recipe).toBe('bridge-kit');const queued=structuredClone((await town(page)).workshop.job);expect(queued.readyAt-queued.startedAt).toBe(43_200_000);timings.queueMs=Date.now()-firstInput;await close(page);await bag(page);await expect(page.locator('[data-quest]')).toContainText('One small job for the town');guidance.queued=(await page.locator('[data-quest]').textContent())!;await close(page);await inspect(page);
  await page.getByRole('button',{name:'Orientation maintenance · one-time contribution',exact:true}).tap();await expect(page.getByRole('dialog')).toContainText(/separate upkeep\/inspection/);await page.locator('[data-lesson-start]').tap();await expect.poll(async()=>(await town(page)).lesson.startedAt).not.toBeNull();const paid=await town(page),lessonStartedLocal=Date.now();expect(paid.lesson.readyAt-paid.lesson.startedAt).toBe(60_000);expect(paid.workshop.inventory).toEqual({scrap:0,timber:1,supplies:3});expect(paid.workshop.job).toEqual(queued);await expect(page.locator('[data-lesson-complete]')).toBeDisabled();await page.screenshot({path:evidence+'/first-visit-phone-lesson-running.png'});await close(page);
  // Spend the real preparation minute on useful, free UI rather than advancing time.
  await bag(page);await expect(page.locator('[data-quest]')).toContainText('Maintenance is underway');guidance.preparing=(await page.locator('[data-quest]').textContent())!;await page.locator('[data-slot="south-middle"]').tap();await expect(page.getByRole('button',{name:'Cancel preview',exact:true})).toBeVisible();await page.getByRole('button',{name:'Cancel preview',exact:true}).tap();await close(page);
  await page.locator('#field-guide').tap();await expect(page.locator('[data-guide-objective]')).toBeVisible();await expect(page.locator('[data-guide-objective]')).toContainText('Maintenance is underway');guidance.guide=(await page.locator('[data-guide-objective]').textContent())!;await page.screenshot({path:evidence+'/first-visit-phone-guide.png'});await close(page);
  // A real excursion uses the preparation time: authored guidance, not a new shop.
  await walk(page,'door');await point(page,9,13.5);await expect.poll(async()=>(await actor(page)).room,{timeout:arrival}).toBe('square');
  await walk(page,'clerk');await inspect(page);await expect(page.getByRole('dialog')).toContainText(/paid one-minute preparation|Collect the credit at the workshop/);await expect(page.getByRole('dialog')).toContainText('ordinary job keeps its own deadline');guidance.clerk=(await page.getByRole('dialog').textContent())!;await close(page);
  await walk(page,'cafe');await point(page,30.5,21.5);await expect(page.getByRole('dialog')).toBeVisible({timeout:arrival});expect((await actor(page)).room).toBe('square');await expect(page.getByRole('dialog')).toContainText('No shop or indoor service is open yet');await expect(page.getByRole('dialog')).toContainText('ordinary job keeps its own deadline');guidance.cafe=(await page.getByRole('dialog').textContent())!;await page.screenshot({path:evidence+'/first-visit-phone-cafe-exterior.png'});await close(page);
  await walk(page,'workshop');await point(page,20,20.8);await expect.poll(async()=>(await actor(page)).room,{timeout:arrival}).toBe('workshop');await walk(page,'bench');expect((await town(page)).workshop.job).toEqual(queued);
  await page.reload();await expect.poll(async()=>(await town(page))?.playerId).toBe('drew');await expect.poll(async()=>(await actor(page)).room).toBe('workshop');expect((await town(page)).workshop.job).toEqual(queued);expect((await town(page)).lesson.startedAt).toBe(paid.lesson.startedAt);
  await bag(page);await expect(page.locator('[data-quest]')).toContainText(/Maintenance is underway|Your maintenance credit is ready/);guidance.resumed=(await page.locator('[data-quest]').textContent())!;await page.getByRole('button',{name:'Since your last visit',exact:true}).tap();await expect(page.getByRole('dialog')).toContainText('bench job is still running');await expect(page.getByRole('dialog')).toContainText(/paid orientation maintenance is preparing|paid orientation maintenance is ready to collect/);await close(page);
  await inspect(page);await page.getByRole('button',{name:'Orientation maintenance · one-time contribution',exact:true}).tap();await expect(page.locator('[data-lesson-complete]')).toBeEnabled({timeout:70_000});expect(Date.now()-lessonStartedLocal).toBeGreaterThanOrEqual(59_000);await close(page);await bag(page);await expect(page.locator('[data-quest]')).toContainText('Your maintenance credit is ready');guidance.ready=(await page.locator('[data-quest]').textContent())!;await close(page);await inspect(page);await page.getByRole('button',{name:'Orientation maintenance · one-time contribution',exact:true}).tap();await page.locator('[data-lesson-complete]').tap();await expect.poll(async()=>(await town(page)).lesson.completed).toBe(true);await close(page);await bag(page);await expect(page.locator('[data-quest]')).toContainText('Record your participation');guidance.credit=(await page.locator('[data-quest]').textContent())!;await close(page);
  await walk(page,'door');await page.locator('#interact').tap();await expect.poll(async()=>(await actor(page)).room,{timeout:arrival}).toBe('square');await walk(page,'bridge');await inspect(page);await expect(page.locator('[data-lesson-redeem="upkeep"]')).toBeVisible();await page.locator('[data-lesson-redeem="upkeep"]').tap();await expect.poll(async()=>(await town(page)).lesson.redeemed).toBe(true);timings.upkeepMs=Date.now()-firstInput;
  const recorded=await snapshot(page);expect(recorded.lesson.route).toBe('upkeep');expect(recorded.bridge).toEqual(bridge);expect(recorded.projectJournal).toEqual(journal);expect(recorded.workshop.job).toEqual(queued);expect(recorded.workshop.bridgeKits).toBe(0);expect(recorded.workshop.inventory).toEqual({scrap:0,timber:1,supplies:3});expect(recorded.quest.awarded.filter((id:string)=>id==='maintenance-v1')).toHaveLength(1);await expect(page.locator('[data-lesson-redeem]')).toHaveCount(0);await page.screenshot({path:evidence+'/first-visit-phone-upkeep-recorded.png'});
  await page.locator('[data-enter-trail]').tap();await expect.poll(async()=>(await actor(page)).room,{timeout:arrival}).toBe('trail');await walk(page,'trailhead');await inspect(page);await page.locator('[data-trail-stamp="trailhead"]').tap();await expect.poll(async()=>(await town(page)).trail.stamps).toEqual(['trailhead']);expect((await town(page)).trail.pennantOwned).toBe(false);await close(page);await bag(page);await expect(page.locator('[data-quest]')).toContainText('A useful reason to return');guidance.afterDiscovery=(await page.locator('[data-quest]').textContent())!;await expect(page.locator('[data-kits]')).toContainText('Bridge funding is complete');await expect(page.locator('[data-kits]')).not.toContainText('Visit the bridge committee to contribute');await page.screenshot({path:evidence+'/first-visit-phone-journal.png'});await close(page);
  await page.reload();await expect.poll(async()=>(await town(page))?.lesson.redeemed).toBe(true);expect((await town(page)).trail.stamps).toEqual(['trailhead']);expect((await town(page)).workshop.job).toEqual(queued);expect((await town(page)).bridge).toEqual(bridge);
  await page.setViewportSize({width:844,height:390});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await expect.poll(async()=>{const canvas=(await page.locator('canvas').boundingBox())!,wrap=(await page.locator('.world-wrap').boundingBox())!;return Math.abs(canvas.height-wrap.height);}).toBeLessThan(2);expect((await page.locator('.world-wrap').boundingBox())!.height).toBeGreaterThan(100);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await bag(page);await expect(page.getByRole('button',{name:'Close panel',exact:true})).toBeInViewport();await page.screenshot({path:evidence+'/first-visit-short-text200.png'});
  expect(commands.filter(command=>command.kind==='start-lesson')).toHaveLength(1);expect(commands.filter(command=>command.kind==='complete-lesson')).toHaveLength(1);expect(commands.filter(command=>command.kind==='redeem-lesson')).toHaveLength(1);expect(commands.filter(command=>command.kind==='stamp-trail')).toHaveLength(1);expect(errors).toEqual([]);
  writeFileSync(evidence+'/first-visit-authority.json',JSON.stringify({method:'Actual isolated ih2_browser ordinary fresh Drew,360×640 touch emulation and844×390 with200%DOM text. No interceptions, SQL, clock/position overrides or progress grants. Existing ordered tests opened the bridge; first-input timings are automated UI execution, not owner reading/playtest or physical-device evidence.',timings,guidance,queuedJob:queued,lesson:recorded.lesson,inventory:recorded.workshop.inventory,outputKits:recorded.workshop.bridgeKits,unchangedBridge:bridge,commands,errors,expectedInitialGuest401:guest401,findings:[{area:'phone first visit',result:'real five-second planter and real sixty-second lesson; ordinary twelve-hour job preserved'},{area:'late arrival',result:'quoted upkeep, no project/deadline mutation or kit reward'},{area:'short text200',result:'scrolling journal, reachable close and world>100px'}]},null,2));
 }finally{await context.close();}
});
