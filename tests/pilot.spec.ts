import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
const evidenceDir = process.env.QA_EVIDENCE_DIR ?? 'test-results/browser';
fs.mkdirSync(evidenceDir,{recursive:true});
const shapes = [{name:'desktop',width:1440,height:900},{name:'phone',width:390,height:844},{name:'narrow',width:360,height:640},{name:'short',width:844,height:390}];
const snapshot = (page:Page) => page.evaluate(() => (window as any).__pilot.snapshot());
async function destination(page:Page,id:string) {
 await page.getByRole('button',{name:'Places',exact:false}).click();
 await page.locator(`[data-destination="${id}"]`).click();
 await expect.poll(async()=> (await snapshot(page)).walking, {timeout: process.env.CI?30000:10000}).toBe(false);
 await expect.poll(async()=> (await snapshot(page)).nearby).toBe(id);
}
for(const shape of shapes) { test.describe(shape.name,()=>{ test.use({hasTouch:shape.name==='phone'||shape.name==='narrow'}); test(`${shape.name}: walk, collision, UI lock, tap, transition and reload`,async({page})=>{
 await page.setViewportSize(shape);
 const errors:string[]=[],external:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error') errors.push(m.text());});
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(u.hostname==='127.0.0.1'||u.protocol==='data:')return route.continue();
  external.push(u.origin);return route.abort();
 });
 await page.goto('/');
 await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
 await expect(page.locator('canvas')).toBeVisible();
 await expect(page.locator('#interact')).toBeDisabled();
 const world=await page.locator('.world-wrap').boundingBox();expect(world!.height).toBeGreaterThanOrEqual(shape.height*.5);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 for (const button of await page.locator('nav button').all()) { const bounds=await button.boundingBox();expect(bounds!.height).toBeGreaterThanOrEqual(44);expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(shape.width); }
 // Actual keyboard moves the actor, not a debug mutator.
 const before=await snapshot(page);await page.keyboard.down('ArrowRight');await page.waitForTimeout(350);await page.keyboard.up('ArrowRight');
 expect((await snapshot(page)).position.x).toBeGreaterThan(before.position.x);
 const cardinal=await snapshot(page);await page.keyboard.down('ArrowRight');await page.keyboard.down('ArrowDown');await page.waitForTimeout(180);await page.keyboard.up('ArrowRight');await page.keyboard.up('ArrowDown');
 const diagonal=await snapshot(page);expect(diagonal.position.x).toBeGreaterThan(cardinal.position.x);expect(diagonal.position.y).toBeGreaterThan(cardinal.position.y);
 await page.waitForTimeout(70);const resting=await snapshot(page);await page.waitForTimeout(90);expect((await snapshot(page)).position).toEqual(resting.position);
 await page.getByRole('button',{name:'Places',exact:false}).click();
 const locked=await snapshot(page);expect(locked.position).toEqual(resting.position);await page.keyboard.down('ArrowRight');await page.waitForTimeout(250);await page.keyboard.up('ArrowRight');
 expect((await snapshot(page)).position).toEqual(locked.position);
 await page.getByRole('button',{name:'Close panel'}).click();
 // A real pointer on the canvas uses camera conversion.
 const pos=await snapshot(page);const endpoint={x:pos.position.x+1.173,y:pos.position.y+.213};
 const screen=await page.evaluate(p=>(window as any).__pilot.screenPoint(p.x,p.y),endpoint);
 const canvasBox=await page.locator('canvas').boundingBox();
 if(shape.name==='phone'||shape.name==='narrow') await page.touchscreen.tap(canvasBox!.x+screen.x,canvasBox!.y+screen.y);
 else await page.mouse.click(canvasBox!.x+screen.x,canvasBox!.y+screen.y);
 await expect.poll(async()=>(await snapshot(page)).position.x).toBeGreaterThan(pos.position.x);
 await expect.poll(async()=>(await snapshot(page)).walking).toBe(false);
 const arrived=await snapshot(page);expect(Math.abs(arrived.position.x-endpoint.x)).toBeLessThan(.05);expect(Math.abs(arrived.position.y-endpoint.y)).toBeLessThan(.05);
 await page.screenshot({path:`${evidenceDir}/${shape.name}-square.png`});
 await destination(page,'workshop');
 // Holding north against the solid building never enters the wall.
 await page.keyboard.down('ArrowUp');await page.waitForTimeout(350);await page.keyboard.up('ArrowUp');
 expect((await snapshot(page)).position.y).toBeGreaterThanOrEqual(21.74);
 // Back away, then click/tap the actual door: approach and enter without the HUD button.
 const backScreen=await page.evaluate(()=>(window as any).__pilot.screenPoint(20,23.5));const backCanvas=(await page.locator('canvas').boundingBox())!;
 if(shape.name==='phone'||shape.name==='narrow')await page.touchscreen.tap(backCanvas.x+backScreen.x,backCanvas.y+backScreen.y);else await page.mouse.click(backCanvas.x+backScreen.x,backCanvas.y+backScreen.y);
 await expect.poll(async()=>(await snapshot(page)).walking,{timeout:process.env.CI?30000:10000}).toBe(false);
 expect((await snapshot(page)).nearby).toBe(null);
 const doorScreen=await page.evaluate(()=>(window as any).__pilot.screenPoint(19.5,21.5));
 const doorCanvas=await page.locator('canvas').boundingBox();expect(doorScreen.y).toBeGreaterThanOrEqual(0);expect(doorScreen.y).toBeLessThan(doorCanvas!.height);
 if(shape.name==='phone'||shape.name==='narrow')await page.touchscreen.tap(doorCanvas!.x+doorScreen.x,doorCanvas!.y+doorScreen.y);
 else await page.mouse.click(doorCanvas!.x+doorScreen.x,doorCanvas!.y+doorScreen.y);
 await expect.poll(async()=>(await snapshot(page)).room).toBe('workshop');
 await expect(page.locator('#location')).toContainText('Your workshop');
 await page.screenshot({path:`${evidenceDir}/${shape.name}-workshop.png`});
 await page.getByRole('button',{name:'Open field guide'}).click();
 await expect(page.getByRole('button',{name:'Walk to your bench →'})).toBeVisible();
 await page.keyboard.press('Escape');
 await page.reload();await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
 expect((await snapshot(page)).room).toBe('workshop');
 await destination(page,'bench');await page.getByRole('button',{name:'Inspect Work bench'}).click();
 await expect(page.getByRole('dialog')).toContainText('One job at a time');
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();
 await destination(page,'door');
 const exitScreen=await page.evaluate(()=>(window as any).__pilot.screenPoint(9,13.5));const exitCanvas=await page.locator('canvas').boundingBox();
 if(shape.name==='phone'||shape.name==='narrow')await page.touchscreen.tap(exitCanvas!.x+exitScreen.x,exitCanvas!.y+exitScreen.y);
 else await page.mouse.click(exitCanvas!.x+exitScreen.x,exitCanvas!.y+exitScreen.y);
 await expect.poll(async()=>(await snapshot(page)).room).toBe('square');
 expect((await snapshot(page)).position).toEqual({x:19.5,y:22.3});
 await page.waitForTimeout(200);expect((await snapshot(page)).room).toBe('square');
 // The existing keyboard/HUD alternatives still work.
 await destination(page,'workshop');await page.keyboard.press('e');
 await expect.poll(async()=>(await snapshot(page)).room).toBe('workshop');
 await destination(page,'door');await page.getByRole('button',{name:'Enter town square'}).click();
 await expect.poll(async()=>(await snapshot(page)).room).toBe('square');
 expect((await snapshot(page)).position).toEqual({x:19.5,y:22.3});
 await page.waitForTimeout(200);expect((await snapshot(page)).room).toBe('square');
 await destination(page,'plot');await page.getByRole('button',{name:'Inspect Future house plots'}).click();
 await expect(page.getByRole('dialog')).toContainText('upgrade a house');
 await page.screenshot({path:`${evidenceDir}/${shape.name}-housing-note.png`});
 await page.keyboard.press('Escape');
 // Resize and ensure the canvas follows its container, with bounded HUD controls.
 await page.setViewportSize({width:shape.height,height:shape.width});await page.waitForTimeout(150);
 const wrap=await page.locator('.world-wrap').boundingBox(),cv=await page.locator('canvas').boundingBox();
 expect(Math.abs(wrap!.width-cv!.width)).toBeLessThan(2);expect(Math.abs(wrap!.height-cv!.height)).toBeLessThan(2);
 await page.setViewportSize(shape);await page.waitForTimeout(2500);
 const metrics=await page.evaluate(()=>(window as any).__pilot.metrics());
 fs.writeFileSync(`${evidenceDir}/${shape.name}-metrics.json`,JSON.stringify({viewport:shape,metrics,errors,external,userAgent:await page.evaluate(()=>navigator.userAgent)},null,2)+'\n');
 expect(metrics.phaser).toBe('4.2.1');expect(metrics.frameSamples).toBeGreaterThan(60);
 expect(errors).toEqual([]);expect(external).toEqual([]);
});
}); }
