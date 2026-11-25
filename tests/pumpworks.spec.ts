import {expect,test,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {PUMPWORKS_FRONT,HOPPER_FEET} from '../src/game/pumpworks-room.ts';
import type {BowDraw,BowTrace} from '../src/game/field-weapons.ts';
import type {PumpworksState} from '../src/game/pumpworks.ts';
import {HOPPER_MOVEMENT,type FieldImpact,type HopperMotion} from '../src/game/pumpworks-chase.ts';
import type {Point} from '../src/game/world.ts';

const output=process.env.QA_EVIDENCE_DIR??'test-results/browser';
const close=(page:Page)=>page.getByRole('button',{name:'Close panel',exact:true});
type Pilot={
 snapshot():{room:string;nearby:string|null;position:Point;walking:boolean};
 pumpworks():PumpworksState;
 pumpworksMotion():{hopper:HopperMotion;impact:FieldImpact|null;draw:BowDraw|null;shot:BowTrace|null;enemyHealth:number|null};
 screenPoint(x:number,y:number):Point;
 metrics():{visual:{workshopPrint:string|null;fieldEquipment:{vest:boolean;kerchief:string|null}}};
};
const read=(page:Page)=>page.evaluate(()=>{
 const pilot=(window as Window&{__pilot?:Pilot}).__pilot;
 return pilot?{...pilot.snapshot(),state:pilot.pumpworks(),combat:pilot.pumpworksMotion()}:null;
});

for(const shape of [{name:'desktop',width:1440,height:900,text:100,touch:false},{name:'phone',width:320,height:640,text:100,touch:true},{name:'short200',width:844,height:390,text:200,touch:true}]){
 test('Pumpworks real-time chase, dodge, equipment and field seal · '+shape.name,async({browser,browserName})=>{
  test.setTimeout(120000);
  mkdirSync(output,{recursive:true});
  const recording=process.env.QA_RECORD_PUMPWORKS==='1'&&shape.name==='phone'?{dir:output+'/raw-motion',size:{width:320,height:640}}:undefined;
  const context=await browser.newContext({viewport:{width:shape.width,height:shape.height},hasTouch:shape.touch,recordVideo:recording});
  const page=await context.newPage();
  const errors:string[]=[],requests:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))requests.push(request.url());});
  const button=(name:string)=>page.getByRole('button',{name,exact:true});
  const press=async(name:string)=>{if(shape.touch)await button(name).tap();else await button(name).click();};
  const capture=(id:string)=>page.screenshot({path:output+'/pumpworks-'+shape.name+'-'+id+'.png'});
  const walk=async(id:string)=>{
   await press('Places');
   const destination=page.locator('[data-destination="'+id+'"]');
   if(shape.touch)await destination.tap();else await destination.click();
  };
  const station=async(id:string)=>{
   await walk(id);
   await expect.poll(async()=>(await read(page))?.nearby,{timeout:23000}).toBe(id);
   await page.locator('#interact').click();
  };
  async function ready(room:string){
   await expect(page.locator('canvas')).toBeVisible();
   await expect(page.locator('#location')).toHaveAttribute('data-room',room);
   await page.evaluate(text=>document.documentElement.style.fontSize=text+'%',shape.text);
  }
  async function move(point:Point){
   const position=await page.evaluate(point=>(window as Window&{__pilot?:Pilot}).__pilot!.screenPoint(point.x,point.y),point);
   const canvas=page.locator('canvas');
   if(shape.touch)await canvas.tap({position});else await canvas.click({position});
  }
  async function drag(point:Point){
   if(browserName!=='chromium'){await move(point);return;}
   const device=await context.newCDPSession(page);
   const canvas=(await page.locator('canvas').boundingBox())!;
   const {position}=(await read(page))!;
   const dx=point.x-position.x,dy=point.y-position.y,length=Math.hypot(dx,dy);
   const x=canvas.x+canvas.width*.46,y=canvas.y+canvas.height*.58;
   try{
    await device.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y}]});
    await device.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:x+38*dx/length,y:y+38*dy/length}]});
    const ring=page.locator('.field-touch-ring');
    await expect(ring).toBeVisible();
    const brace=(await button('Brace').boundingBox())!;
    // A second thumb can brace without canceling the live steering gesture.
    await device.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[
     {id:1,x:x+38*dx/length,y:y+38*dy/length},
     {id:2,x:brace.x+brace.width/2,y:brace.y+brace.height/2},
    ]});
    await expect.poll(async()=>(await read(page))!.combat.hopper.guard,{timeout:450,intervals:[20]}).toBeGreaterThan(0);
    await expect(ring).toBeVisible();
    await capture('steering');
    await expect.poll(async()=>{
     const live=(await read(page))!.position;
     return (live.x-position.x)*dx/length+(live.y-position.y)*dy/length;
    },{timeout:950,intervals:[20]}).toBeGreaterThan(length-.13);
   }finally{
    await device.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await device.detach();
   }
   await expect(page.locator('.field-touch-ring')).toBeHidden();
  }
  async function outmaneuver(){
   await expect.poll(async()=>(await read(page))?.combat.hopper.phase,{timeout:7500,intervals:[35]}).toBe('windup');
   const before=(await read(page))!;
   const {aim,origin}=before.combat.hopper;
   const vector={x:aim!.x-origin!.x,y:aim!.y-origin!.y};
   const magnitude=Math.hypot(vector.x,vector.y)||1;
   const perpendicular={x:vector.y/magnitude,y:-vector.x/magnitude};
   const points=[1,-1].map(s=>({x:aim!.x+perpendicular.x*1.45*s,y:aim!.y+perpendicular.y*1.45*s}));
   const target=points.find(p=>p.x>13&&p.x<18.9&&p.y>4.7&&p.y<12.3)??{x:15,y:6.4};
   await move(target);
   await expect.poll(async()=>(await read(page))?.combat.hopper.phase,{timeout:4500,intervals:[35]}).toBe('recover');
   expect((await read(page))!.state.health).toBe(before.state.health);
  }
  async function fight(){
   for(let turns=0;turns<48;turns++){
    const live=(await read(page))!;
    if(live.state.cleared)return;
    expect(live.room).toBe('pumpworks');
    if(live.combat.hopper.phase==='windup'&&live.combat.hopper.braceCooldown===0){
     if(shape.touch)await press('Brace');else await page.keyboard.press('Shift');
    }
    if(live.state.oatcake==='packed'&&live.state.health<=5&&live.state.satchel==='carried'&&await button('Eat oatcake · +3 health').isEnabled()){
     await press('Eat oatcake · +3 health');
    }
    const feet=live.combat.hopper.feet;
    const dx=live.position.x-feet.x,dy=live.position.y-feet.y;
    const distance=Math.hypot(dx,dy);
    if(distance>HOPPER_MOVEMENT.reach&&live.combat.hopper.phase==='recover'){
     await move({x:feet.x+dx/distance*1.1,y:feet.y+dy/distance*1.1});
    }else if(distance<=HOPPER_MOVEMENT.reach&&await button('Strike').isEnabled()){
     if(shape.touch)await press('Strike');else await page.keyboard.press('Space');
    }
    await page.waitForTimeout(130);
   }
   expect((await read(page))!.state.cleared).toBe(true);
  }
  try{
   // Only starting feet and cosmetic lighting are seeded. Enemy motion and
   // actions use the real browser clock with no API or action interception.
   await page.addInitScript(point=>{
    if(!localStorage.getItem('ih2:pilot-position:v1')){
     localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'square',position:point}));
    }
   },PUMPWORKS_FRONT);
   await page.goto('/?sky-study=1&phase=day&weather=clear');
   await ready('square');
   const workshop=await page.evaluate(()=>localStorage.getItem('ih2:workshop:v2'));
   await capture('hatch');
   await press('Enter the Pumpworks');
   await ready('pumpworks');
   await expect(page.locator('#pump-health')).toContainText('Health 8 / 8');
   const patrolStart=(await read(page))!.combat.hopper.feet;
   await expect.poll(async()=>{
    const live=(await read(page))!;
    expect(live.state.fight).toBeNull();
    const feet=live.combat.hopper.feet;
    return Math.hypot(feet.x-patrolStart.x,feet.y-patrolStart.y);
   },{timeout:3500,intervals:[55]}).toBeGreaterThan(.12);
   await capture('arrival');
   await station('pumpworks-locker');
   await press('Equip rod and take kit');
   await expect(page.locator('[data-pumpworks=locker]')).toContainText('Sounding rod equipped.');
   expect((await read(page))!.state.rod).toBe('equipped');
   if(shape.name==='desktop'){
    await press('Open Bag');
    await expect(page.locator('[data-bag-pocket=equipment]')).toHaveAttribute('aria-pressed','true');
    const gear=page.getByRole('list',{name:'Equipment'}).locator('[data-pump-bag]');
    await expect(gear.locator('.bag-stack-count')).toHaveText('1');
    await expect(gear).toContainText('Equipped');
    await press('Pack sounding rod');
    await expect(gear).toContainText('Packed');
    await press('Equip sounding rod');
    await expect(gear).toContainText('Equipped');
    await capture('bag');
   }
   await close(page).click();

   await walk('pumpworks-bell');
   await expect.poll(async()=>(await read(page))?.nearby).toBe('pumpworks-bell');
   await expect(page.locator('#pump-controls')).toContainText('Try a swing');
   const beforePractice=(await read(page))!.state;
   if(shape.touch)await press('Strike');else await page.keyboard.press('Space');
   await expect.poll(async()=>(await read(page))?.combat.impact?.kind,{intervals:[20]}).toBe('bell');
   expect((await read(page))!.state).toEqual(beforePractice);
   await expect(page.locator('dialog')).toBeHidden();
   await capture('practice');

   await walk('pumpworks-hopper');
   await expect.poll(async()=>(await read(page))?.combat.hopper.phase,{timeout:15000,intervals:[40]}).toBe('windup');
   const first=(await read(page))!;
   expect(first.combat.hopper.feet).not.toEqual(HOPPER_FEET);
   await expect(page.locator('dialog')).toBeHidden();
   await capture('lunge');
   if(shape.name==='short200'){
    for(const name of ['Strike','Brace','Eat oatcake · +3 health','Places','Bag','Journal'])await expect(button(name)).toBeInViewport({ratio:1});
    await expect(page.locator('#interact')).toBeInViewport({ratio:1});
    expect(await page.locator('canvas').evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThan(145);
    // Deliver lifecycle events without depending on headless window management.
    await page.evaluate(()=>{
     document.dispatchEvent(new Event('freeze'));
     window.dispatchEvent(new Event('blur'));
    });
    const frozen=(await read(page))!;
    await page.waitForTimeout(1400);
    await page.evaluate(()=>document.dispatchEvent(new Event('resume')));
    await page.waitForTimeout(160);
    const unfocused=(await read(page))!;
    expect(unfocused.combat.hopper).toEqual(frozen.combat.hopper);
    expect(unfocused.state).toEqual(frozen.state);
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await expect.poll(async()=>(await read(page))!.combat.hopper).not.toEqual(frozen.combat.hopper);
    await press('Journal');
    const paused=(await read(page))!;
    await page.setViewportSize({width:820,height:390});
    await page.waitForTimeout(1350);
    const afterResize=(await read(page))!;
    expect(afterResize.combat.hopper).toEqual(paused.combat.hopper);
    expect(afterResize.state).toEqual(paused.state);
    const canvas=page.locator('canvas');
    await expect(canvas).toBeInViewport({ratio:1});
    await close(page).tap();
    await expect.poll(async()=>(await read(page))!.combat.hopper).not.toEqual(paused.combat.hopper);
   }
   if(shape.name==='desktop'){
    await move({x:12.45,y:11.55});
    await expect.poll(async()=>(await read(page))?.state.fight,{timeout:4500}).toBeNull();
    await expect(page.locator('#pump-controls')).toContainText('Cross the bridge');
    await capture('retreat');
    await walk('pumpworks-hopper');
    await expect.poll(async()=>(await read(page))?.combat.hopper.phase,{timeout:11000,intervals:[40]}).toBe('windup');
    await expect.poll(async()=>(await read(page))?.state.health,{intervals:[30]}).toBe(5);
    await page.keyboard.press('f');
    await expect.poll(async()=>(await read(page))?.combat.impact?.kind,{intervals:[20]}).toBe('heal');
    const restored=(await read(page))!.state;
    expect(restored.health).toBe(8);
    expect(restored.oatcake).toBe('used');
    await capture('heal');
    await expect(button('Eat oatcake · +3 health')).toBeDisabled();
    // Standing still through several lunges is a genuine loss condition.
    await expect(page.locator('[data-pumpworks=bed]')).toBeVisible({timeout:19000});
    await ready('lodging');
    await page.reload();
    await ready('lodging');
    await expect(page.locator('#pump-health')).toContainText('Health 0 / 8');
    await capture('bed');
    await press('Get up and recover');
    await expect(page.locator('[data-pumpworks=bed]')).toContainText('Health restored');
    await close(page).click();
    await station('lodging-exit');
    await ready('square');
    await page.locator('#journal').click();
    await expect(button('Walk to the Pumpworks')).toBeVisible();
    await press('Walk to the Pumpworks');
    await expect(page.locator('#location')).toHaveAttribute('data-room','pumpworks',{timeout:45000});
    await ready('pumpworks');
    await station('pumpworks-cache');
    await press('Recover your field satchel');
    await expect(page.locator('[data-pumpworks=cache]')).toContainText('Field satchel recovered');
    await close(page).click();
    await walk('pumpworks-hopper');
    await expect.poll(async()=>(await read(page))?.state.fight,{timeout:14000}).not.toBeNull();
   }else if(shape.name==='phone'){
    await outmaneuver();
    await capture('opening');
    const before=(await read(page))!.combat.enemyHealth!;
    await press('Strike');
    await expect.poll(async()=>(await read(page))?.combat.enemyHealth,{intervals:[25]}).toBe(before-4);
    expect((await read(page))!.combat.impact?.kind).toBe('counter');
    await capture('counter');
    await expect(page.getByRole('meter',{name:'Silt hopper health'})).toHaveJSProperty('value',before-4);
    expect((await read(page))!.combat.hopper.counterUsed).toBe(true);
    await expect.poll(async()=>(await read(page))?.combat.hopper.strikeCooldown,{intervals:[25]}).toBe(0);
    await press('Strike');
    await expect.poll(async()=>(await read(page))?.combat.enemyHealth,{intervals:[25]}).toBe(before-5);
    await capture('after-dodge');
    await expect.poll(async()=>{
     const motion=(await read(page))?.combat.hopper;
     return motion?.phase==='windup'?motion.pattern:null;
    },{timeout:7500,intervals:[40]}).toBe('splash');
    const start=(await read(page))!;
    const center=start.combat.hopper.aim!;
    const radius=HOPPER_MOVEMENT.splashRadius+.4;
    const target=Array.from({length:8},(_,index)=>({
     x:center.x+Math.cos(index*Math.PI/4)*radius,
     y:center.y+Math.sin(index*Math.PI/4)*radius,
    })).filter(p=>p.x>13&&p.x<18.9&&p.y>4.7&&p.y<12.3).sort((a,b)=>
     Math.hypot(a.x-start.position.x,a.y-start.position.y)-Math.hypot(b.x-start.position.x,b.y-start.position.y)
    )[0];
    await capture('splash');
    await drag(target);
    await expect.poll(async()=>(await read(page))?.combat.hopper.phase,{timeout:4500,intervals:[35]}).toBe('recover');
    expect((await read(page))!.state.health).toBe(start.state.health);
   }
   await fight();
   await station('pumpworks-report');
   await press('Take the field seal');
   await close(page).click();
   await press('Journal');
   await expect(page.locator('[data-pump-journal]')).toContainText('Field seal');
   await capture('seal');
   expect(await page.locator('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
   if(shape.name==='phone'){
    expect(await page.evaluate(()=>localStorage.getItem('ih2:river-print:v1'))).toBeNull();
    await press('Preview field seal');
    await expect(page.getByLabel('Choose a workshop print')).toHaveValue('pumpworks-seal');
    const preview=page.locator('.workshop-print-preview');
    await expect(preview).toHaveAttribute('src','/art/pumpworks/field-seal.svg');
    await expect.poll(()=>preview.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
    await capture('seal-preview');
    await press('Display print');
    await expect(page.getByText('On display · Pumpworks inspection seal')).toBeVisible();
    await press('See it in the workshop');
    await expect(page.locator('#location')).toHaveAttribute('data-room','workshop',{timeout:60000});
    const display=()=>page.evaluate(()=>(window as Window&{__pilot?:Pilot}).__pilot?.metrics().visual.workshopPrint);
    await expect.poll(display).toBe('pumpworks-seal');
    await capture('workshop-seal');
    await page.reload();
    await ready('workshop');
    await expect.poll(display).toBe('pumpworks-seal');
    await press('Journal');
    await press('Preview field seal');
    await expect(page.getByText('On display · Pumpworks inspection seal')).toBeVisible();
    await press('Take print down');
    await expect(page.getByText('No print on display.')).toBeVisible();
    await expect(page.getByLabel('Choose a workshop print').locator('option[value="pumpworks-seal"]')).toHaveCount(1);
   }
   if(shape.name==='desktop'){
    await close(page).click();
    await station('pumpworks-bench');
    await press('Start a rematch');
    await expect(page.locator('[data-pumpworks=bench]')).toContainText('The hopper is patrolling again');
    await close(page).click();
    await page.reload();
    await ready('pumpworks');
    expect((await read(page))!.state).toMatchObject({reported:true,cleared:false,rematch:true,oatcake:'used'});
    await walk('pumpworks-hopper');
    await expect.poll(async()=>(await read(page))?.state.fight,{timeout:13000}).not.toBeNull();
    await fight();
    expect((await read(page))!.state).toMatchObject({reported:true,cleared:true,rematch:false,oatcake:'used'});
    await press('Journal');
    await expect(button('Preview field seal')).toBeVisible();
    await capture('rematch-seal');
   }
   expect(await page.evaluate(()=>localStorage.getItem('ih2:workshop:v2'))).toEqual(workshop);
   expect(requests).toEqual([]);
   expect(errors).toEqual([]);
  }finally{
   const video=page.video();
   await context.close();
   if(video)await video.saveAs(output+'/pumpworks-phone-playthrough.webm');
  }
 });
}

