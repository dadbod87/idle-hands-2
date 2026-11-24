import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { applyWorkshop, createWorkshop, RESOURCE_IDS } from '../src/game/live-workshop.ts';
import { SURVEY_IDS, SURVEYS } from '../src/game/fieldwork.ts';
import { GARDEN_RULES } from '../src/game/garden.ts';
import { BROWSER_ORCHARD_KEY, ORCHARD_BRANCHES, newOrchard, orchardAction } from '../src/game/orchard.ts';
import { RIVER_SPOT_IDS, RIVER_SURVEY_KEY } from '../src/game/river-survey.ts';

const output = 'test-results/browser/workbench-outing';
const hour = 3600_000;

test('a confirmed long bench job offers a free walk to the next unfinished sketch', async ({ browser }) => {
 const startedAt = Date.now() - 10_000;
 let now = startedAt, workshop = createWorkshop(now), sequence = 0;
 function apply(command: Record<string, unknown>) {
  const result = applyWorkshop(workshop, { ...command, id: 'outing-' + ++sequence, expectedRevision: workshop.revision }, now);
  expect(result.ok, result.message).toBe(true);
  workshop = result.state;
 }
 for (const resource of RESOURCE_IDS) apply({ kind: 'gather', resource });
 apply({ kind: 'craft', recipe: 'planter' });
 now += 5000;
 apply({ kind: 'claim' });
 apply({ kind: 'survey', station: 'oak', choice: 'broad-crown' });

 for (const size of [
  { tag: 'desktop', width: 1440, height: 900, touch: false, fontSize: '100%' },
  { tag: 'phone', width: 320, height: 640, touch: true, fontSize: '100%' },
  { tag: 'short', width: 844, height: 390, touch: true, fontSize: '200%' },
 ]) {
  const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, hasTouch: size.touch });
  try {
   const page = await context.newPage();
   const errors: string[] = [], api: string[] = [];
   page.on('pageerror', error => errors.push(error.message));
   page.on('request', request => { if (request.url().includes('/api/')) api.push(request.url()); });
   await page.addInitScript(state => {
    localStorage.setItem('ih2:workshop:v2', JSON.stringify(state));
   }, workshop);
   await page.goto('/');
   await page.evaluate(fontSize => document.documentElement.style.fontSize = fontSize, size.fontSize);
   await expect(page.locator('.pilot-tag span')).toContainText('saved here');
   await page.locator('#journal').click();
   await page.locator('[data-activity-open=bench]').click();
   const outing = page.locator('[data-bench-outing]');
   await expect(outing).toBeHidden();
   await page.locator('[data-craft=planter]').click();
   const action = outing.getByRole('button', { name: 'Walk to the pale-barked tree' });
   await expect(action).toBeVisible();
   const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('ih2:workshop:v2')!));
   const queued = await read();
   expect(queued.job.readyAt - queued.job.startedAt).toBe(8 * hour);
   const more=outing.getByText('Another outing',{exact:true});
   const alternative=outing.getByRole('button',{name:'Walk to the Riverwalk',exact:true});
   await expect(alternative).toBeHidden();
   if(size.touch)await more.tap();
   else await more.press('Enter');
   await expect(alternative).toBeVisible();
   expect((await alternative.boundingBox())!.height).toBeGreaterThanOrEqual(44);
   expect((await read()).job).toEqual(queued.job);
   if(size.tag==='desktop'){
    await alternative.press('Enter');
    await expect(page.getByRole('heading',{name:'Riverwalk',exact:true})).toBeVisible({timeout:30000});
    expect(await read()).toEqual(queued);
    expect(api).toEqual([]);
    expect(errors).toEqual([]);
    continue;
   }
   await more.tap();
   await action.focus();
   await expect(action).toBeInViewport();
   expect(await outing.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
   expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(44);
   mkdirSync(output, { recursive: true });
   await page.screenshot({ path: output + '/' + size.tag + '.png' });

   if (size.tag === 'short') {
    const position = await action.boundingBox();
    await page.clock.setFixedTime(queued.job.readyAt + 1000);
    await expect(page.locator('[data-claim]')).toBeEnabled();
    expect(await action.boundingBox()).toEqual(position);
    await expect(action).toBeFocused();
   }
   if (size.touch) await action.tap();
   else await page.keyboard.press('Enter');
   await expect(page.getByRole('heading', { name: 'Pale-barked tree', exact: true })).toBeVisible({ timeout: 20_000 });
   const arrived = await read();
   expect(arrived.sketches).toEqual(['oak']);
   expect(arrived.inventory).toEqual(queued.inventory);
   expect(arrived.job).toEqual(queued.job);
   expect(arrived.owned).toEqual(queued.owned);
   if (size.tag === 'phone') {
    await page.getByRole('button', { name: 'A pale trunk with dark marks' }).tap();
    await expect.poll(async () => (await read()).sketches).toEqual(['oak', 'birch']);
    await page.getByRole('button', { name: 'Close panel' }).tap();
    await page.locator('#journal').tap();
    await page.locator('[data-activity-open=bench]').tap();
    await expect(outing.getByRole('button', { name: 'Walk to the corner fruit tree' })).toBeVisible();
    expect((await read()).job).toEqual(queued.job);
   }
   expect(api).toEqual([]);
   expect(errors).toEqual([]);
  } finally {
   await context.close();
  }
 }
});

