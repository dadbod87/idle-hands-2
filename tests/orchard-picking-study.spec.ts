import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {test,expect} from '@playwright/test';

test('orchard picking study fits desktop, narrow touch and short enlarged text', async ({browser}) => {
 const out = 'test-results/browser/orchard-picking';
 mkdirSync(out, {recursive:true});
 const url = pathToFileURL(resolve('docs/evidence/IH2-144/index.html')).href;
 for (const spec of [
  {name:'desktop', width:1440, height:900, text:100, touch:false},
  {name:'phone', width:320, height:650, text:100, touch:true},
  {name:'short', width:844, height:390, text:200, touch:true},
 ]) {
  const context = await browser.newContext({viewport:{width:spec.width,height:spec.height},
   hasTouch:spec.touch, reducedMotion:spec.touch?'reduce':'no-preference'});
  try {
   const page=await context.newPage(), errors:string[]=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto(url);
   await page.evaluate(percent=>document.documentElement.style.fontSize=percent+'%',spec.text);
   const scene=page.locator('#scene');
   const pose=page.locator('#pose');
   const next=page.getByRole('button',{name:'Next pose'});
   if (!spec.touch) {
    await page.getByRole('button',{name:'Replay pick'}).focus();
    await page.keyboard.press('Enter');
    await expect(pose).toHaveText('Picking an apple');
    await expect(pose).toHaveText('Idle');
    await page.keyboard.press('Tab');
    await expect(next).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(pose).toHaveText('Reach');
    await next.press('Enter');
   } else {
    await page.getByLabel('Resident').selectOption('bea');
    await page.getByLabel('Facing').selectOption('west');
    await expect(scene).toHaveAttribute('data-facing','west');
    await page.getByRole('button',{name:'Show pick still'}).tap();
   }
   await expect(pose).toHaveText('Pick');
   await expect(scene.locator('.hanging')).toHaveCSS('visibility','hidden');
   const fruitAlignment=await scene.evaluate((node,mirror)=>{
    const fruit=node.querySelector('.hanging')!.getBoundingClientRect();
    const actor=node.querySelector('.actor')!.getBoundingClientRect();
    const hand=actor.left+(mirror?9:55)*.9;
    return Math.abs(fruit.left+fruit.width/2-hand);
   },spec.touch);
   expect(fruitAlignment).toBeLessThan(7);
   const artwork=page.locator('.actor');
   await expect(artwork).toHaveCSS('background-image',spec.touch?/bea-picking\.svg/:/aster-picking\.svg/);
   expect(await artwork.evaluate(async element=>{
    const file=getComputedStyle(element).backgroundImage.match(/url\("(.+)"\)/)?.[1];
    const image=new Image();
    image.src=file??'';
    await image.decode();
    return [image.naturalWidth,image.naturalHeight];
   })).toEqual([256,320]);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(spec.width);
   await scene.scrollIntoViewIfNeeded();
   await page.screenshot({path:out+'/'+spec.name+'.png'});
   await next.click();
   await expect(pose).toHaveText('Pocket');
   await pose.scrollIntoViewIfNeeded();
   expect(errors).toEqual([]);
  } finally {await context.close();}
 }
});
