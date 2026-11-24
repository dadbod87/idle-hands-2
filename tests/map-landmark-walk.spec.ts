import {mkdirSync} from 'node:fs';
import {test,expect} from '@playwright/test';
import {applyWorkshop,createWorkshop,type WorkshopState} from '../src/game/live-workshop.ts';

test('after placing a first planter, Journal offers a short Riverwalk outing without another job',async({browser})=>{
 test.setTimeout(60_000);
 const context=await browser.newContext({viewport:{width:320,height:640},hasTouch:true});
 try{
  const page=await context.newPage(),errors:string[]=[],requests:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))requests.push(request.url());});
  const hit=async(name:string)=>page.getByRole('button',{name,exact:true}).tap();
  const boots=()=>expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
  await page.goto('/');
  await boots();
  await hit('Journal');
  await expect(page.locator('[data-river-entry]')).toBeHidden();
  const start=Date.now()-60_000;
  let workshop=createWorkshop(start);
  for(const [index,command] of [
   {kind:'gather',resource:'scrap'},
   {kind:'gather',resource:'timber'},
   {kind:'gather',resource:'supplies'},
   {kind:'craft',recipe:'planter'},
   {kind:'claim'},
   {kind:'place',prop:'planter',slot:'north-west'},
  ].entries()){
   const result=applyWorkshop(workshop,{...command,id:'first-outing-'+index,expectedRevision:workshop.revision},start+index*6000);
   expect(result.ok,result.message).toBe(true);
   workshop=result.state;
  }
  // Explicit fixture for the previous morning only. The travel and cast below
  // use ordinary input and real time, with no starting position or river data.
  await page.addInitScript(save=>localStorage.setItem('ih2:workshop:v2',JSON.stringify(save)),workshop);
  await page.reload();
  await boots();
  await hit('Journal');
  const river=page.locator('[data-river-entry]');
  await expect(river).toContainText('Borrow a rod and try a 12-second cast.');
  await expect(river).toHaveClass('journal-first-outing');
  const route=river.getByRole('button',{name:'Walk to the Riverwalk',exact:true});
  const out=process.env.QA_EVIDENCE_DIR??'test-results/browser/first-riverwalk';
  mkdirSync(out,{recursive:true});
  await route.evaluate(node=>node.scrollIntoView({block:'center'}));
  await expect(route).toBeInViewport({ratio:1});
  await page.screenshot({path:out+'/phone-outing.png'});
  await page.setViewportSize({width:844,height:390});
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  await river.evaluate(node=>node.scrollIntoView({block:'center'}));
  await expect(route).toBeInViewport({ratio:1});
  await expect.poll(async()=>{
   const heading=await river.getByRole('heading').boundingBox(),title=await page.locator('.dialog-head').boundingBox();
   return !!heading&&!!title&&heading.y>=title.y+title.height-1;
  }).toBe(true);
  await page.screenshot({path:out+'/short-outing.png'});
  await page.setViewportSize({width:320,height:640});
  await page.evaluate(()=>document.documentElement.style.fontSize='100%');
  await route.tap();
  await expect(page.getByRole('heading',{name:'Borrow a rod'})).toBeVisible({timeout:35_000});
  await hit('Cast at Reed bank');
  const reel=page.getByRole('button',{name:'Reel in and record',exact:true});
  await expect(reel).toBeDisabled();
  await expect(reel).toBeEnabled({timeout:15_000});
  await reel.tap();
  await expect(page.getByRole('list',{name:'Recorded river finds'})).toContainText('A ribbon of pondweed');
  await hit('Close panel');
  await hit('Journal');
  await expect(page.locator('.journal-first-outing')).toHaveCount(0);
  await expect(page.locator('[data-river-journal]')).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('ih2:workshop:v2')!) as WorkshopState)).toEqual(workshop);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
 }finally{await context.close();}
});