test('a completed sketchbook offers a ripe crop, an unfinished river survey or an orchard outing', async ({ browser }) => {
 const epoch=Date.now()-GARDEN_RULES.firstRadishMs-10_000;
 let now=epoch,seq=0,state=createWorkshop(now);
 function apply(command:Record<string,unknown>){
  const result=applyWorkshop(state,{...command,id:'ready-allotment-'+ ++seq,expectedRevision:state.revision},now);
  expect(result.ok,result.message).toBe(true);
  state=result.state;
 }
 for(const resource of RESOURCE_IDS)apply({kind:'gather',resource});
 apply({kind:'craft',recipe:'planter'});
 now+=5000;
 apply({kind:'claim'});
 for(const station of SURVEY_IDS)apply({kind:'survey',station,choice:SURVEYS[station].answer});
 apply({kind:'garden',gardenAction:{action:'plant',bed:1,crop:'radish'}});
 const waiting=structuredClone(state);
 for(const label of ['harvest','still-growing','surveyed','depleted'] as const){
  const ready=label==='harvest';
  const context=await browser.newContext({viewport:{width:320,height:650},hasTouch:true});
  try{
   const page=await context.newPage();
   const fixture=structuredClone(waiting);
   if(!ready){
    fixture.garden.beds[1]!.plantedAt=Date.now();
    fixture.garden.beds[1]!.readyAt=fixture.garden.beds[1]!.plantedAt+GARDEN_RULES.firstRadishMs;
    fixture.garden.observedAt=fixture.garden.beds[1]!.plantedAt;
    fixture.observedAt=fixture.garden.observedAt;
   }
   await page.addInitScript(saved=>localStorage.setItem('ih2:workshop:v2',JSON.stringify(saved)),fixture);
   if(label==='surveyed'||label==='depleted')await page.addInitScript(({key,recorded})=>{
    localStorage.setItem(key,JSON.stringify({version:1,recorded,cast:null}));
   },{key:RIVER_SURVEY_KEY,recorded:[...RIVER_SPOT_IDS]});
   if(label==='depleted'){
    let pantry=newOrchard();
    for(const branch of ORCHARD_BRANCHES){
     const result=orchardAction(pantry,{kind:'pick',branch:branch.id},Date.now());
     expect(result.ok).toBe(true);
     if(result.ok)pantry=result.state;
    }
    await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:BROWSER_ORCHARD_KEY,value:JSON.stringify(pantry)});
   }
   const errors:string[]=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto('/');
   await expect(page.locator('.pilot-tag span')).toContainText('saved here');
   await page.locator('#journal').tap();
   await page.locator('[data-activity-open=bench]').tap();
   await page.locator('[data-craft=planter]').tap();
   const trip=page.locator('[data-bench-outing]');
   if(label==='depleted'){
    const walk=trip.getByRole('button',{name:'Walk to the woodland work desk',exact:true});
    await expect(walk).toBeVisible();
    const before=await page.evaluate(()=>localStorage.getItem('ih2:workshop:v2'));
    await walk.tap();
    await expect(page.getByRole('heading',{name:'Woodland work',exact:true})).toBeVisible({timeout:25000});
    const borrow=page.getByRole('button',{name:'Borrow brace · suited to this route',exact:true});
    await expect(borrow).toBeEnabled();
    expect(await page.evaluate(()=>localStorage.getItem('ih2:woodland-outing:v1'))).toBeNull();
    await borrow.tap();
    await expect(page.getByText('Wind at the bend · Borrowed brace',{exact:true})).toBeVisible();
    expect(await page.evaluate(()=>localStorage.getItem('ih2:workshop:v2'))).toBe(before);
    expect(errors,label).toEqual([]);
    continue;
   }
   if(label==='surveyed'){
    const orchard=trip.getByRole('button',{name:'Walk to the low branch',exact:true});
    await expect(orchard).toBeVisible();
    await expect(trip.getByRole('button',{name:'Walk to the Riverwalk'})).toHaveCount(0);
    const prior=await page.evaluate(()=>localStorage.getItem('ih2:workshop:v2'));
    const currentOrchard=()=>page.evaluate(key=>localStorage.getItem(key),BROWSER_ORCHARD_KEY);
    expect(await currentOrchard()).toBeNull();
    await orchard.tap();
    await expect(page.getByRole('heading',{name:'Low branch',exact:true})).toBeVisible({timeout:25000});
    await expect(page.getByRole('button',{name:'Pick an apple',exact:true})).toBeEnabled();
    expect(await currentOrchard()).toBeNull();
    expect(await page.evaluate(()=>localStorage.getItem('ih2:workshop:v2'))).toBe(prior);
    expect(errors,label).toEqual([]);
    continue;
   }
   if(!ready){
    const river=trip.getByRole('button',{name:'Walk to the Riverwalk',exact:true});
    await expect(river).toBeVisible();
    const before=await page.evaluate(()=>localStorage.getItem('ih2:workshop:v2'));
    await river.tap();
    await expect(page.getByRole('heading',{name:'Riverwalk',exact:true})).toBeVisible({timeout:20_000});
    await expect(page.getByRole('button',{name:'Cast at Reed bank',exact:true})).toBeEnabled();
    expect(await page.evaluate(()=>localStorage.getItem('ih2:workshop:v2'))).toBe(before);
    expect(errors,label).toEqual([]);
    mkdirSync(output,{recursive:true});
    await page.screenshot({path:output+'/phone-riverwalk-return.png'});
    continue;
   }
   const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('ih2:workshop:v2')!));
   const before=await read();
   const walk=trip.getByRole('button',{name:'Walk to your allotment'});
   await expect(walk).toBeVisible();
   await walk.tap();
   await expect(page.getByRole('heading',{name:'Your rented allotment',exact:true})).toBeVisible({timeout:20_000});
   await expect(page.locator('[data-garden-bed="1"]')).toHaveAttribute('aria-pressed','true');
   await expect(page.getByRole('button',{name:'Harvest · 1 produce + 1 seed',exact:true})).toBeEnabled();
   const after=await read();
   expect(after.garden.beds).toEqual(before.garden.beds);
   expect(after.garden.produce).toEqual(before.garden.produce);
   expect(after.job).toEqual(before.job);
   expect(after.inventory).toEqual(before.inventory);
   expect(errors,label).toEqual([]);
   mkdirSync(output,{recursive:true});
   await page.screenshot({path:output+'/phone-harvest.png'});
  } finally{
   await context.close();
  }
 }
});
