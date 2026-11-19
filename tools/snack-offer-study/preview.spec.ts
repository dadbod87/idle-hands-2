import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const out='test-results/browser/snack-offer';

for(const size of [
 {name:'desktop',width:1440,height:900,mobile:false,text:100},
 {name:'phone',width:320,height:650,mobile:true,text:100},
 {name:'short',width:844,height:390,mobile:true,text:200},
]){
 test('parcel shelf rehearsal '+size.name,async({browser})=>{
  const context=await browser.newContext({viewport:{width:size.width,height:size.height},hasTouch:size.mobile});
  const page=await context.newPage();
  const errors:string[]=[], requests:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{
   const url=new URL(request.url());
   if(url.hostname!=='127.0.0.1'||url.pathname.startsWith('/api/'))requests.push(request.url());
  });
  const button=(name:string)=>page.getByRole('button',{name,exact:true});
  const press=async(name:string)=>{
   if(size.mobile)await button(name).tap();
   else await button(name).press('Enter');
  };
  const screenshot=async(phase:string)=>{
   mkdirSync(out,{recursive:true});
   await page.screenshot({path:out+'/'+size.name+'-'+phase+'.png',fullPage:true});
  };
  try{
   await page.goto('/');
   await page.evaluate(text=>document.documentElement.style.fontSize=text+'%',size.text);
   await expect(page.locator('img')).toHaveJSProperty('complete',true);
   expect(await page.locator('img').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
   const selector=page.getByLabel('Try a situation');
   await expect(page.getByRole('heading',{name:'Leave one packed snack'})).toBeVisible();
   await page.getByLabel('For',{exact:true}).selectOption('jun');
   await press('Leave snack');
   await expect(page.getByRole('heading',{name:'Waiting for Jun'})).toBeVisible();
   await expect(page.getByRole('status')).toHaveText('Snack left for Jun.');
   await expect(page.getByRole('status')).toBeFocused();
   await expect(page.locator('#pouch-count')).toHaveText('1 of 3 snacks · 1 parcel held');
   await screenshot('left');
   await press('Take back snack');
   await expect(page.locator('#pouch-count')).toHaveText('2 of 3 snacks');
   await expect(page.getByRole('status')).toHaveText('Snack returned to your pouch.');

   await selector.selectOption('full');
   await expect(button('Accept snack')).toBeDisabled();
   expect(await selector.evaluate((control:HTMLSelectElement)=>{
    const font=getComputedStyle(control);
    const ctx=document.createElement('canvas').getContext('2d')!;
    ctx.font=font.font;
    const width=ctx.measureText(control.selectedOptions[0].text).width;
    return width + parseFloat(font.paddingLeft) + parseFloat(font.paddingRight) + 28 < control.clientWidth;
   })).toBe(true);
   await screenshot('full');
   await press('Taste a snack');
   await expect(button('Accept snack')).toBeEnabled();
   expect((await button('Accept snack').boundingBox())!.height).toBeGreaterThanOrEqual(44);
   await press('Accept snack');
   await expect(page.locator('#pouch-count')).toHaveText('3 of 3 snacks');
   await expect(page.getByRole('status')).toHaveText('Snack added to your pouch.');

   await selector.selectOption('receive');
   await screenshot('received');
   await press('Decline');
   await expect(page.locator('#pouch-count')).toHaveText('2 of 3 snacks');
   await expect(page.getByRole('status')).toHaveText('Flint can take the snack back.');

   await selector.selectOption('return');
   await expect(page.getByRole('heading',{name:'Parcel expired'})).toBeVisible();
   await press('Take back snack');
   await expect(button('Take back snack')).toHaveCount(0);
   await expect(page.locator('#pouch-count')).toHaveText('2 of 3 snacks');
   expect(await page.evaluate(()=>localStorage.length+sessionStorage.length)).toBe(0);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.reload();
   await expect(page.getByRole('heading',{name:'Leave one packed snack'})).toBeVisible();
   expect(errors).toEqual([]);
   expect(requests).toEqual([]);
  }finally{await context.close();}
 });
}
