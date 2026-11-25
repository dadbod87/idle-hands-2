import {expect,test,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {MOSSBANK_FRONT} from '../src/game/mossbank-room.ts';

const output=process.env.QA_EVIDENCE_DIR??'test-results/browser';
type MossbankVisual={worker:string|null;ripples:{x:number;y:number}[]};
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
   await expect(page.locator('#location')).toHaveAttribute('data-room',name,{timeout:45000});
  };
  const take=(name:string)=>page.screenshot({path:output+'/mossbank-'+shape.name+'-'+name+'.png'});
  const visual=()=>page.evaluate(()=>(window as Window&{
   __pilot?:{metrics():{visual:{mossbank:MossbankVisual}}};
  }).__pilot?.metrics().visual.mossbank);

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
   await expect.poll(async()=>(await visual())?.worker).toBe('mossbank-wren');
   await take('wren');
   if(shape.name==='desktop'){
    await expect.poll(async()=>(await visual())?.ripples.length).toBeGreaterThan(0);
    const before=(await visual())!.ripples;
    await expect.poll(async()=>(await visual())!.ripples).not.toEqual(before);
    expect((await visual())!.ripples.every(({x})=>x>810&&x<932)).toBe(true);
    await page.emulateMedia({reducedMotion:'reduce'});
    await expect.poll(async()=>(await visual())!.ripples).toEqual([]);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await expect.poll(async()=>(await visual())!.ripples.length).toBeGreaterThan(0);
    await take('river');
   }
   await press('Inspect Wren · sawmill');
   await press('Take the route card');
   await expect(page.locator('[data-mossbank]')).toContainText('Choose either stop first.');
   if(shape.name==='short200')await expect(page.getByRole('button',{name:'Walk to the flume landing',exact:true})).toBeInViewport({ratio:1});
   await take('card');

   const flumeFirst=shape.name==='phone';
   const visit=async(place:'flume'|'windrow')=>{
    await press(place==='flume'?'Walk to the flume landing':'Walk to the alder windrow');
    await expect(page.locator('#feedback')).toContainText(place==='flume'?'Flume recorded':'Windrow recorded',{timeout:22000});
    await expect(page.getByRole('dialog')).toBeHidden();
   };
   await visit(flumeFirst?'flume':'windrow');
   await take('field-note');
   if(shape.name==='desktop'){
    await page.reload();
    await room('mossbank');
   }
   await press('Journal');
   await expect(page.locator('[data-mossbank-journal]')).toContainText('Recorded · '+(flumeFirst?'Flume landing':'Alder windrow'));
   await visit(flumeFirst?'windrow':'flume');
   await press('Journal');
   await press('Walk to Wren');
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
   await expect.poll(visual).toEqual({worker:null,ripples:[]});
   if(shape.name==='desktop'){
    await press('Journal');
    await press('Preview the swatch in your workshop');
    await expect(page.getByRole('combobox',{name:'Choose a workshop print'})).toHaveValue('mossbank-swatch');
    expect(await page.evaluate(()=>localStorage.getItem('ih2:river-print:v1'))).toBeNull();
    await press('Display print');
    await expect(page.getByText('Print displayed.',{exact:true})).toBeVisible();
    expect(await page.evaluate(()=>localStorage.getItem('ih2:river-print:v1'))).toBe('mossbank-swatch');
    await press('See it in the workshop');
    await room('workshop');
    await press('Places');
    await page.locator('[data-destination=workshop-print]').click();
    await expect.poll(()=>nearby(page)).toBe('workshop-print');
    await press('Inspect Workshop print');
    await expect(page.locator('#panel-title')).toHaveText('Wren’s alder swatch');
    await take('workshop');
   }
   expect(await page.evaluate(()=>localStorage.getItem('ih2:workshop:v2'))).toEqual(original);
   expect(await page.evaluate(()=>localStorage.getItem('ih2:pumpworks:v1'))).toBeNull();
   expect(api).toEqual([]);
   expect(errors).toEqual([]);
  }finally{await context.close();}
 });
}
