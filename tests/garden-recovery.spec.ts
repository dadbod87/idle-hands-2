import {test,expect,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {Pool} from 'pg';
import {createWorkshop,applyWorkshop} from '../src/game/workshop.ts';
import {localDatabaseUrl} from '../server/db.ts';
const dir=process.env.QA_EVIDENCE_DIR??'test-results/browser';
const saved=(page:Page)=>page.evaluate(()=>(window as any).__pilot.workshop());
const feet=(page:Page)=>page.evaluate(()=>(window as any).__pilot.snapshot());
test('pending garden save: lost committed planting is recovered once before a requested Places walk',async({browser})=>{
 test.setTimeout(process.env.CI?120000:60000);mkdirSync(dir,{recursive:true});
 const url=localDatabaseUrl(process.env.IH2_BROWSER_DATABASE_URL??'postgres://ih2:local-synthetic-only@127.0.0.1:55432/ih2_browser');expect(new URL(url).pathname).toBe('/ih2_browser');
 const context=await browser.newContext({viewport:{width:360,height:640},hasTouch:true}),page=await context.newPage(),commands:Array<{id:string;body:string}>=[],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('/?town=1');await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
  await page.getByRole('button',{name:'Rowan',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.town()?.playerId)).toBe('clarity-gardener');
  const before=await saved(page);expect(before.garden.planted).toBe(0);expect(before.garden.seeds.radish).toBe(2);
  await page.locator('#bag').click();await page.getByRole('button',{name:'Your allotment · crops, markers & quests',exact:true}).click();await page.getByRole('button',{name:'Walk to the beds',exact:true}).click();
  await expect(page.locator('#panel-title')).toHaveText('Your rented allotment',{timeout:process.env.CI?40000:15000});await expect.poll(async()=>(await feet(page)).room).toBe('garden');
  const position=(await feet(page)).position;let lost=false;
  await page.route('**/api/town/command',async route=>{const payload=route.request().postDataJSON();if(payload.kind==='garden'&&payload.gardenAction.action==='plant'){commands.push({id:payload.id,body:route.request().postData()!});if(!lost){lost=true;const response=await route.fetch();expect(response.ok()).toBe(true);await route.abort();return;}}await route.continue();});
  await page.locator('[data-garden-action=preview-plant]').click();await page.locator('[data-garden-action=plant]').click();await expect(page.locator('[data-garden-action=retry]')).toBeEnabled();
  await expect(page.locator('[data-garden-action=plant]')).toBeDisabled();await page.keyboard.press('Escape');
  await page.locator('#places').click();await page.locator('[data-destination=garden-exit]').click();await expect(page.locator('#panel-title')).toHaveText('Confirm pending request');
  expect((await feet(page)).room).toBe('garden');expect((await feet(page)).position).toEqual(position);await page.screenshot({path:dir+'/clarity-phone-pending-route.png'});
  await page.getByRole('button',{name:'Retry the same request',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect.poll(async()=>(await saved(page)).garden.planted).toBe(1);expect(commands).toHaveLength(2);expect(commands[1]).toEqual(commands[0]);
  const after=await saved(page);expect(after.garden.seeds.radish).toBe(1);expect(after.garden.beds.filter(Boolean)).toHaveLength(1);expect(after.garden.beds[0].readyAt-after.garden.beds[0].plantedAt).toBe(300000);
  await page.waitForTimeout(1000);expect((await feet(page)).room).toBe('garden');expect((await feet(page)).position).toEqual(position);expect((await feet(page)).walking).toBe(false);
  for(const key of ['inventory','owned','placements','job','stats','skills','bridgeKits'])expect(after[key]).toEqual(before[key]);expect(errors).toEqual([]);
  writeFileSync(dir+'/clarity-garden-pending.json',JSON.stringify({disclosure:'Actual UI/HTTP/isolated ih2_browser PostgreSQL with a dedicated ordinary-zero-progress fictional Rowan. First successful committed planting response deliberately aborted. Same exact command body/UUID retried; one seed debit, no position/time/inventory grants, no queued exit. Emulated touch, not a physical phone or hosted test.',commands,position,planted:after.garden.planted,seeds:after.garden.seeds,errors},null,2));
 }finally{await context.close();const pool=new Pool({connectionString:url});try{await pool.query("delete from ih2.players where id='clarity-gardener'");}finally{await pool.end();}}
});

test('elapsed garden fixture: readiness does not steal bed focus, goal-flower confirmation stays fixed and old work survives',async({page})=>{
 mkdirSync(dir,{recursive:true});let at=Date.now()-4*3600000-1000,s=createWorkshop(at),serial=0;
 const act=(command:Record<string,unknown>)=>{const result=applyWorkshop(s,{...command,id:'clarity-elapsed-'+(++serial),expectedRevision:s.revision},at);expect(result.ok,result.message).toBe(true);s=result.state;};
 for(const resource of ['scrap','timber','supplies'])act({kind:'gather',resource});act({kind:'craft',recipe:'planter'});at+=5000;act({kind:'claim'});act({kind:'place',prop:'planter',slot:'north-west'});act({kind:'craft',recipe:'bridge-kit'});
 act({kind:'garden',gardenAction:{action:'plant',bed:2,crop:'marigold'}});
 at=Date.now()-300000+6000;act({kind:'garden',gardenAction:{action:'plant',bed:0,crop:'radish'}});const original=structuredClone(s),deadline=s.garden.beds[0]!.readyAt;
 await page.addInitScript(seed=>{localStorage.setItem('ih2:workshop:v2',JSON.stringify(seed));localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'garden',position:{x:9,y:13}}));},s);
 await page.setViewportSize({width:360,height:640});await page.goto('/');await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
 await page.locator('#bag').click();await page.getByRole('button',{name:'Your allotment · crops, markers & quests',exact:true}).click();
 const empty=page.locator('[data-garden-bed="1"]');await empty.click();await empty.focus();const before=(await empty.boundingBox())!;
 await expect(page.locator('[data-garden-bed="0"]')).toHaveAccessibleName(/Ready\./,{timeout:12000});await expect(empty).toBeFocused();await expect(empty).toHaveAttribute('aria-pressed','true');
 const after=(await empty.boundingBox())!;expect(Math.abs(after.y-before.y)).toBeLessThan(1);expect((await saved(page)).garden.beds[0].readyAt).toBe(deadline);expect((await saved(page)).garden.harvested.radish).toBe(0);
 for(const bed of [0,2]){await page.locator(`[data-garden-bed="${bed}"]`).click();await page.locator('[data-garden-action=harvest]').click();}
 await expect.poll(async()=>(await saved(page)).garden.produce.marigold).toBe(1);
 await page.getByRole('button',{name:'Visit the allotment attendant',exact:true}).click();await expect(page.locator('#panel-title')).toHaveText('Allotment attendant',{timeout:15000});
 await expect(page.locator('.garden-status')).toContainText('Choose a quest or request');
 const request=page.locator('[data-garden-action=submit-request]');await expect(request).toContainText('spend goal flower');await expect(page.locator('.garden-timer')).toContainText('last easel-goal flower');await request.focus();
 const requestBefore=(await request.boundingBox())!;await page.screenshot({path:dir+'/clarity-phone-goal-flower.png'});await page.keyboard.press('Enter');await expect.poll(async()=>(await saved(page)).garden.requests).toBe(1);await expect(request).toBeDisabled();
 const requestAfter=(await request.boundingBox())!;expect(Math.abs(requestAfter.y-requestBefore.y)).toBeLessThan(1);expect(requestAfter.height).toBe(requestBefore.height);await expect(page.locator('.garden-timer')).toContainText('Next request in');
 const final=await saved(page);expect(final.carpentry.keepEaselGoal).toBe(true);for(const key of ['inventory','owned','placements','job','stats','skills','bridgeKits'])expect(final[key]).toEqual(original[key as keyof typeof original]);
 writeFileSync(dir+'/clarity-elapsed-layout.json',JSON.stringify({disclosure:'Isolated browser save and garden starting-position fixture built with valid pure commands at past times; last six seconds of radish deadline pass in actual UI. Not a real four-hour wait or shared/server proof. Actual harvest and explicit goal-flower request; no real player or accepted practice modified.',deadline,before,after,requestBefore,requestAfter,oldJob:final.job,goalRetained:final.carpentry.keepEaselGoal},null,2));
});