test('Pausing while a lunge is waiting to save preserves the pending contact',async({page})=>{
 const feet={x:15,y:9};
 await page.addInitScript(position=>{
  if(localStorage.getItem('ih2:pumpworks:v1'))return;
  localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'pumpworks',position}));
  localStorage.setItem('ih2:pumpworks:v1',JSON.stringify({
   version:1,revision:1,health:8,rod:'equipped',oatcake:'packed',satchel:'carried',
   fight:{health:9},recovering:false,cleared:false,reported:false,rematch:false,
  }));
 },feet);
 await page.goto('/?sky-study=1&phase=day&weather=clear');
 await expect.poll(async()=>(await read(page))?.combat.hopper.phase,{intervals:[20]}).toBe('windup');
 // Another holder delays the real persistence lock until after focus is lost.
 await page.evaluate(()=>new Promise<void>(acquired=>{
  const harness=window as Window&{releaseCombatLock?:()=>void};
  void navigator.locks.request('ih2:pumpworks:v1',()=>new Promise<void>(released=>{
   harness.releaseCombatLock=released;
   acquired();
  }));
 }));
 await expect.poll(async()=>(await read(page))?.combat.hopper.contact,{intervals:[20]}).toBe(true);
 await page.evaluate(()=>{
  window.dispatchEvent(new Event('blur'));
  (window as Window&{releaseCombatLock?:()=>void}).releaseCombatLock!();
 });
 await expect.poll(async()=>(await read(page))?.combat.hopper.contact,{timeout:1000,intervals:[20]}).toBe(false);
 const paused=(await read(page))!;
 expect(paused.state.health).toBe(8);
 expect(paused.state.revision).toBe(1);
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await expect.poll(async()=>(await read(page))?.state.health,{timeout:850,intervals:[20]}).toBe(5);
 expect((await read(page))!.state.revision).toBe(2);
});

