import{revealPlace}from'./helpers/places.ts';
import {test,expect,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {worlds} from '../src/game/world.ts';
import type {WorkshopState} from '../src/game/live-workshop.ts';

const evidence=process.env.QA_EVIDENCE_DIR??'test-results/browser';
const arrival=process.env.CI?40_000:15_000;
const saved=(page:Page)=>page.evaluate(()=>(window as any).__pilot.workshop()) as Promise<WorkshopState>;
const feet=(page:Page)=>page.evaluate(()=>(window as any).__pilot.snapshot());
async function boot(page:Page,url='/'){
 await page.goto(url);await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
}
async function close(page:Page){await page.getByRole('button',{name:'Close panel',exact:true}).click();}
async function beds(page:Page){
 await page.locator('#journal').click();await page.getByRole('button',{name:'Your allotment · crops, markers & quests',exact:true}).click();
}
async function settled(page:Page){
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
 await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.metrics().presentation.menuBackdropPaused)).toBe(true);
}
async function visibleControl(page:Page,selector:string){
 const target=page.locator(selector);
 for(let step=0;step<32;step++){if(await target.evaluate(e=>e===document.activeElement))break;await page.keyboard.press('Tab');expect(step).toBeLessThan(31);}
 await settled(page);
 const box=(await target.boundingBox())!,head=(await page.locator('.dialog-head').boundingBox())!,feedback=(await page.locator('.garden-status').boundingBox())!;
 expect(box.height).toBeGreaterThanOrEqual(44);
 expect(box.y).toBeGreaterThanOrEqual(head.y+head.height-.5);
 expect(box.y+box.height).toBeLessThanOrEqual(feedback.y+.5);
 return{box,head,feedback};
}