test('map destination highlights the landmark and waits for deliberate travel', async ({browser}) => {
 const out='test-results/browser/map-landmark-walk';
 mkdirSync(out,{recursive:true});
 for(const spec of [
  {name:'desktop',width:1440,height:900,text:100,touch:false,target:'commons-riverwalk',label:'Riverwalk'},
  {name:'phone',width:320,height:650,text:100,touch:true,target:'commons-green',label:'East Commons'},
  {name:'short',width:844,height:390,text:200,touch:true,target:'commons-orchard',label:'Orchard walk'},
 ]){
  const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},
   hasTouch:spec.touch,reducedMotion:spec.touch?'reduce':'no-preference'});
  try{
   const page=await context.newPage(),api:string[]=[],errors:string[]=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('request',request=>{
    const path=new URL(request.url()).pathname;
    if(path.startsWith('/api/'))api.push(path);
   });
   await page.goto('/');
   await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
   await page.evaluate(text=>document.documentElement.style.fontSize=text+'%',spec.text);
   const feet=()=>page.evaluate(()=>(window as any).__pilot.snapshot());
   const start=await feet();
   await page.locator('#places').click();
   const disclosure=page.locator('.places-map summary');
   if(spec.touch)await disclosure.tap();
   else await disclosure.press('Enter');
   const select=page.getByLabel('Map destination');
   const button=page.getByRole('button',{name:'Walk there'});
   await expect(select.locator('option')).toHaveCount(7);
   await expect(button).toBeDisabled();
   await select.selectOption(spec.target);
   await expect(page.locator('.map-destination')).toHaveAttribute('data-landmark',spec.target);
   await expect(button).toBeEnabled();
   expect((await feet()).position).toEqual(start.position);
   expect((await feet()).walking).toBe(false);
   await select.selectOption('');
   await expect(page.locator('.map-destination')).toHaveCount(0);
   await expect(button).toBeDisabled();
   await select.selectOption(spec.target);
   const pin=page.locator('.map-destination');
   await expect(pin).toHaveText(spec.label);
   await pin.scrollIntoViewIfNeeded();
   await page.screenshot({path:out+'/'+spec.name+'-pin.png'});
   await button.scrollIntoViewIfNeeded();
   const bounds=(await button.boundingBox())!,dialog=(await page.getByRole('dialog').boundingBox())!;
   const head=(await page.locator('.dialog-head').boundingBox())!;
   expect(bounds.height).toBeGreaterThanOrEqual(44);
   expect(bounds.y).toBeGreaterThanOrEqual(head.y+head.height-1);
   expect(bounds.y+bounds.height).toBeLessThanOrEqual(dialog.y+dialog.height);
   expect(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
   await page.screenshot({path:out+'/'+spec.name+'-controls.png'});
   if(spec.touch)await button.tap();
   else await button.press('Enter');
   await expect(page.getByRole('dialog')).not.toBeVisible();
   await expect(page.locator('#feedback')).toHaveText('Walking to '+spec.label+'.');
   if(spec.name!=='short'){
    await expect.poll(async()=>(await feet()).nearby,{timeout:30000}).toBe(spec.target);
    await expect.poll(async()=>(await feet()).walking).toBe(false);
   }
   expect(api).toEqual([]);
   expect(errors).toEqual([]);
  }finally{await context.close();}
 }
});