for(const shape of [{width:1440,height:900,touch:false,name:'desktop'},{width:320,height:640,touch:true,name:'phone'}]){
 test('Field bow and vest · ranged shots, armor and a dyed kerchief · '+shape.name,async({browser})=>{
  test.setTimeout(65000);
  mkdirSync(output,{recursive:true});
  const context=await browser.newContext({viewport:{width:shape.width,height:shape.height},hasTouch:shape.touch});
  const page=await context.newPage();
  const button=(name:string)=>page.getByRole('button',{name,exact:true});
  const activate=async(control:ReturnType<typeof button>)=>shape.touch?control.tap():control.click();
  const go=async(id:string)=>{
   await activate(button('Places'));
   await activate(page.locator('[data-destination="'+id+'"]'));
   await expect.poll(async()=>(await read(page))?.nearby,{timeout:14000}).toBe(id);
  };
  const move=async(point:Point)=>{
   const position=await page.evaluate(target=>(window as Window&{__pilot?:Pilot}).__pilot!.screenPoint(target.x,target.y),point);
   const canvas=page.locator('canvas');
   if(shape.touch)await canvas.tap({position});else await canvas.click({position});
  };
  const shoot=()=>shape.touch?activate(button('Shoot')):page.keyboard.press('Space');
  try{
   await page.addInitScript(()=>{
    if(localStorage.getItem('ih2:pilot-position:v1'))return;
    localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'pumpworks',position:{x:5.05,y:9.45}}));
   });
   await page.goto('/?sky-study=1&phase=day&weather=clear');
   await expect(page.locator('#location')).toHaveAttribute('data-room','pumpworks');
   await expect.poll(async()=>(await read(page))?.nearby).toBe('pumpworks-locker');
   await activate(page.locator('#interact'));
   await activate(button('Equip rod and take kit'));
   await activate(button('Borrow padded vest'));
   await expect(page.locator('[data-pumpworks=locker]')).toContainText('Padded vest equipped.');
   await activate(button('Try a field bow'));
   await expect(page.locator('[data-pumpworks=locker]')).toContainText('Field bow equipped.');
   await activate(button('Open Bag'));
   const bow=page.locator('[data-pump-bag=bow]'),rod=page.locator('[data-pump-bag=rod]');
   const vest=page.locator('[data-pump-bag=vest]');
   await expect(vest).toContainText('Equipped · 1 Armor');
   await activate(button('Pack padded vest'));
   await expect(vest).toContainText('Packed');
   await activate(button('Equip padded vest'));
   await expect(vest).toContainText('Equipped');
   await expect(bow).toContainText('Equipped');
   await expect(rod).toContainText('Packed');
   for(const item of [bow,rod,vest]){
    await expect.poll(()=>item.locator('.bag-slot-art img').evaluate((image:HTMLImageElement)=>image.naturalWidth)).toBeGreaterThan(0);
   }
   await page.screenshot({path:output+'/field-bow-'+shape.name+'-bag.png'});
   await activate(button('Equip sounding rod'));
   await expect(bow).toContainText('Packed');
   await expect(rod).toContainText('Equipped');
   await activate(button('Equip field bow'));
   await expect(bow).toContainText('Equipped');
   await expect(rod).toContainText('Packed');
   await expect(vest).toContainText('Equipped');
   const kerchief=page.locator('[data-field-kerchief]');
   const color=kerchief.getByLabel('Kerchief color');
   await color.selectOption('fern');
   await expect(kerchief.getByRole('img',{name:'Fern kerchief preview'})).toBeVisible();
   const packedLook=(await read(page))!.state;
   expect(packedLook.kerchief).toBe('none');
   await color.selectOption('indigo');
   expect((await read(page))!.state).toEqual(packedLook);
   await activate(button('Save kerchief'));
   await expect(kerchief).toContainText('Indigo kerchief worn');
   await expect(button('Save kerchief')).toBeDisabled();
   await page.screenshot({path:output+'/field-kerchief-'+shape.name+'-bag.png'});
   await activate(close(page));
   await expect(button('Shoot')).toBeInViewport({ratio:1});
   const layers=()=>page.evaluate(()=>(window as Window&{__pilot?:Pilot}).__pilot?.metrics().visual.fieldEquipment);
   await expect.poll(layers).toEqual({vest:true,kerchief:expect.stringMatching(/:indigo$/)});
   await expect(page.locator('.pump-armor')).toHaveText('Armor 1');
   await expect(page.locator('.pump-armor')).toBeInViewport({ratio:1});

   await go('pumpworks-bell');
   await expect(button('Shoot')).toBeEnabled();
   const practice=(await read(page))!.state;
   await shoot();
   await expect.poll(async()=>(await read(page))?.combat.draw?.practice,{intervals:[15]}).toBe(true);
   await move({x:6.6,y:8.15});
   await expect.poll(async()=>(await read(page))?.combat.draw,{intervals:[20]}).toBeNull();
   expect((await read(page))!.combat.shot).toBeNull();
   expect((await read(page))!.state).toEqual(practice);

   await go('pumpworks-bell');
   await shoot();
   await expect.poll(async()=>(await read(page))?.combat.impact?.kind,{intervals:[20]}).toBe('bell');
   await page.screenshot({path:output+'/field-bow-'+shape.name+'-practice.png'});
   expect((await read(page))!.state).toEqual(practice);

   await go('pumpworks-hopper');
   await expect.poll(async()=>(await read(page))?.combat.hopper.phase,{intervals:[25]}).toBe('windup');
   const windup=(await read(page))!.combat.hopper;
   const vx=windup.aim!.x-windup.origin!.x,vy=windup.aim!.y-windup.origin!.y,length=Math.hypot(vx,vy);
   expect(length).toBeGreaterThan(.3);
   const sidesteps=[1,-1].map(sign=>({x:windup.aim!.x+vy/length*2.4*sign,y:windup.aim!.y-vx/length*2.4*sign}));
   const target=sidesteps.find(p=>p.x>13.1&&p.x<18.8&&p.y>4.75&&p.y<12.1);
   expect(target).toBeDefined();
   await move(target!);
   await expect.poll(async()=>(await read(page))?.combat.hopper.phase,{intervals:[25]}).toBe('recover');
   const before=(await read(page))!;
   const gap=Math.hypot(before.position.x-before.combat.hopper.feet.x,before.position.y-before.combat.hopper.feet.y);
   expect(gap).toBeGreaterThan(HOPPER_MOVEMENT.reach);
   await shoot();
   await expect.poll(async()=>(await read(page))?.combat.impact?.kind,{intervals:[25]}).toBe('counter');
   const after=(await read(page))!;
   expect(after.state.fight?.health).toBe(6);
   expect(after.state.health).toBe(8);
   expect(after.state.revision).toBe(before.state.revision+1);
   await expect(page.locator('dialog')).toBeHidden();
   await page.screenshot({path:output+'/field-bow-'+shape.name+'-ranged.png'});
   await expect.poll(async()=>(await read(page))?.state.health,{timeout:7800,intervals:[25]}).toBe(6);
   await expect(page.locator('#feedback')).toHaveText('Hit by the lunge · lost 2 health.');
   await page.screenshot({path:output+'/padded-vest-'+shape.name+'-hit.png'});
   await page.reload();
   await expect(page.locator('#location')).toHaveAttribute('data-room','pumpworks');
   await expect(button('Shoot')).toBeVisible();
   expect((await read(page))!.state.bow).toBe('equipped');
   await expect(page.locator('.pump-armor')).toHaveText('Armor 1');
   expect((await read(page))!.state.vest).toBe('equipped');
   expect((await read(page))!.state.kerchief).toBe('indigo');
   await expect.poll(layers).toEqual({vest:true,kerchief:expect.stringMatching(/:indigo$/)});
  }finally{await context.close();}
 });
}