test('phone garden action layout: free previews, stable feedback, accessible arrangements and short text200 controls',async({browser})=>{
 const context=await browser.newContext({viewport:{width:360,height:640},hasTouch:true}),page=await context.newPage(),errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));mkdirSync(evidence,{recursive:true});
 try{
  await boot(page);const initial=await saved(page);await beds(page);
  const walk=(await page.getByRole('button',{name:'Walk to the beds',exact:true}).boundingBox())!;
  expect(walk.y).toBeLessThan(210);expect(walk.height).toBeGreaterThanOrEqual(44);
  await page.getByRole('button',{name:'Walk to the beds',exact:true}).click();
  await expect.poll(async()=>(await feet(page)).room,{timeout:arrival}).toBe('garden');
  await expect(page.getByRole('dialog')).toBeVisible();await expect(page.locator('#panel-title')).toHaveText('Your rented allotment');
  const previewBox=(await page.locator('[data-garden-action=preview-plant]').boundingBox())!,footerBox=(await page.locator('.garden-status').boundingBox())!;
  expect(previewBox.y+previewBox.height).toBeLessThanOrEqual(footerBox.y+.5);
  await page.screenshot({path:evidence+'/clarity-phone-first-actions.png'});
  await page.locator('[data-garden-action=preview-plant]').click();await expect(page.locator('[data-garden-quote]')).toBeFocused();
  await expect(page.locator('[data-garden-quote]')).toContainText('Cost: 1 seed');await page.locator('[data-garden-action=cancel-preview]').click();
  expect((await saved(page)).garden.planted).toBe(0);
  await page.locator('[data-garden-action=preview-plant]').click();await page.locator('[data-garden-action=plant]').click();
  await expect.poll(async()=>(await saved(page)).garden.planted).toBe(1);
  const deadline=(await saved(page)).garden.beds[0]!.readyAt;
  await expect(page.locator('.garden-status')).toContainText(/Planted|planted/);
  const statusBounds=(await page.locator('.garden-status').boundingBox())!,dialogBounds=(await page.getByRole('dialog').boundingBox())!;
  expect(statusBounds.y+statusBounds.height).toBeLessThanOrEqual(dialogBounds.y+dialogBounds.height+.5);
  await page.locator('[data-garden-action=observe]').click();expect((await saved(page)).garden.beds[0]!.readyAt).toBe(deadline);
  expect((await saved(page)).garden.practice).toBe(0);
  await page.getByText('Practice, bed arrangement & growing notes',{exact:true}).click();
  await page.getByLabel('Other bed to swap with').selectOption('1');await page.locator('[data-garden-action=swap-beds]').click();
  await expect.poll(async()=>(await saved(page)).garden.beds[1]?.readyAt).toBe(deadline);
  expect((await saved(page)).garden.beds[0]).toBeNull();expect((await saved(page)).garden.planted).toBe(1);
  await close(page);
  const beforeNotes=await feet(page),worldHeight=(await page.locator('.world-wrap').boundingBox())!.height;
  await page.evaluate(()=>document.querySelector('#feedback')!.textContent='A deliberately long isolated field-note fixture. '.repeat(30));
  await expect.poll(async()=>(await page.locator('.world-wrap').boundingBox())!.height).toBeCloseTo(worldHeight,1);
  await page.locator('#feedback').focus();await page.keyboard.press('ArrowDown');
  await expect.poll(()=>page.locator('#feedback').evaluate(e=>e.scrollTop)).toBeGreaterThan(0);
  expect((await feet(page)).position).toEqual(beforeNotes.position);
  await page.locator('canvas').focus();await page.keyboard.down('ArrowRight');
  try{await expect.poll(async()=>(await feet(page)).position.x).toBeGreaterThan(beforeNotes.position.x+.15);}finally{await page.keyboard.up('ArrowRight');}
  // Return through the actual named route after the input check; no position write.
  await beds(page);await page.getByRole('button',{name:'Walk to the beds',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('[data-garden-bed="2"]').click();await page.getByLabel(/Out-of-office marigold/).check();
  await page.setViewportSize({width:844,height:390});await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  await page.locator('[data-garden-action=preview-plant]').click();await settled(page);
  const quote=(await page.locator('[data-garden-quote]').boundingBox())!,header=(await page.locator('.dialog-head').boundingBox())!;
  expect(quote.y).toBeGreaterThanOrEqual(header.y+header.height+3);
  expect(await page.locator('#panel-body').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
  const confirm=await visibleControl(page,'[data-garden-action=plant]');
  await page.screenshot({path:evidence+'/clarity-short-text200-confirm.png'});
  await page.keyboard.press('Tab');await expect(page.locator('[data-garden-action=cancel-preview]')).toBeFocused();await page.keyboard.press('Enter');
  const final=await saved(page);expect(final.garden.planted).toBe(1);expect(final.garden.beds[1]!.readyAt).toBe(deadline);
  for(const key of ['inventory','owned','placements','job','stats','skills','bridgeKits']as const)expect(final[key]).toEqual(initial[key]);
  expect(errors).toEqual([]);
  writeFileSync(evidence+'/clarity-phone-actions.json',JSON.stringify({disclosure:'Fresh browser-only UI; actual one starter-seed planting, cosmetic inspection and free swap. No clock/state/position or inventory grants. Only long field-note text is a declared presentation fixture; viewport/text scaling is emulation.',walk,previewBox,statusBounds,dialogBounds,confirm,deadline,planted:final.garden.planted,errors},null,2));
 }finally{await context.close();}
});

test('named journeys: guide enters once, rental room is centered, current-stop reopening stays active and Places announces arrival',async({page})=>{
 mkdirSync(evidence,{recursive:true});const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.setViewportSize({width:1440,height:900});await boot(page);const initial=await saved(page);
 await page.locator('#field-guide').click();await expect(page.locator('#guide-workshop')).toHaveText('Enter your workshop →');await page.locator('#guide-workshop').click();
 await expect.poll(async()=>(await feet(page)).room,{timeout:arrival}).toBe('workshop');
 await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.metrics().visual.home.room)).toBe('workshop');
 expect((await feet(page)).position).toEqual(worlds.square.stops.find(s=>s.id==='workshop')!.arrival);
 await expect(page.getByRole('dialog')).not.toBeVisible();
 const canvas=(await page.locator('canvas').boundingBox())!,origin=await page.evaluate(()=>(window as any).__pilot.screenPoint(-.5,-.5));
 expect(origin.x).toBeCloseTo(Math.max(0,(canvas.width-worlds.workshop.width*32)/2),0);
 if(canvas.height>worlds.workshop.height*32)expect(origin.y).toBeCloseTo((canvas.height-worlds.workshop.height*32)/2,0);
 await page.screenshot({path:evidence+'/clarity-desktop-centered-workshop.png'});
 await page.locator('#field-guide').click();await expect(page.locator('#guide-workshop')).toHaveText('Inspect your bench →');await page.locator('#guide-workshop').click();
 await expect(page.locator('[data-craft=planter]')).toBeVisible({timeout:arrival});await close(page);
 await beds(page);await page.getByRole('button',{name:'Walk to the beds',exact:true}).click();
 await expect.poll(async()=>(await feet(page)).room,{timeout:arrival}).toBe('garden');await expect(page.getByRole('dialog')).toBeVisible();
 // Reopen the already-reached destination: the old close notification must not
 // tear down the newly opened garden's active controls.
 await page.getByRole('button',{name:'Walk to the beds',exact:true}).click();await page.waitForTimeout(150);
 await expect(page.getByRole('dialog')).toBeVisible();await page.locator('[data-garden-action=preview-plant]').click();await expect(page.locator('[data-garden-quote]')).toContainText('Cost: 1 seed');await page.locator('[data-garden-action=cancel-preview]').click();await close(page);
 await page.locator('#places').click();await expect((await revealPlace(page,'[data-destination=garden-exit]'))).toContainText('Walk to');await (await revealPlace(page,'[data-destination=garden-exit]')).click();
 await expect.poll(async()=>(await feet(page)).walking,{timeout:arrival}).toBe(false);await expect(page.locator('#feedback')).toContainText('Choose Enter');expect((await feet(page)).room).toBe('garden');
 await page.locator('#interact').click();await expect.poll(async()=>(await feet(page)).room).toBe('square');expect((await feet(page)).position).toEqual(worlds.garden.stops.find(s=>s.id==='garden-exit')!.arrival);
 await page.locator('#field-guide').click();await page.locator('#guide-workshop').click();await expect.poll(async()=>(await feet(page)).walking).toBe(true);
 await page.keyboard.down('ArrowLeft');await page.waitForTimeout(200);await page.keyboard.up('ArrowLeft');await expect.poll(async()=>(await feet(page)).walking).toBe(false);
 const cancelled=await feet(page);await page.waitForTimeout(1700);expect((await feet(page)).room).toBe('square');expect((await feet(page)).position).toEqual(cancelled.position);
 const final=await saved(page);for(const key of ['inventory','owned','placements','job','stats','skills','bridgeKits']as const)expect(final[key]).toEqual(initial[key]);
 expect(final.garden.planted).toBe(0);expect(final.carpentry.produced).toBe(0);expect(errors).toEqual([]);
 writeFileSync(evidence+'/clarity-named-journeys.json',JSON.stringify({disclosure:'Fresh actual local browser UI and real walking/doors/manual cancellation, no state/time/position grants or API interception. Desktop framing emulation, not device proof.',canvas,origin,entry:worlds.square.stops.find(s=>s.id==='workshop')!.arrival,gardenExit:worlds.garden.stops.find(s=>s.id==='garden-exit')!.arrival,cancelled,errors},null,2));
});

