import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
const dir=process.env.QA_EVIDENCE_DIR??'test-results/browser';fs.mkdirSync(dir,{recursive:true});
const snapshot=(p:Page)=>p.evaluate(()=>(window as any).__pilot.town());
const position=(p:Page)=>p.evaluate(()=>(window as any).__pilot.snapshot());
async function ready(p:Page,id:string){await p.goto('/?town=1');await expect.poll(()=>p.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);await p.getByRole('dialog').getByRole('button',{name:id,exact:true}).click();await expect.poll(async()=>(await snapshot(p))?.name).toBe(id);await expect(p.getByRole('dialog')).not.toBeVisible();}
async function visit(p:Page,id:string){await p.getByRole('button',{name:'Places',exact:false}).click();await p.locator(`[data-destination="${id}"]`).click();await expect.poll(async()=>(await position(p)).walking,{timeout:process.env.CI?40000:12000}).toBe(false);await expect.poll(async()=>(await position(p)).nearby).toBe(id);await p.locator('#interact').click();await expect(p.getByRole('dialog')).toBeVisible();}
async function close(p:Page){await p.getByRole('button',{name:'Close panel'}).click();}

test('desktop and narrow-phone residents cooperate, retain ownership and retry the same committed request',async({browser})=>{
 // Three simultaneous software-rendered canvases make CI cumulative walking much slower.
 // Keep individual arrival assertions bounded; allow the complete ownership/retry flow to finish.
 test.setTimeout(process.env.CI?420000:90000);
 const desktop=await browser.newContext({viewport:{width:1440,height:900}}),phone=await browser.newContext({viewport:{width:360,height:640},hasTouch:true}),third=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
 const a=await desktop.newPage(),b=await phone.newPage(),c=await third.newPage();const errors:string[]=[];
 for(const page of [a,b,c])page.on('pageerror',e=>errors.push(e.message));
 await ready(a,'Aster');await ready(b,'Bea');await ready(c,'Casey');
 // Server-scoped public presence is visible in the square, not a database write per frame.
 await a.screenshot({path:`${dir}/shared-desktop-square.png`});await b.screenshot({path:`${dir}/shared-phone-square.png`});
 const starting=(await snapshot(a)).workshop.bridgeKits;expect(starting).toBe(48); // Explicit synthetic browser fixture, no real player grant.
 await visit(a,'bridge');
 const ids:string[]=[];let intercept=true;
 await a.route('**/api/town/command',async route=>{const body=route.request().postDataJSON();if(body.kind==='contribute'){ids.push(body.id);if(intercept){intercept=false;await route.fetch();await route.abort();return;}}await route.continue();});
 await a.getByRole('button',{name:'Contribute one bridge kit',exact:true}).click();await expect(a.getByRole('button',{name:'Retry the same request'})).toBeVisible();
 await a.getByRole('button',{name:'Retry the same request'}).click();await expect.poll(async()=>(await snapshot(a)).bridge.contributed).toBe(1);expect(ids.length).toBe(2);expect(ids[0]).toBe(ids[1]);expect((await snapshot(a)).workshop.bridgeKits).toBe(47);
 await close(a);await visit(b,'bridge');await b.getByRole('button',{name:'Contribute one bridge kit',exact:true}).click();await expect.poll(async()=>(await snapshot(b)).bridge.contributed).toBe(2);await close(b);
 await visit(c,'bridge');await c.getByRole('button',{name:'Contribute one bridge kit',exact:true}).click();await expect.poll(async()=>(await snapshot(c)).bridge.phase).toBe('building');await expect.poll(async()=>(await snapshot(a)).bridge.phase).toBe('building');await expect.poll(async()=>(await snapshot(b)).bridge.phase).toBe('building');const building=(await snapshot(c)).bridge;expect(building.restored).toBe(false);expect(building.readyAt-building.startedAt).toBe(6*60*60*1000);expect(building.openedAt).toBeNull();await close(c);
 // Casey's contribution and all three restoration assertions are complete.
 // Stop the unused software-rendered canvas before the remaining ownership flow.
 await third.close();
 await a.screenshot({path:`${dir}/shared-bridge-funded.png`});
 // Each resident can acquire a fresh plot; a visitor sees ownership without edit controls.
 await visit(a,'plot');await a.getByRole('button',{name:'Claim your house plot · 12 bridge kits',exact:true}).click();await expect.poll(async()=>(await snapshot(a)).plot?.ownerId).toBe('aster');
 await a.getByRole('button',{name:'Upgrade plot · 24 bridge kits'}).click();await expect.poll(async()=>(await snapshot(a)).plot?.level).toBe(2);
 await a.getByRole('combobox',{name:'Owned furniture for plot'}).selectOption('planter');await a.getByRole('button',{name:'Place owned furniture here'}).click();await expect.poll(async()=>(await snapshot(a)).plot?.placements['north-west']).toBe('planter');
 const owned=await snapshot(a);await a.screenshot({path:`${dir}/shared-owner-plot.png`});await close(a);
 await a.getByRole('button',{name:'Places',exact:false}).click();await a.locator('[data-destination="workshop"]').click();await expect.poll(async()=>(await position(a)).walking,{timeout:process.env.CI?40000:12000}).toBe(false);await a.getByRole('button',{name:'Enter workshop',exact:true}).click();await expect.poll(async()=>(await position(a)).room).toBe('workshop');await a.getByRole('button',{name:'Bag',exact:true}).click();await a.getByRole('button',{name:'Arrange furniture',exact:true}).click();await a.getByRole('combobox',{name:'Furniture to place'}).selectOption('planter');await a.locator('[data-slot="south-west"]').click();await a.getByRole('button',{name:'Place here',exact:true}).click();await expect.poll(async()=>(await snapshot(a)).workshop.placements['south-west']).toBe('planter');await a.locator('[data-slot="south-east"]').click();await a.getByRole('button',{name:'Place here',exact:true}).click();await expect.poll(async()=>(await snapshot(a)).workshop.placements['south-east']).toBe('planter');expect((await snapshot(a)).workshop.placements['south-west']).toBe(null);expect((await snapshot(a)).plot.placements['north-west']).toBe('planter');await close(a);
 await visit(b,'plot');await expect(b.getByRole('dialog')).toContainText('only the owner can change');await expect(b.getByRole('button',{name:'Upgrade plot · 24 bridge kits'})).toHaveCount(0);await expect(b.getByRole('button',{name:'Place owned furniture here'})).toHaveCount(0);
 await b.screenshot({path:`${dir}/shared-phone-visitor.png`});const axe=await new AxeBuilder({page:b}).analyze();expect(axe.violations).toEqual([]);fs.writeFileSync(`${dir}/shared-phone-axe.json`,JSON.stringify({violations:axe.violations,incomplete:axe.incomplete},null,2));await close(b);
 // Bea's visitor, screenshot and accessibility assertions are complete.
 await phone.close();
 await a.reload();await expect.poll(()=>a.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);await expect.poll(async()=>(await snapshot(a))?.plot?.level).toBe(2);expect((await snapshot(a)).workshop.bridgeKits).toBe(owned.workshop.bridgeKits);expect((await snapshot(a)).plot.placements).toEqual(owned.plot.placements);
 expect(errors).toEqual([]);await desktop.close();
});

test('short shared-town menu scales text, preserves the playfield and switches residents safely',async({page})=>{
 await page.setViewportSize({width:844,height:390});await ready(page,'Casey');await page.getByRole('button',{name:'Choose practice resident'}).click();await page.getByRole('dialog').getByRole('button',{name:'Aster',exact:true}).click();await expect.poll(async()=>(await snapshot(page))?.playerId).toBe('aster');
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');await expect.poll(async()=>{const wrap=(await page.locator('.world-wrap').boundingBox())!,canvas=(await page.locator('canvas').boundingBox())!;return Math.abs(wrap.height-canvas.height);}).toBeLessThan(2);expect((await page.locator('.world-wrap').boundingBox())!.height).toBeGreaterThan(100);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Bag',exact:true}).click();await expect(page.getByRole('button',{name:'Close panel'})).toBeInViewport();await page.screenshot({path:`${dir}/shared-short-text-200.png`});
});
