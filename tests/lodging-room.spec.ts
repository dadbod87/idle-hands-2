import {expect,test,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {LODGING_BEDSIDE,LODGING_FRONT} from '../src/game/lodging.ts';

const output='test-results/browser/lodging-room';
mkdirSync(output,{recursive:true});
const snapshot=(page:Page)=>page.evaluate(()=>(window as any).__pilot.snapshot());
const readPosition=(page:Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('ih2:pilot-position:v1')!));
const resident={version:1,name:'Aspen',look:'casey'};

async function enlargeAndWaitForPaint(page:Page,size:string){
  const before=await page.evaluate(()=>(window as any).__pilot.metrics().presentation.renderedFrames);
  await page.evaluate(value=>document.documentElement.style.fontSize=value,size);
  await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.metrics().presentation.renderedFrames))
    .toBeGreaterThan(before+2);
}

async function worldPainted(page:Page){
  const bytes=(await page.locator('canvas').screenshot()).toString('base64');
  return page.evaluate(async data=>{
    const world=new Image();
    world.src='data:image/png;base64,'+data;
    await world.decode();
    const tiny=document.createElement('canvas');
    tiny.width=12;tiny.height=7;
    const painter=tiny.getContext('2d')!;
    painter.drawImage(world,0,0,12,7);
    const pixels=painter.getImageData(0,0,12,7).data;
    let lit=0;
    for(let index=0;index<pixels.length;index+=4)if(pixels[index]+pixels[index+1]+pixels[index+2]>140)lit++;
    return lit>=60;
  },bytes);
}

test('the browser boarding house opens by its actual door and returns to the same front step',async({browser})=>{
  test.setTimeout(75_000);
  for(const layout of [
    {name:'desktop',width:1440,height:900,touch:false,text:'100%'},
    {name:'phone',width:320,height:640,touch:true,text:'100%'},
    {name:'short',width:844,height:390,touch:true,text:'200%'},
  ]){
    const context=await browser.newContext({viewport:layout,hasTouch:layout.touch,reducedMotion:layout.touch?'reduce':'no-preference'});
    try{
      const page=await context.newPage();
      const errors:string[]=[];
      page.on('pageerror',error=>errors.push(error.message));
      const api:string[]=[];
      page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/')) api.push(request.url());});
      await page.addInitScript(profile=>{
        if(!localStorage.getItem('ih2:browser-resident:v1'))localStorage.setItem('ih2:browser-resident:v1',JSON.stringify(profile));
        if(!localStorage.getItem('ih2:pilot-position:v1')){
          localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'square',position:{x:12.1,y:23.2}}));
        }
      },resident);
      await page.goto('/?sky-study=1&phase=day&weather=clear');
      await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.metrics().ready)).toBe(true);
      await enlargeAndWaitForPaint(page,layout.text);
      await expect(page.locator('#local-resident-badge')).toHaveText('Aspen');
      await page.screenshot({path:output+'/'+layout.name+'-outside.png'});
      const inventory=await page.evaluate(()=>(window as any).__pilot.workshop().inventory);
      if(layout.name==='short'){
        await page.locator('#places').tap();
        await page.getByRole('searchbox',{name:'Find a place'}).fill('boarding house');
        await page.getByRole('button',{name:'Walk to Ledgerwick Boarding House →'}).tap();
        await expect(page.locator('#feedback')).toContainText('Choose Enter lodging.');
        await page.getByRole('button',{name:'Enter boarding house',exact:true}).tap();
      }else{
        const entry=await page.evaluate(()=>(window as any).__pilot.screenPoint(10.5,20.4));
        if(layout.touch)await page.locator('canvas').tap({position:entry});
        else await page.locator('canvas').click({position:entry});
      }
      await expect.poll(async()=>(await snapshot(page)).room).toBe('lodging');
      await expect(page.locator('#location')).toContainText('Boarding house');
      expect((await snapshot(page)).position).toEqual(LODGING_BEDSIDE);
      await expect.poll(()=>readPosition(page)).toEqual({version:1,room:'lodging',position:LODGING_BEDSIDE});
      await page.reload();
      await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.metrics().ready)).toBe(true);
      await enlargeAndWaitForPaint(page,layout.text);
      expect((await snapshot(page)).position).toEqual(LODGING_BEDSIDE);
      await expect.poll(()=>worldPainted(page)).toBe(true);
      await page.screenshot({path:output+'/'+layout.name+'-inside.png'});
      const inspect=page.getByRole('button',{name:'Inspect A note by the bed',exact:true});
      if(layout.touch)await inspect.tap();else await page.keyboard.press('e');
      await expect(page.getByRole('heading',{name:'A note by the bed'})).toBeVisible();
      await expect(page.getByRole('dialog')).toContainText('Marlow');
      const leave=page.getByRole('button',{name:'Step outside',exact:true});
      await page.screenshot({path:output+'/'+layout.name+'-note.png'});
      await expect(leave).toBeInViewport({ratio:1});
      const box=await leave.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      if(layout.touch)await leave.tap();else{await leave.focus();await page.keyboard.press('Enter');}
      await expect.poll(async()=>(await snapshot(page)).room,{timeout:12_000}).toBe('square');
      expect((await snapshot(page)).position).toEqual(LODGING_FRONT);
      await expect.poll(()=>readPosition(page)).toEqual({version:1,room:'square',position:LODGING_FRONT});
      await expect(page.locator('#feedback')).toContainText('Marlow');
      expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('ih2:browser-resident:v1')!))).toEqual(resident);
      expect(await page.evaluate(()=>(window as any).__pilot.workshop().inventory)).toEqual(inventory);
      expect(api).toEqual([]);
      expect(errors).toEqual([]);
    }finally{await context.close();}
  }
});

test('a saved browser resident inside the new façade moves to the front steps once',async({page})=>{
  await page.addInitScript(()=>{
    if(!localStorage.getItem('ih2:pilot-position:v1')){
      localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'square',position:{x:10.5,y:18}}));
    }
  });
  await page.goto('/');
  await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.metrics().ready)).toBe(true);
  expect((await snapshot(page)).position).toEqual(LODGING_FRONT);
  await expect.poll(()=>readPosition(page)).toEqual({version:1,room:'square',position:LODGING_FRONT});
  await expect(page.locator('#feedback')).toContainText('front steps');
  await page.reload();
  await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.metrics().ready)).toBe(true);
  expect((await snapshot(page)).position).toEqual(LODGING_FRONT);
  await expect(page.locator('#feedback')).not.toContainText('front steps');
});