test('Riverwalk practice lets a resident leave a line out and return to record the find',async({browser})=>{
 const out='test-results/browser/river-survey';mkdirSync(out,{recursive:true});
 for(const {name,width,height,touch} of [
  {name:'desktop',width:1440,height:900,touch:false},
  {name:'phone',width:320,height:640,touch:true},
  {name:'short',width:844,height:390,touch:true},
 ]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch});
  try{
   const page=await context.newPage(),errors:string[]=[],requests:string[]=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('request',req=>{if(new URL(req.url()).pathname.startsWith('/api/'))requests.push(req.url());});
   await page.addInitScript(()=>{
    if(sessionStorage.getItem('riverwalk-position'))return;
    localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'square',position:{x:70,y:17}}));
    sessionStorage.setItem('riverwalk-position','1');
   });
   const now=Date.now();
   await page.clock.setFixedTime(now);
   await page.goto('/');
   const nearby=()=>page.evaluate(()=>(window as any).__pilot?.snapshot().nearby);
   const state=()=>page.evaluate(()=>(window as any).__pilot.workshop());
   const float=()=>page.evaluate(()=>(window as any).__pilot.metrics().visual.commons.life?.riverFloat);
   const anchor={spot:'reeds',x:2310,y:371};
   const boot=async()=>{
    await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
    await expect.poll(nearby).toBe('commons-riverwalk');
   };
   const open=async()=>{
    const interact=page.locator('#interact');
    await expect(interact).toBeEnabled();
    if(touch)await interact.tap();else{await interact.focus();await page.keyboard.press('Enter');}
    await expect(page.getByRole('heading',{name:'Borrow a rod'})).toBeVisible();
   };
   await boot();
   const before=await state();
   // The resident is already at the river. Make the durable feet go stale so
   // only the confirmed cast can write the current position back.
   await page.evaluate(()=>localStorage.removeItem('ih2:pilot-position:v1'));
   await open();
   const cast=page.getByRole('button',{name:'Cast at Reed bank'});
   if(touch)await cast.tap();else await cast.press('Enter');
   const reel=page.getByRole('button',{name:'Reel in and record'});
   await expect(reel).toBeDisabled();
   await expect(page.getByRole('status').filter({hasText:'Line out at Reed bank'})).toBeVisible();
   const standing=await page.evaluate(()=>({
    current:(window as any).__pilot.snapshot().position,
    saved:JSON.parse(localStorage.getItem('ih2:pilot-position:v1')??'null'),
   }));
   expect(standing.saved).toEqual({version:1,room:'square',position:standing.current});
   await page.screenshot({path:out+'/waiting-'+name+'.png'});
   await page.getByRole('button',{name:'Close panel'}).click();
   if(name!=='short'){
    await expect.poll(float).toMatchObject({...anchor,ready:false,motion:true});
    await page.screenshot({path:out+'/float-'+name+'.png'});
   }
   if(name==='desktop'){
    await page.emulateMedia({reducedMotion:'reduce'});
    await expect.poll(float).toMatchObject({...anchor,motion:false,offset:0});
    await page.setViewportSize({width:844,height:390});
    await expect.poll(float).toBe(null);
    await page.setViewportSize({width,height});
    await expect.poll(float).toMatchObject({...anchor,motion:false,offset:0});
   }
   await page.locator('#bag').click();
   await expect(page.getByRole('heading',{name:'Your bag'})).toBeVisible();
   await page.getByRole('button',{name:'Close panel'}).click();
   await page.locator('#journal').click();
   const riverEntry=page.locator('[data-river-entry]');
   await expect(riverEntry).toContainText('Line out');
   await expect(riverEntry.getByRole('button',{name:'Walk to the Riverwalk'})).toBeVisible();

   await page.clock.setFixedTime(now+12000);
   await page.reload();await boot();
   if(name!=='short'){
    await expect.poll(float).toMatchObject({...anchor,ready:true});
    await page.screenshot({path:out+'/float-ready-'+name+'.png'});
   }
   await page.locator('canvas').focus();
   await page.keyboard.down('ArrowRight');
   try{await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.snapshot().position.x)).toBeGreaterThan(71.65);}
   finally{await page.keyboard.up('ArrowRight');}
   if(name==='desktop')await expect.poll(float).toMatchObject({...anchor,ready:true,motion:false,offset:0});
   await page.locator('#journal').click();
   await expect(riverEntry).toContainText('Ready to reel in.');
   const returnToRiver=riverEntry.getByRole('button',{name:'Walk to the Riverwalk'});
   if(touch)await returnToRiver.tap();else await returnToRiver.press('Enter');
   await expect(page.getByRole('heading',{name:'Borrow a rod'})).toBeVisible();
   await expect(reel).toBeEnabled();
   if(touch)await reel.tap();else await reel.press('Enter');
   const log=page.getByRole('list',{name:'Recorded river finds'});
   await expect(log.getByRole('listitem')).toHaveCount(1);
   await expect(log).toContainText('A ribbon of pondweed');
   await expect(cast).toHaveCount(0);
   await expect(page.getByRole('dialog').locator('.river-survey')).toBeVisible();
   expect(await page.getByRole('dialog').evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
   await log.scrollIntoViewIfNeeded();
   await page.screenshot({path:out+'/recorded-'+name+'.png'});
   const leave=page.getByRole('button',{name:'Walk to the old square'});
   await leave.evaluate(button=>button.scrollIntoView({block:'center'}));
   await expect(leave).toBeInViewport({ratio:1});
   if(touch)await page.screenshot({path:out+'/leave-'+name+'.png'});
   await page.getByRole('button',{name:'Close panel'}).click();
   await expect.poll(float).toBe(null);
   await open();
   await expect(log.getByRole('listitem')).toHaveCount(1);
   expect(await state()).toEqual(before);
   if(name==='desktop'){
    const save=()=>page.evaluate(()=>localStorage.getItem('ih2:river-survey:v1'));
    const saved=await save();
    await page.evaluate(()=>{
     const set=Storage.prototype.setItem;
     Storage.prototype.setItem=function(key,value){
      if(key==='ih2:river-survey:v1')throw new DOMException('Synthetic storage failure','QuotaExceededError');
      return set.call(this,key,value);
     };
    });
    await page.getByRole('button',{name:'Cast at Bridge shadow'}).click();
    await expect(page.getByRole('status').filter({hasText:'notebook could not be saved'})).toBeVisible();
    expect(await save()).toBe(saved);
    await expect(log.getByRole('listitem')).toHaveCount(1);
   }
   expect(requests).toEqual([]);
   expect(errors).toEqual([]);
  }finally{await context.close();}
 }
});

