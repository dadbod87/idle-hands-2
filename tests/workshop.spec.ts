import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
const dir=process.env.QA_EVIDENCE_DIR??'test-results/browser';fs.mkdirSync(dir,{recursive:true});
const state=(page:Page)=>page.evaluate(()=>(window as any).__pilot.workshop());
const pos=(page:Page)=>page.evaluate(()=>(window as any).__pilot.snapshot());
async function tapWorld(page:Page,x:number,y:number){const screen=await page.evaluate(p=>(window as any).__pilot.screenPoint(p.x,p.y),{x,y});const box=(await page.locator('canvas').boundingBox())!;expect(screen.x).toBeGreaterThan(0);expect(screen.y).toBeGreaterThan(0);expect(screen.x).toBeLessThan(box.width);expect(screen.y).toBeLessThan(box.height);if(await page.evaluate(()=>navigator.maxTouchPoints>0))await page.touchscreen.tap(box.x+screen.x,box.y+screen.y);else await page.mouse.click(box.x+screen.x,box.y+screen.y);}
async function walkVisible(page:Page,x:number,y:number){
 const initialRoom=(await pos(page)).room;
 for(let i=0;i<12;i++){if((await pos(page)).room!==initialRoom||(await pos(page)).locked)return;const screen=await page.evaluate(p=>(window as any).__pilot.screenPoint(p.x,p.y),{x,y}),box=(await page.locator('canvas').boundingBox())!;
 if(screen.x>20&&screen.x<box.width-20&&screen.y>20&&screen.y<box.height-20){await tapWorld(page,x,y);return;}
 const cx=Math.max(20,Math.min(box.width-20,screen.x)),cy=Math.max(20,Math.min(box.height-20,screen.y));if(await page.evaluate(()=>navigator.maxTouchPoints>0))await page.touchscreen.tap(box.x+cx,box.y+cy);else await page.mouse.click(box.x+cx,box.y+cy);await expect.poll(async()=>(await pos(page)).walking).toBe(false);
 }
 throw Error('Target never became visible');
}
for(const shape of [{name:'desktop',width:1440,height:900},{name:'narrow',width:360,height:640},{name:'short',width:844,height:390}]){
 test.describe(shape.name,()=>{test.use({hasTouch:shape.name==='narrow'});test(`${shape.name}: direct gather, craft, place, reload and queued job`,async({page})=>{
  await page.setViewportSize(shape);const errors:string[]=[],external:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname==='127.0.0.1'||u.protocol==='data:')return route.continue();external.push(u.origin);return route.abort();});
  await page.goto('/');await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
  // No destination directory. Actual direct clicks/taps approach the resource and open its panel.
  for(const [resource,x] of [['scrap',21],['timber',23],['supplies',25]] as const){await walkVisible(page,x,28);await expect.poll(async()=>{const s=await pos(page);return s.locked;},{timeout:process.env.CI?30000:10000}).toBe(true);await expect(page.locator('#panel-title')).toHaveText(resource[0].toUpperCase()+resource.slice(1)+' depot');await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Collect available '+resource}).click();expect((await state(page)).inventory[resource]).toBe(6);await expect(page.locator('[data-collect]')).toBeDisabled();await page.keyboard.press('Escape');}
  await page.screenshot({path:`${dir}/${shape.name}-workshop-resources.png`});
  // Reach a clear approach, then tap the workshop door and bench rather than HUD Inspect.
  await walkVisible(page,19,25);await expect.poll(async()=>(await pos(page)).walking).toBe(false);
  await walkVisible(page,19.5,20.5);await expect.poll(async()=>(await pos(page)).room).toBe('workshop');await page.waitForTimeout(150);
  await walkVisible(page,5,3.5);await expect.poll(async()=>{const s=await pos(page);return s.locked;},{timeout:process.env.CI?30000:10000}).toBe(true);await expect(page.getByRole('dialog')).toContainText('One job at a time');
  await page.getByRole('button',{name:'Make orientation planter'}).click();
  expect((await state(page)).inventory).toEqual({scrap:4,timber:4,supplies:5});
  await expect(page.locator('[data-craft]')).toHaveCount(2);for(const button of await page.locator('[data-craft]').all())await expect(button).toBeDisabled();
  await expect(page.getByRole('button',{name:'Collect finished work'})).toBeEnabled({timeout:8000});await page.getByRole('button',{name:'Collect finished work'}).click();
  expect((await state(page)).owned.planter).toBe(1);await expect(page.getByRole('button',{name:'Collect finished work'})).toBeDisabled();await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Bag & journal',exact:true}).click();await expect(page.locator('[data-quest]')).toContainText('Put down a very small root');
  await page.getByRole('combobox',{name:'Furniture to place'}).selectOption('planter');const before=await state(page);await page.locator('[data-slot="north-east"]').click();await page.getByRole('button',{name:'Cancel preview',exact:true}).click();expect(await state(page)).toEqual(before);
  await page.locator('[data-slot="north-east"]').click();await page.getByRole('button',{name:'Place here',exact:true}).click();expect((await state(page)).placements['north-east']).toBe('planter');await expect(page.locator('[data-quest]')).toContainText('committee requests a kit');
  // Place other starter props, then move one without creating an extra copy.
  await page.getByRole('combobox',{name:'Furniture to place'}).selectOption('rug');await page.locator('[data-slot="south-east"]').click();await page.getByRole('button',{name:'Place here',exact:true}).click();
  await page.locator('[data-slot="south-west"]').click();await page.getByRole('button',{name:'Place here',exact:true}).click();expect((await state(page)).placements['south-east']).toBe(null);expect((await state(page)).placements['south-west']).toBe('rug');
  const scan=await new AxeBuilder({page}).analyze();expect(scan.violations).toEqual([]);fs.writeFileSync(`${dir}/${shape.name}-workshop-axe.json`,JSON.stringify({violations:scan.violations,incomplete:scan.incomplete},null,2));
  await page.screenshot({path:`${dir}/${shape.name}-workshop-inventory.png`});await page.keyboard.press('Escape');await page.screenshot({path:`${dir}/${shape.name}-workshop-furnished.png`});
  await walkVisible(page,5,3.5);await expect.poll(async()=>{const s=await pos(page);return s.locked;},{timeout:process.env.CI?30000:10000}).toBe(true);await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Make bridge supplies'}).click();expect((await state(page)).job.recipe).toBe('bridge-kit');await expect(page.locator('[data-job]')).toContainText('remaining');await page.keyboard.press('Escape');const saved=await state(page);await page.reload();await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);expect((await state(page)).placements).toEqual(saved.placements);expect((await state(page)).owned).toEqual(saved.owned);
  await page.getByRole('button',{name:'Bag & journal',exact:true}).click();await page.evaluate(()=>document.documentElement.style.fontSize='200%');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const close=(await page.getByRole('button',{name:'Close panel'}).boundingBox())!;expect(close.y).toBeGreaterThanOrEqual(0);expect(close.y+close.height).toBeLessThan(shape.height);await page.screenshot({path:`${dir}/${shape.name}-workshop-text-200.png`});
  expect(errors).toEqual([]);expect(external).toEqual([]);
 });});
}