test('phone Places in overlapping ranges walks to the requested Inspect target before reporting arrival',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),page=await context.newPage();try{
 mkdirSync(evidence,{recursive:true});
 // Declared position-only fixture: both authored interaction circles overlap.
 // No inventory/time/API grants, and actual walking must resolve the target.
 await page.addInitScript(()=>localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'square',position:{x:24.6,y:12.6}})));
 await boot(page);const initial=await saved(page);expect((await feet(page)).nearby).toBe('trail-gate');
 await page.locator('#places').tap();await (await revealPlace(page,'[data-destination=bridge]')).tap();
 await expect.poll(async()=>(await feet(page)).nearby,{timeout:arrival}).toBe('bridge');await expect.poll(async()=>(await feet(page)).walking).toBe(false);
 expect((await feet(page)).position).toEqual({x:24,y:13});await expect(page.locator('#feedback')).toHaveText('At Bridge committee. Choose Inspect.');
 await expect(page.locator('#interact')).toHaveAttribute('aria-label','Inspect Bridge committee');await page.screenshot({path:evidence+'/clarity-phone-places-overlap.png'});
 await page.locator('#interact').tap();await expect(page.locator('#panel-title')).toHaveText('Bridge committee');expect((await saved(page)).revision).toBe(initial.revision);
 for(const key of ['inventory','owned','placements','job','stats','skills','bridgeKits']as const)expect((await saved(page))[key]).toEqual(initial[key]);
 writeFileSync(evidence+'/clarity-places-overlap.json',JSON.stringify({disclosure:'Isolated browser-only position fixture inside overlapping authored ranges. Actual touch Places walk and Inspect, no time/inventory/API grants. Emulated phone, not a real device or server-authority proof.',startedAt:{x:24.6,y:12.6},initialNearby:'trail-gate',arrivedAt:{x:24,y:13},finalNearby:'bridge',revisionUnchanged:true},null,2));
 }finally{await context.close();}
});