test('illustrated Riverwalk records stay readable and do not enter the Bag', async ({browser}) => {
 const output='test-results/browser/river-survey';
 mkdirSync(output,{recursive:true});
 for (const size of [
  {name:'desktop',width:1440,height:900,text:100,touch:false},
  {name:'phone',width:320,height:640,text:100,touch:true},
  {name:'short',width:844,height:390,text:200,touch:true},
 ]) {
  const context=await browser.newContext({viewport:{width:size.width,height:size.height},hasTouch:size.touch});
  try {
   const page=await context.newPage(), art=new Set<string>(), errors:string[]=[],api:string[]=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('request',request=>{
    const path=new URL(request.url()).pathname;
    if(path.startsWith('/art/river/'))art.add(path.split('/').pop()!);
    if(path.startsWith('/api/'))api.push(path);
   });
   // Disclosed reachable spawn and fixed deadline clock only. Every find is
   // produced by deliberate real UI cast and reel actions in the new context.
   await page.addInitScript(()=>{
    if(!localStorage.getItem('ih2:pilot-position:v1')){
     localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'square',position:{x:70,y:17}}));
    }
   });
   let now=Date.now();
   await page.clock.setFixedTime(now);
   await page.goto('/');
   await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
   await page.evaluate(scale=>document.documentElement.style.fontSize=scale+'%',size.text);
   const state=()=>page.evaluate(()=>(window as any).__pilot.workshop());
   const before=await state();
   const hit=(locator:ReturnType<typeof page.locator>)=>size.touch?locator.tap():locator.click();
   const log=page.getByRole('list',{name:'Recorded river finds'});
   await hit(page.locator('#interact'));
   const reel=page.getByRole('button',{name:'Reel in and record'});
   const findings=[
    ['Reed bank','A ribbon of pondweed','pondweed.svg'],
    ['Bridge shadow','An exceptionally wet boot','wet-boot.svg'],
    ['Shallow riffle','A young perch','perch.svg'],
   ];
   for(const [index,[spot,label,filename]] of findings.entries()){
    await hit(page.getByRole('button',{name:'Cast at '+spot,exact:true}));
    await expect(reel).toBeDisabled();
    expect(art.has(filename)).toBe(false);
    await page.clock.setFixedTime(now+=12000);
    await expect(reel).toBeEnabled();
    await hit(reel);
    const result=log.getByRole('listitem').nth(index);
    await expect(result).toContainText(label);
    await expect(result).toBeFocused();
    await expect(result).toBeInViewport({ratio:1});
    const bounds=(await result.boundingBox())!,header=(await page.locator('.dialog-head').boundingBox())!;
    expect(bounds.y).toBeGreaterThanOrEqual(header.y+header.height-1);
    await expect(result.locator('img')).toHaveAttribute('alt','');
    await expect.poll(()=>result.locator('img').evaluate((el:HTMLImageElement)=>el.naturalWidth)).toBeGreaterThan(0);
   }
   await expect(log.getByRole('listitem')).toHaveCount(3);
   expect([...art].sort()).toEqual(['perch.svg','pondweed.svg','wet-boot.svg']);
   expect(await log.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
   await log.scrollIntoViewIfNeeded();
   await page.screenshot({path:output+'/all-findings-'+size.name+'.png'});
   if(size.name==='short'){
    const visibleBelowHeader=async (item:ReturnType<typeof page.locator>)=>{
     await item.evaluate(el=>{
      const dialog=el.closest('dialog')!, header=dialog.querySelector('.dialog-head')!;
      dialog.scrollTop+=el.getBoundingClientRect().top-header.getBoundingClientRect().bottom-8;
     });
     const bounds=(await item.boundingBox())!, header=(await page.locator('.dialog-head').boundingBox())!;
     expect(bounds.y).toBeGreaterThanOrEqual(header.y+header.height);
     expect(bounds.y+bounds.height).toBeLessThanOrEqual(size.height);
    };
    for(const item of await log.getByRole('listitem').all())await visibleBelowHeader(item);
    const exit=page.getByRole('button',{name:'Walk to the old square'});
    await visibleBelowHeader(exit);
    await page.screenshot({path:output+'/completed-exit-short.png'});
   }
   await page.reload();
   await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
   await hit(page.locator('#journal'));
   const folio=page.locator('[data-river-journal]');
   const caption=folio.locator('summary');
   await expect(caption).toHaveText('Riverwalk finds · 3 of 3');
   await hit(caption);
   const journalFinds=folio.getByRole('list',{name:'Riverwalk journal finds'});
   await expect(journalFinds.getByRole('listitem')).toHaveCount(3);
   for(const [,name] of findings)await expect(journalFinds).toContainText(name);
   expect(await journalFinds.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
   await caption.scrollIntoViewIfNeeded();
   await page.screenshot({path:output+'/journal-findings-'+size.name+'.png'});
   await hit(page.getByRole('button',{name:'Close panel'}));
   if(size.name==='phone')await page.route('**/art/river/wet-boot.svg',route=>route.abort());

   await hit(page.locator('#interact'));
   await expect(log.getByRole('listitem')).toHaveCount(3);
   if(size.name==='phone'){
    const boot=log.getByRole('listitem').filter({hasText:'An exceptionally wet boot'});
    await expect(boot.locator('img')).toBeHidden();
    await expect(boot).toContainText('right is still under investigation');
   }
   expect(await state()).toEqual(before);
   expect(errors).toEqual([]);
   expect(api).toEqual([]);
  }finally{
   await context.close();
  }
 }
});

