import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {homePanelFixture} from './helpers/home-panel.ts';

for(const shape of [
 {name:'desktop-owner',width:1440,height:900,level:1 as const,visitor:false},
 {name:'phone-owner',width:320,height:640,level:2 as const,visitor:false},
 {name:'phone-visitor',width:360,height:640,level:2 as const,visitor:true},
 {name:'short200-visitor',width:844,height:390,level:1 as const,visitor:true}
])test('lived-in cottage '+shape.name+' preserves stock and shows chosen identity',async({browser})=>{
 const context=await browser.newContext({viewport:shape,hasTouch:shape.width<=360});const page=await context.newPage(),errors:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  mkdirSync('test-results/browser',{recursive:true});
  const control=await homePanelFixture(page,{level:shape.level,visitor:shape.visitor,planId:'pocket-cottage-'+shape.level});const before=control.saved();
  const theme=()=>page.evaluate(()=>(window as any).__pilot.metrics().visual.home.interiorTexture);
  await expect.poll(theme).toBe('cottage-'+(shape.level===2?'expanded':'starter')+'-interior');
  await page.screenshot({path:'test-results/browser/cottage-'+shape.name+'-world.png'});
  await page.locator('#bag').click();await page.getByRole('button',{name:'Inspect or arrange a house',exact:true}).click();
  if(shape.name.includes('200'))await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  if(shape.visitor){
   await expect(page.locator('[data-home-displays]')).toContainText('On display');
   await expect(page.locator('[data-home-display]')).toHaveCount(shape.level===2?8:6);
   await expect(page.locator('[data-home-displays]')).toContainText('all three trail landmarks explored');
   await expect(page.getByRole('combobox',{name:'Owned furniture for plot'})).toHaveCount(0);
   await expect(page.locator('[data-home-displays]')).not.toContainText('in Bag');
   if(shape.level===2)await expect(page.locator('[data-home-display=easel]')).toContainText('pine and a garden harvest');
  }else{
   await expect(page.locator('[data-home-copy-note]')).toContainText('indoors');
   await page.getByRole('combobox',{name:'Owned furniture for plot'}).selectOption('stool');
   await expect(page.locator('[data-home-copy-note]')).toContainText('Placing moves one from another home nook');
   await page.getByRole('combobox',{name:'Plot furniture position'}).focus();await page.keyboard.press('Tab');
   await expect(page.locator('[data-home-action=place]')).toBeFocused();
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/browser/cottage-'+shape.name+'-panel.png'});
  await page.getByRole('button',{name:'Close panel',exact:true}).click();
  // A same-tier remodel while the visitor stays inside must replace the theme too.
  await control.setPlan('porch-house-'+shape.level);
  await expect.poll(theme).toBe('home-'+(shape.level===2?'expanded':'starter')+'-interior');
  expect(control.commands).toHaveLength(0);expect(control.saved()).toEqual(before);expect(errors).toEqual([]);
  writeFileSync('test-results/browser/cottage-'+shape.name+'.json',JSON.stringify({scope:'Actual compiled game with intercepted fictional home snapshots/SSE, existing pure-rule owned fixtures. No backend, home acquisition pacing or human enjoyment claim.',themeChangedWithoutSpending:true,publicDisplayOnly:true,privateProgressUnchanged:true,errors},null,2));
 }finally{await context.close();}
});