test('isolated elapsed-time fixture: queued kit survives absence and settles once',async({page})=>{
 // Only this isolated browser receives fixture state. No live accounts or requests.
 const {createWorkshop,applyWorkshop}=await import('../src/game/workshop.ts');const now=Date.now();let s=createWorkshop(now-13*3600_000);let n=0;const cmd=(c:object,t=s.observedAt)=>{const r=applyWorkshop(s,{...c,id:'fixture-'+(++n),expectedRevision:s.revision},t);expect(r.ok,r.message).toBe(true);s=r.state;};
 for(const resource of ['scrap','timber','supplies'])cmd({kind:'gather',resource});cmd({kind:'craft',recipe:'planter'});cmd({kind:'claim'},s.job!.readyAt);cmd({kind:'place',prop:'planter',slot:'north-east'});s.inventory={scrap:3,timber:2,supplies:1};cmd({kind:'craft',recipe:'bridge-kit'});
 await page.addInitScript(save=>{if(!localStorage.getItem('ih2:workshop:v1'))localStorage.setItem('ih2:workshop:v1',JSON.stringify(save));localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'workshop',position:{x:5,y:5}}));},s);
 await page.goto('/');await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);await page.getByRole('button',{name:'Inspect Work bench'}).click();await expect(page.getByRole('button',{name:'Collect finished work'})).toBeEnabled();await page.getByRole('button',{name:'Collect finished work'}).click();expect((await state(page)).bridgeKits).toBe(1);await expect(page.getByRole('button',{name:'Collect finished work'})).toBeDisabled();
 await page.screenshot({path:`${dir}/fixture-kit-collected.png`});
 await page.reload();await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);expect((await state(page)).bridgeKits).toBe(1);expect((await state(page)).job).toBe(null);
});

test('second tab cannot overwrite local workshop progress',async({page,context})=>{
 await page.goto('/');await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);await tapWorld(page,21,28);await page.getByRole('button',{name:'Collect available scrap'}).click();const original=await state(page);
 const second=await context.newPage();await second.goto('/');await expect.poll(()=>second.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);await tapWorld(second,23,28);await second.getByRole('button',{name:'Collect available timber'}).click();await expect(second.locator('.workshop-status')).toContainText('another tab');expect((await state(second)).inventory).toEqual(original.inventory);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('ih2:workshop:v1')!).inventory)).toEqual(original.inventory);
 await page.close();await second.reload();await expect.poll(()=>second.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);await tapWorld(second,23,28);await second.getByRole('button',{name:'Collect available timber'}).click();expect((await state(second)).inventory).toEqual({scrap:6,timber:6,supplies:0});await second.close();
});

test('save failures remain visible after a successful practice action',async({page})=>{
 await page.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='ih2:workshop:v1')throw new DOMException('Fixture quota failure','QuotaExceededError');return original.call(this,key,value);};});
 await page.goto('/');await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);await tapWorld(page,21,28);await page.getByRole('button',{name:'Collect available scrap'}).click();await expect(page.locator('.workshop-status')).toContainText('Local save failed');await expect(page.locator('.pilot-tag span')).toContainText('Unsaved practice');expect((await state(page)).inventory.scrap).toBe(6);
});

test('page cache lifecycle keeps job timer and single-writer ownership usable',async({page})=>{
 const {createWorkshop,applyWorkshop}=await import('../src/game/workshop.ts');let s=createWorkshop(Date.now());s.inventory={scrap:2,timber:2,supplies:1};s=applyWorkshop(s,{kind:'craft',recipe:'planter',id:'lifecycle-fixture',expectedRevision:0},s.observedAt).state;
 await page.addInitScript(save=>{localStorage.setItem('ih2:workshop:v1',JSON.stringify(save));localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'workshop',position:{x:5,y:5}}));},s);
 await page.goto('/');await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);await page.getByRole('button',{name:'Inspect Work bench'}).click();
 // Explicit synthetic lifecycle events exercise our handlers; this is not a claim of every browser's bfcache policy.
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));await page.waitForTimeout(100);await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
 await expect(page.getByRole('button',{name:'Collect finished work'})).toBeEnabled({timeout:8000});await page.getByRole('button',{name:'Collect finished work'}).click();expect((await state(page)).owned.planter).toBe(1);
});