test('only an earned river print can decorate a private workshop, with durable removal',async({browser})=>{
 const output=process.env.QA_EVIDENCE_DIR??'test-results/browser/river-survey';
 mkdirSync(output,{recursive:true});
 const record=JSON.stringify({version:1,recorded:['reeds','bridge'],cast:null});
 for(const size of [
  {name:'desktop',width:1440,height:900,text:100,touch:false},
  {name:'phone',width:320,height:640,text:100,touch:true},
  {name:'short',width:844,height:390,text:200,touch:true},
 ]){
  const context=await browser.newContext({viewport:{width:size.width,height:size.height},hasTouch:size.touch});
  try{
   await context.addInitScript(({record,inWorkshop})=>{
    if(!localStorage.getItem('ih2:river-survey:v1'))localStorage.setItem('ih2:river-survey:v1',record);
    if(inWorkshop&&!localStorage.getItem('ih2:pilot-position:v1'))localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'workshop',position:{x:9,y:11}}));
   },{record,inWorkshop:size.name!=='phone'});
   const page=await context.newPage(),errors:string[]=[],api:string[]=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))api.push(request.url());});
   const read=(key:string)=>page.evaluate(key=>localStorage.getItem(key),key);
   const art=()=>page.evaluate(()=>(window as any).__pilot.metrics().visual.riverPrint);
   const hit=(control:ReturnType<typeof page.locator>)=> size.touch?control.tap():control.press('Enter');
   const button=(name:string)=>page.getByRole('button',{name,exact:true});
   const ready=()=>expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
   async function openFolio(){
    await hit(page.locator('#journal'));
    await hit(page.locator('[data-river-journal] summary'));
    await expect(page.getByRole('combobox',{name:'Choose a river print'})).toBeVisible();
   }
   await page.goto('/?sky-study=1&phase=day&weather=clear');
   await ready();
   await page.evaluate(scale=>document.documentElement.style.fontSize=scale+'%',size.text);
   const before=await read('ih2:workshop:v2');
   await openFolio();
   const choice=page.getByRole('combobox',{name:'Choose a river print'});
   await expect(choice.locator('option')).toHaveText(['A ribbon of pondweed','An exceptionally wet boot']);
   await choice.selectOption('bridge');
   await expect(button('Take print down')).toBeDisabled();
   await hit(button('Display print'));
   await expect(page.getByText('On display · An exceptionally wet boot')).toBeVisible();
   await expect.poll(()=>read('ih2:river-print:v1')).toBe('bridge');
   await page.screenshot({path:output+'/river-print-panel-'+size.name+'.png'});
   if(size.name==='phone')await hit(button('See it in the workshop'));
   else await hit(button('Close panel'));
   await expect.poll(art,{timeout:30000}).toBe('bridge');
   const bounds=await page.locator('canvas').boundingBox();
   const print=await page.evaluate(()=>(window as any).__pilot.screenPoint(11.85,9.6));
   expect(print.x-45).toBeGreaterThan(0);
   expect(print.x+45).toBeLessThan(bounds!.width);
   expect(print.y-36).toBeGreaterThan(0);
   expect(print.y+48).toBeLessThan(bounds!.height);
   await page.screenshot({path:output+'/river-print-wall-'+size.name+'.png'});
   await page.reload();
   await ready();
   await expect.poll(art).toBe('bridge');
   await openFolio();
   if(size.name==='phone'){
    await page.evaluate(()=>{
     const set=Storage.prototype.setItem;
     Storage.prototype.setItem=function(key,value){
      if(key==='ih2:river-print:v1')throw new DOMException('Test print write failure','QuotaExceededError');
      return set.call(this,key,value);
     };
    });
    await choice.selectOption('reeds');
    await hit(button('Display print'));
    await expect(page.getByText('The print change could not be saved.')).toBeVisible();
    await expect.poll(art).toBe('bridge');
    expect(await read('ih2:river-print:v1')).toBe('bridge');
   }
   await hit(button('Take print down'));
   await expect(page.getByText('Print taken down.')).toBeVisible();
   await expect.poll(art).toBeNull();
   expect(await read('ih2:river-print:v1')).toBeNull();
   expect(await read('ih2:river-survey:v1')).toBe(record);
   expect(await read('ih2:workshop:v2')).toBe(before);
   expect(errors).toEqual([]);
   expect(api).toEqual([]);
  }finally{await context.close();}
 }
});
