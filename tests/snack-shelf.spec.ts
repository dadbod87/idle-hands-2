import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {createWorkshop} from '../src/game/live-workshop.ts';
import {BROWSER_ORCHARD_KEY,newOrchard,orchardAction} from '../src/game/orchard.ts';
import {SNACK_OFFER_MS,transferSnack,type SnackShelf} from '../src/game/snack-shelf.ts';
import type {TownSnapshot} from '../src/ui/town-client.ts';

const output='test-results/browser/snack-shelf';
const fixtureAt=1_795_177_400_000;
const parcelId='0b1fea62-0b02-4cdc-b86f-295d7db25b41';

test('café parcel shelf shows full and held pouches and confirms a lost reply with the same request',async({browser})=>{
 mkdirSync(output,{recursive:true});
 for(const size of [
  {name:'desktop',width:1440,height:900,text:100,touch:false},
  {name:'phone',width:320,height:650,text:100,touch:true},
  {name:'short',width:844,height:390,text:200,touch:true},
 ]){
  const context=await browser.newContext({viewport:size,hasTouch:size.touch,reducedMotion:'reduce'});
  try{
   const page=await context.newPage(),errors:string[]=[],commands:Array<Record<string,unknown>>=[];
   const localRaw=JSON.stringify(newOrchard());
   page.on('pageerror',error=>errors.push(error.message));
   await page.clock.setFixedTime(new Date(fixtureAt));
   await page.addInitScript(({key,localRaw})=>{
    localStorage.setItem(key,localRaw);
    class Stream extends EventTarget {
     onopen:((event:Event)=>void)|null=null;
     constructor(){super();queueMicrotask(()=>this.onopen?.(new Event('open')));}
     close(){}
    }
    window.EventSource=Stream as unknown as typeof EventSource;
   },{key:BROWSER_ORCHARD_KEY,localRaw});
   const original={...newOrchard(),picked:6,packed:3,snacks:3,observedAt:fixtureAt};
   let snapshot:TownSnapshot={
    playerId:'sorrel',name:'Sorrel',workshop:createWorkshop(fixtureAt),serverTime:fixtureAt,serverInstance:'parcel-fixture',
    position:{room:'square',position:{x:30,y:22}},quest:{contentVersion:1,awarded:[]},
    bridge:{restored:false,phase:'collecting',contributed:0,target:3},plot:null,plots:[],seasonKey:'fixture',scores:[],
    orchard:original,
    cafe:{credits:0,phase:'collecting',readyAt:null},
   };
   let shelf:SnackShelf={
    outgoing:null,
    incoming:[{id:parcelId,name:'Flint',state:'waiting',placedAt:fixtureAt-16*3_600_000,expiresAt:fixtureAt+8*3_600_000}],
    neighbors:[{id:'flint',name:'Flint'},{id:'jun',name:'Jun'}],
    serverTime:fixtureAt,revision:0,
   };
   expect(shelf.incoming[0].expiresAt-shelf.incoming[0].placedAt).toBe(SNACK_OFFER_MS);
   let reads=0,logged=false;
   await page.route('**/api/town/**',route=>{
    switch(new URL(route.request().url()).pathname.split('/').at(-1)){
    case 'fixtures':return route.fulfill({json:{fixtures:[{id:'sorrel',name:'Sorrel'}]}});
    case 'login':logged=true;return route.fulfill({json:{snapshot}});
    case 'snapshot':return logged?route.fulfill({json:{snapshot}}):route.fulfill({status:401,json:{message:'Choose a resident.'}});
    case 'movement':return route.fulfill({json:{ok:true}});
    case 'snack-shelf':
     reads++;
     return route.fulfill({json:{shelf,playerId:snapshot.playerId,serverInstance:snapshot.serverInstance}});
    case 'command':{
     const command=route.request().postDataJSON();
     commands.push(command);
     const number=commands.length;
     const pantry=snapshot.orchard;
     if(!pantry||pantry==='unavailable')throw new Error('Missing fictional pantry');
     if(number!==3){
      const kind=number===1?'taste':number===2?'accept':'offer';
      const next=kind==='taste'?orchardAction(pantry,{kind:'taste'},fixtureAt):transferSnack(pantry,kind,fixtureAt,false);
      if(!next.ok)throw new Error(next.message);
      const message=kind==='taste'?'Tasted an orchard snack.':kind==='accept'?'Snack added to your pouch.':'Snack left at the shelf.';
      const revision=snapshot.workshop.revision+1;
      snapshot={...snapshot,orchard:next.state,workshop:{...snapshot.workshop,revision,lastMessage:message}};
      shelf={...shelf,revision,...(kind==='accept'?{incoming:[]}:kind==='offer'?{
       outgoing:{id:parcelId,name:'Jun',placedAt:fixtureAt,expiresAt:fixtureAt+SNACK_OFFER_MS,state:'waiting'},
      }:{})};
      if(number===2)return route.abort('connectionfailed');
     }
     return route.fulfill({json:{ok:true,replayed:number===3,snapshot,revision:snapshot.workshop.revision,
      message:snapshot.workshop.lastMessage}});
    }
    default:return route.abort();
    }
   });

   const controls=(name:string)=>page.getByRole('button',{name,exact:true});
   const press=async(name:string)=>{
    if(size.touch)await controls(name).tap();
    else await controls(name).press('Enter');
   };
   await page.goto('/?town=1');
   await controls('Sorrel').click();
   await expect(page.getByRole('dialog')).toBeHidden();
   await page.evaluate(text=>document.documentElement.style.fontSize=text+'%',size.text);
   expect(reads).toBe(0);
   await expect(page.locator('#interact')).toHaveAccessibleName(/café tasting counter/i);
   if(size.touch)await page.locator('#interact').tap();
   else await page.locator('canvas').press('e');
   await press('Visit the parcel shelf');
   await expect(page.getByRole('dialog')).toHaveAccessibleName('Café parcel shelf');
   await expect(page.getByRole('heading',{name:'A snack from Flint'})).toBeVisible();
   await expect(controls('Accept snack')).toBeDisabled();
   await expect(page.getByText('3 available · pouch capacity 3')).toBeVisible();
   const taste=controls('Taste a snack');
   await taste.scrollIntoViewIfNeeded();
   await page.screenshot({path:output+'/'+size.name+'-full.png'});
   await press('Taste a snack');
   await expect(controls('Accept snack')).toBeEnabled();
   await press('Accept snack');
   await expect(page.getByRole('dialog').getByRole('status').filter({hasText:'The reply was interrupted.'})).toBeVisible();
   const retry=controls('Confirm the same request');
   await expect(retry).toBeFocused();
   const box=(await retry.boundingBox())!,head=(await page.locator('.dialog-head').boundingBox())!;
   const dialog=(await page.getByRole('dialog').boundingBox())!;
   const contextText=(await page.getByRole('dialog').getByRole('status').boundingBox())!;
   expect(box.y).toBeGreaterThanOrEqual(head.y+head.height-1);
   if(contextText.y<head.y+head.height-1){
    console.error(size.name,await page.evaluate(()=>{
     const items=['#panel','.dialog-head','#panel-body','.snack-shelf','.snack-shelf-status','[data-snack-shelf] button'];
     return items.map(key=>{
      const el=document.querySelector<HTMLElement>(key)!;
      return [key,el.scrollTop,el.clientHeight,el.scrollHeight,el.getBoundingClientRect().toJSON(),getComputedStyle(el).overflowY];
     });
    }));
    await page.screenshot({path:output+'/'+size.name+'-recovery-failure.png'});
   }
   expect(contextText.y).toBeGreaterThanOrEqual(head.y+head.height-1);
   expect(box.y+box.height).toBeLessThanOrEqual(dialog.y+dialog.height);
   await page.screenshot({path:output+'/'+size.name+'-recovery.png'});
   await press('Confirm the same request');
   await expect(page.getByRole('dialog').getByRole('status').filter({hasText:'Snack added to your pouch.'})).toBeVisible();
   expect(commands[2]).toEqual(commands[1]);
   expect(commands[1]).toMatchObject({kind:'snack-parcel',expectedPlayerId:'sorrel',expectedRevision:1,action:{kind:'accept',parcelId}});
   await expect(page.getByLabel('Choose a neighbor',{exact:true})).toBeVisible();
   await expect(controls('Leave snack')).toBeDisabled();
   await page.getByLabel('Choose a neighbor',{exact:true}).selectOption('jun');
   await press('Leave snack');
   await expect(page.getByRole('heading',{name:'Waiting for Jun'})).toBeVisible();
   await expect(page.getByRole('dialog').locator('time')).toHaveAttribute('datetime',new Date(fixtureAt+SNACK_OFFER_MS).toISOString());
   await expect(page.getByText('2 available · 1 on hold · pouch capacity 3')).toBeVisible();
   expect(reads).toBe(4);
   await controls('Take back snack').scrollIntoViewIfNeeded();
   await expect(controls('Take back snack')).toBeInViewport();
   await page.screenshot({path:output+'/'+size.name+'-left.png'});
   expect(await page.evaluate(key=>localStorage.getItem(key),BROWSER_ORCHARD_KEY)).toBe(localRaw);
   expect(await page.getByRole('dialog').evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
   expect(errors).toEqual([]);
  }finally{await context.close();}
 }
});

test('a collection deadline preserves the selected neighbor and focus when the parcel expires', async ({browser}) => {
 const context=await browser.newContext({viewport:{width:320,height:650},hasTouch:true,timezoneId:'UTC',locale:'en-US'});
 try{
  const page=await context.newPage();
  await page.clock.install({time:new Date(fixtureAt)});
  await page.addInitScript(()=>{
   class Stream extends EventTarget{
    onopen:((event:Event)=>void)|null=null;
    constructor(){super();queueMicrotask(()=>this.onopen?.(new Event('open')));}
    close(){}
   }
   window.EventSource=Stream as unknown as typeof EventSource;
  });
  const expiry=fixtureAt+60_000;
  const snapshot:TownSnapshot={
   playerId:'sorrel',name:'Sorrel',workshop:createWorkshop(fixtureAt),serverTime:fixtureAt,serverInstance:'parcel-deadline-fixture',
   position:{room:'square',position:{x:30,y:22}},quest:{contentVersion:1,awarded:[]},
   bridge:{restored:false,phase:'collecting',contributed:0,target:3},plot:null,plots:[],seasonKey:'fixture',scores:[],
   orchard:{...newOrchard(),picked:2,packed:1,snacks:1,observedAt:fixtureAt},
   cafe:{credits:0,phase:'collecting',readyAt:null},
  };
  const shelf:SnackShelf={
   outgoing:null,incoming:[{id:parcelId,name:'Flint',state:'waiting',placedAt:expiry-SNACK_OFFER_MS,expiresAt:expiry}],
   neighbors:[{id:'jun',name:'Jun'}],serverTime:fixtureAt,revision:0,
  };
  let logged=false,reads=0,commands=0;
  await page.route('**/api/town/**',route=>{
   switch(new URL(route.request().url()).pathname.split('/').at(-1)){
   case 'fixtures':return route.fulfill({json:{fixtures:[{id:'sorrel',name:'Sorrel'}]}});
   case 'login':logged=true;return route.fulfill({json:{snapshot}});
   case 'snapshot':return logged?route.fulfill({json:{snapshot}}):route.fulfill({status:401,json:{message:'Choose a resident.'}});
   case 'movement':return route.fulfill({json:{ok:true}});
   case 'snack-shelf':reads++;return route.fulfill({json:{shelf,playerId:snapshot.playerId,serverInstance:snapshot.serverInstance}});
   case 'command':commands++;return route.abort();
   default:return route.abort();
   }
  });
  await page.goto('/?town=1');
  await page.getByRole('button',{name:'Sorrel',exact:true}).click();
  const counter=page.locator('#interact');
  await expect(counter).toHaveAccessibleName(/café tasting counter/i);
  await counter.tap();
  await page.getByRole('button',{name:'Visit the parcel shelf'}).tap();
  const panel=page.getByRole('dialog',{name:'Café parcel shelf'});
  const deadline=panel.locator('time');
  await expect(deadline).toHaveAttribute('datetime',new Date(expiry).toISOString());
  await expect(deadline).toHaveText(new Intl.DateTimeFormat('en-US',{weekday:'short',hour:'numeric',minute:'2-digit',timeZone:'UTC'}).format(expiry));
  const select=panel.getByLabel('Choose a neighbor',{exact:true});
  await select.selectOption('jun');
  await select.focus();
  await expect(select).toBeFocused();
  await page.clock.fastForward(61_000);
  await expect(panel.getByRole('heading',{name:'A snack from Flint'})).toHaveCount(0);
  await expect(deadline).toHaveCount(0);
  await expect(select).toHaveValue('jun');
  await expect(select).toBeFocused();
  await expect(panel.getByRole('button',{name:'Leave snack'})).toBeEnabled();
  expect(reads).toBe(1);
  expect(commands).toBe(0);
  await page.screenshot({path:output+'/deadline-after.png'});
 }finally{await context.close();}
});

test('Journal checks private café parcels on request and links to the real counter', async ({browser, baseURL}) => {
 const context=await browser.newContext({viewport:{width:320,height:650},hasTouch:true,reducedMotion:'reduce',baseURL});
 try {
  const page=await context.newPage();
  const now=Date.now();
  const position={room:'square' as const,position:{x:30,y:25}};
  const snapshot:TownSnapshot={
   playerId:'sorrel',name:'Sorrel',workshop:createWorkshop(now),serverTime:now,serverInstance:'journal-parcels-fixture',
   position,quest:{contentVersion:1,awarded:[]},bridge:{restored:false,phase:'collecting',contributed:0,target:3},
   plot:null,plots:[],seasonKey:'fixture',scores:[],orchard:null,cafe:{credits:0,phase:'collecting',readyAt:null},
  };
  const shelf:SnackShelf={
   outgoing:null,incoming:[{id:parcelId,name:'Flint',state:'waiting',placedAt:now,expiresAt:now+SNACK_OFFER_MS}],
   neighbors:[{id:'flint',name:'Flint'}],serverTime:now,revision:0,
  };
  let logged=false,reads=0,commands=0;
  await page.addInitScript(()=>{
   class Stream extends EventTarget {
    onopen:((event:Event)=>void)|null=null;
    constructor(){super();queueMicrotask(()=>this.onopen?.(new Event('open')));}
    close(){}
   }
   window.EventSource=Stream as unknown as typeof EventSource;
  });
  await page.route('**/api/town/**',route=>{
   switch(new URL(route.request().url()).pathname.split('/').at(-1)){
    case 'fixtures':return route.fulfill({json:{fixtures:[{id:'sorrel',name:'Sorrel'}]}});
    case 'login':logged=true;return route.fulfill({json:{snapshot}});
    case 'snapshot':return logged?route.fulfill({json:{snapshot}}):route.fulfill({status:401,json:{message:'Choose a resident.'}});
    case 'movement':return route.fulfill({json:{ok:true}});
    case 'snack-shelf':
     reads++;
     if(reads===1)return route.fulfill({status:503,json:{message:'The shelf is busy.'}});
     return route.fulfill({json:{shelf,playerId:snapshot.playerId,serverInstance:snapshot.serverInstance}});
    case 'command':commands++;return route.abort();
    default:return route.abort();
   }
  });
  await page.goto('/?town=1');
  const dialog=page.getByRole('dialog');
  const close=page.getByRole('button',{name:'Close panel'});
  await page.getByRole('button',{name:'Sorrel',exact:true}).click();
  await expect(dialog).toBeHidden();
  await page.locator('#journal').tap();
  const checkNote=page.getByRole('button',{name:'Check for café parcels',exact:true});
  await expect(checkNote).toBeEnabled();
  expect(reads).toBe(0);
  await checkNote.tap();
  await expect(dialog).toHaveAccessibleName('Café parcels');
  await expect(close).toBeFocused();
  await expect(dialog.getByRole('status')).toHaveText('The parcel shelf could not be checked.');
  expect(reads).toBe(1);
  await dialog.getByRole('button',{name:'Check again',exact:true}).tap();
  await expect(dialog.getByRole('status')).toHaveText('One snack was waiting for you.');
  await expect(dialog.getByText('Flint')).toHaveCount(0);
  expect(reads).toBe(2);
  const walk=dialog.getByRole('button',{name:'Walk to the café',exact:true});
  for(const [name,width,height,text] of [['phone',320,650,100],['desktop',1440,900,100],['short',844,390,200]] as const){
   await page.setViewportSize({width,height});
   await page.evaluate(size=>{document.documentElement.style.fontSize=size+'%';},text);
   const panelBounds=(await dialog.boundingBox())!;
   const titleBounds=(await page.locator('.dialog-head').boundingBox())!;
   for(const button of [walk,dialog.getByRole('button',{name:'Check again',exact:true})]) {
    await expect(button).toBeInViewport();
    const bounds=(await button.boundingBox())!;
    expect(bounds.height).toBeGreaterThanOrEqual(44);
    expect(bounds.y).toBeGreaterThanOrEqual(titleBounds.y+titleBounds.height);
    expect(bounds.y+bounds.height).toBeLessThanOrEqual(panelBounds.y+panelBounds.height);
   }
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:output+'/journal-note-'+name+'.png'});
  }
  await page.setViewportSize({width:320,height:650});
  await page.evaluate(()=>{document.documentElement.style.fontSize='100%';});
  await walk.tap();
  await expect(dialog.getByRole('button',{name:'Visit the parcel shelf'})).toBeVisible({timeout:20000});
  expect(reads).toBe(2);
  await dialog.getByRole('button',{name:'Visit the parcel shelf'}).tap();
  await expect(dialog.getByRole('heading',{name:'A snack from Flint'})).toBeVisible();
  expect(reads).toBe(3);
  expect(commands).toBe(0);

  const local=await context.newPage();
  await local.goto('/');
  await local.locator('#journal').tap();
  await expect(local.getByRole('dialog')).toHaveAccessibleName('Journal');
  await expect(local.getByRole('button',{name:'Check for café parcels'})).toHaveCount(0);
 } finally {
  await context.close();
 }
});
