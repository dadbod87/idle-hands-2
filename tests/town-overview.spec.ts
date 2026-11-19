import {test, expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {TOWN_SIZE} from '../src/game/town-expansion.ts';

test('the optional paper map shows the current town position and preserves normal Places travel', async ({browser}) => {
 const out = 'test-results/browser/town-overview';
 mkdirSync(out,{recursive:true});
 for (const size of [
  {name:'desktop',width:1440,height:900,touch:false,text:100},
  {name:'phone',width:320,height:640,touch:true,text:100},
  {name:'short',width:844,height:390,touch:true,text:200},
 ]) {
  const c = await browser.newContext({viewport:{width:size.width,height:size.height},hasTouch:size.touch});
  try {
   const p=await c.newPage();
   const failures:string[]=[];
   const api:string[]=[];
   p.on('pageerror',error=>failures.push(error.message));
   p.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))api.push(request.url());});
   await p.goto('/');
   await expect.poll(()=>p.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
   await p.evaluate(text=>document.documentElement.style.fontSize=text+'%',size.text);
   const feet=()=>p.evaluate(()=>(window as any).__pilot.snapshot());
   const start=await feet();
   const openMap=async()=>{
    await p.locator('#places').click();
    const summary=p.locator('.places-map > summary');
    if(size.touch)await summary.tap();
    else {await summary.focus();await p.keyboard.press('Enter');}
   };
   const map=p.getByRole('img',{name:/Town map, north at the top/});
   const pin=p.locator('.town-map-player');
   const close=()=>p.getByRole('button',{name:'Close panel'}).click();
   const readPin=()=>pin.evaluate((element:HTMLElement)=>({x:parseFloat(element.style.left),y:parseFloat(element.style.top)}));
   await expect(map).toHaveCount(0);
   await openMap();
   await expect(map).toBeVisible();
   await expect(p.locator('.places-map figcaption')).toContainText('You are here · Town square');
   await expect(map.locator('.town-map-landmark')).toHaveCount(7);
   expect((await readPin()).x).toBeCloseTo(100*(start.position.x+.5)/TOWN_SIZE.width,3);
   expect((await readPin()).y).toBeCloseTo(100*(start.position.y+.5)/TOWN_SIZE.height,3);
   expect((await feet()).position).toEqual(start.position);
   const sketch=(await map.boundingBox())!,header=(await p.locator('.dialog-head').boundingBox())!;
   const dialog=(await p.getByRole('dialog').boundingBox())!;
   expect(sketch.y).toBeGreaterThanOrEqual(header.y+header.height-1);
   expect(sketch.y+sketch.height).toBeLessThanOrEqual(dialog.y+dialog.height-1);
   expect(await p.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
   await p.screenshot({path:out+'/'+size.name+'.png'});
   if(size.name==='short'){
    const caption=p.locator('.places-map figcaption');
    await caption.scrollIntoViewIfNeeded();
    const visible=(await caption.boundingBox())!;
    expect(visible.y+visible.height).toBeLessThanOrEqual(dialog.y+dialog.height-1);
    await p.screenshot({path:out+'/short-caption.png'});
   }
   await close();

   if(size.name==='desktop'){
    await p.locator('#places').click();
    await p.getByRole('searchbox',{name:'Find a place'}).fill('riverwalk');
    await p.getByRole('region',{name:'Matching places'}).getByRole('button',{name:/Walk to Riverwalk/}).click();
    await expect.poll(async()=>(await feet()).nearby,{timeout:30000}).toBe('commons-riverwalk');
    await expect.poll(async()=>(await feet()).walking).toBe(false);
    await openMap();
    const reached=await feet();
    await expect(p.locator('.places-map figcaption')).toContainText('You are here · Riverwalk');
    expect((await readPin()).x).toBeCloseTo(100*(reached.position.x+.5)/TOWN_SIZE.width,3);
    expect((await readPin()).y).toBeCloseTo(100*(reached.position.y+.5)/TOWN_SIZE.height,3);
    await p.screenshot({path:out+'/riverwalk.png'});
   }
   expect(failures).toEqual([]);
   expect(api).toEqual([]);
  } finally {await c.close();}
 }
});
