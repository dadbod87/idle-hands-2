import {expect,test,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {MOSSBANK_FRONT} from '../src/game/mossbank-room.ts';

const output=process.env.QA_EVIDENCE_DIR??'test-results/browser';
function nearby(page:Page){
 return page.evaluate(()=> (window as Window&{__pilot?:{snapshot():{nearby:string}}}).__pilot?.snapshot().nearby);
}

for(const shape of [{name:'desktop',width:1440,height:900,touch:false},{name:'phone',width:320,height:640,touch:true},{name:'short200',width:844,height:390,touch:true}]){
 test('Mossbank road and optional sawmill survey · '+shape.name,async({browser})=>{
  test.setTimeout(90000);
  mkdirSync(output,{recursive:true});
  const context=await browser.newContext({viewport:{width:shape.width,height:shape.height},hasTouch:shape.touch});
  const page=await context.newPage();
  const errors:string[]=[],api:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))api.push(request.url());});
  const press=async(name:string)=>{
   const button=page.getByRole('button',{name,exact:true});
   if(shape.touch)await button.tap();else await button.click();
  };
  const room=async(name:string)=>{
   await expect(page.locator('canvas')).toBeVisible();
   await expect(page.locator('#location')).toHaveAttribute('data-room',name);
  };
  const take=(name:string)=>page.screenshot({path:output+'/mossbank-'+shape.name+'-'+name+'.png'});

  try{
   // Start beside the road in a fresh browser save. No quest, bait, items or combat result is seeded.
   await page.addInitScript(front=>{
    if(!localStorage.getItem('ih2:pilot-position:v1')){
     localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'square',position:{x:front.x-2.25,y:front.y+1.2}}));
    }
   },MOSSBANK_FRONT);
   await page.goto('/?sky-study=1&phase=day&weather=clear');
   await room('square');
   if(shape.name==='short200')await page.evaluate(()=>document.documentElement.style.fontSize='200%');
   const original=await page.evaluate(()=>localStorage.getItem('ih2:workshop:v2'));
   await take('sign');
   if(shape.name==='desktop'){
    const canvas=page.locator('canvas');
    const position=await page.evaluate(p=>{
     const pilot=(window as Window&{__pilot?:{screenPoint(x:number,y:number):{x:number;y:number}}}).__pilot!;
     return pilot.screenPoint(p.x,p.y-.6);
    },MOSSBANK_FRONT);
    await canvas.click({position});
   }else{
    await press('Places');
    await page.getByRole('searchbox',{name:'Find a place'}).fill('mossbank');
    await page.getByRole('region',{name:'Matching places'}).locator('[data-destination=mossbank-road]').tap();
    await expect.poll(()=>nearby(page)).toBe('mossbank-road');
    await press('Enter Mossbank');
   }
   await room('mossbank');
   await take('arrival');
   await press('Places');
   if(shape.touch)await page.locator('[data-destination=mossbank-mill]').tap();
   else await page.locator('[data-destination=mossbank-mill]').click();
   await expect.poll(()=>nearby(page),{timeout:18000}).toBe('mossbank-mill');
   await press('Inspect Wren · sawmill');
   await press('Take the route card');
   await expect(page.locator('[data-mossbank]')).toContainText('Choose either stop first.');
   if(shape.name==='short200')await expect(page.getByRole('button',{name:'Walk to the flume landing',exact:true})).toBeInViewport({ratio:1});
   await take('card');

   const flumeFirst=shape.name==='phone';
   const visit=async(place:'flume'|'windrow',fromMill:boolean)=>{
    if(place==='flume'){
     await press('Walk to the flume landing');
     await expect(page.locator('[data-mossbank=mossbank-flume]')).toBeVisible({timeout:22000});
     await press('Mark the higher shelf for timber');
     await expect(page.locator('[data-mossbank] [role=status]').filter({hasText:'Flume recorded'})).toBeVisible();
    }else{
     await press('Walk to the alder windrow');
     await expect(page.locator('[data-mossbank=mossbank-windrow]')).toBeVisible({timeout:22000});
     await press('Record the alder windrow');
     await expect(page.locator('[data-mossbank] [role=status]').filter({hasText:'Windrow recorded'})).toBeVisible();
    }
    if(fromMill&&shape.name==='desktop'){
     await page.reload();
     await room('mossbank');
     await press(place==='flume'?'Inspect Flume landing':'Inspect Alder windrow');
    }
   };
   await visit(flumeFirst?'flume':'windrow',true);
   await visit(flumeFirst?'windrow':'flume',false);
   await press('Walk back to Wren');
   const claim=page.getByRole('button',{name:'Trade the survey for an alder swatch',exact:true});
   await expect(claim).toBeVisible({timeout:22000});
   await press('Trade the survey for an alder swatch');
   await expect(page.getByRole('img',{name:'A honey-brown alder sample with visible grain'})).toBeVisible();
   await take('swatch');
   await press('Close panel');
   await press('Journal');
   await expect(page.locator('[data-mossbank-journal]')).toContainText('Alder swatch');
   await page.locator('[data-mossbank-journal]').scrollIntoViewIfNeeded();
   await take('journal');
   expect(await page.locator('dialog').evaluate(d=>d.scrollWidth<=d.clientWidth)).toBe(true);
   await press('Close panel');
   await press('Places');
   if(shape.touch)await page.locator('[data-destination=mossbank-return]').tap();
   else await page.locator('[data-destination=mossbank-return]').click();
   await expect.poll(()=>nearby(page),{timeout:22000}).toBe('mossbank-return');
   await press('Enter town square');
   await room('square');
   await expect.poll(()=>nearby(page)).toBe('mossbank-road');
   expect(await page.evaluate(()=>localStorage.getItem('ih2:workshop:v2'))).toEqual(original);
   expect(await page.evaluate(()=>localStorage.getItem('ih2:pumpworks:v1'))).toBeNull();
   expect(api).toEqual([]);
   expect(errors).toEqual([]);
  }finally{await context.close();}
 });
}
