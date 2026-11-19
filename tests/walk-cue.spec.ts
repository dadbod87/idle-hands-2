import {test, expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

test('walk mark follows accepted ground routes and disappears when travel stops', async ({browser}) => {
 const out = 'test-results/browser/walk-cue';
 mkdirSync(out, {recursive: true});
 for (const size of [
  {name:'desktop', width:1440, height:900, touch:false, text:100},
  {name:'phone', width:320, height:640, touch:true, text:100},
  {name:'short', width:844, height:390, touch:true, text:200},
 ]) {
  const context = await browser.newContext({viewport:{width:size.width,height:size.height},
   hasTouch:size.touch, reducedMotion:size.touch?'reduce':'no-preference'});
  const page = await context.newPage();
  const errors:string[] = [], api:string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
   const path = new URL(request.url()).pathname;
   if (path.startsWith('/api/')) api.push(path);
  });
  try {
   await page.goto('/');
   await expect.poll(() => page.evaluate(() => (window as any).__pilot?.metrics().ready)).toBe(true);
   await page.evaluate(percent => document.documentElement.style.fontSize = percent + '%', size.text);
   const canvas = page.locator('canvas');
   await page.waitForFunction(() => {
    const current=(window as any).__pilot.metrics().visual.camera;
    const canvas=document.querySelector('canvas')!;
    return Math.abs(current.worldView.height * current.zoom - canvas.clientHeight) < 2;
   });
   const mark = () => page.evaluate(() => (window as any).__pilot.metrics().visual.walkTarget);
   const position = () => page.evaluate(() => (window as any).__pilot.snapshot().position);
   const ground = async (x:number,y:number) => {
    const target = await page.evaluate(([x,y]) => (window as any).__pilot.screenPoint(x,y),[x,y]);
    const bounds = (await canvas.boundingBox())!;
    expect(target.x).toBeGreaterThan(0);
    expect(target.x).toBeLessThan(bounds.width);
    expect(target.y).toBeGreaterThan(0);
    expect(target.y).toBeLessThan(bounds.height);
    if (size.touch) await canvas.tap({position:target});
    else await canvas.click({position:target});
   };
   const near = (v:{x:number;y:number}|null, x:number, y:number, tolerance=.12) => !!v && Math.hypot(v.x-x,v.y-y)<tolerance;
   const seekMark = (x:number,y:number,tolerance?:number) => expect.poll(async () => near(await mark(),x,y,tolerance), {intervals:[20,30,50],timeout:1000}).toBe(true);
   await expect.poll(mark).toBeNull();
   await ground(28,26);
   const tapTolerance=size.name==='short'?.95:.35;
   await seekMark(28,26,tapTolerance);
   const accepted=await mark();
   expect(accepted).not.toBeNull();
   await page.screenshot({path:out+'/'+size.name+'.png'});
   await expect.poll(() => page.evaluate(() => (window as any).__pilot.snapshot().walking)).toBe(false);
   expect(near(await position(),accepted.x,accepted.y)).toBe(true);
   await expect.poll(mark).toBeNull();

   await ground(24,25);
   await seekMark(24,25,tapTolerance);
   await ground(29,23.5);
   await seekMark(29,23.5,tapTolerance);
   const redirected=await mark();
   expect(redirected).not.toBeNull();
   if (size.touch) {
    await page.locator('#places').tap();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect.poll(mark).toBeNull();
    await page.getByRole('button',{name:'Close panel'}).tap();
   } else {
    await page.keyboard.down('ArrowDown');
    await expect.poll(mark).toBeNull();
    await page.keyboard.up('ArrowDown');
   }
   expect(near(await position(),redirected.x,redirected.y)).toBe(false);
   expect(api).toEqual([]);
   expect(errors).toEqual([]);
  } catch (error) {
   console.error(size.name, await page.evaluate(() => ({
    scene:(window as any).__pilot?.snapshot(),
    goal:(window as any).__pilot?.metrics().visual.walkTarget,
    canvas:document.querySelector('canvas')?.getBoundingClientRect().toJSON(),
    tap:(window as any).__pilot?.screenPoint(28,26),
    dialogs:[...document.querySelectorAll('dialog[open]')].map(d=>d.textContent),
   })));
   await page.screenshot({path:out+'/'+size.name+'-failure.png'});
   throw error;
  } finally {await context.close();}
 }
});
