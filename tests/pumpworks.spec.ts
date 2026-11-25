import {expect,test,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {PUMPWORKS_FRONT,HOPPER_FEET} from '../src/game/pumpworks-room.ts';
import type {PumpworksState} from '../src/game/pumpworks.ts';
import {HOPPER_MOVEMENT,type FieldImpact,type HopperMotion} from '../src/game/pumpworks-chase.ts';
import type {Point} from '../src/game/world.ts';

const output=process.env.QA_EVIDENCE_DIR??'test-results/browser';
const close=(page:Page)=>page.getByRole('button',{name:'Close panel',exact:true});
type Pilot={
 snapshot():{room:string;nearby:string|null;position:Point;walking:boolean};
 pumpworks():PumpworksState;
 pumpworksMotion():{hopper:HopperMotion;impact:FieldImpact|null;enemyHealth:number|null};
 screenPoint(x:number,y:number):Point;
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
   for(let turns=0;turns<32;turns++){
    const live=(await read(page))!;
    if(live.state.cleared)return;
    expect(live.room).toBe('pumpworks');
    if(live.combat.hopper.phase==='windup'&&live.combat.hopper.braceCooldown===0){
     if(shape.touch)await press('Brace');else await page.keyboard.press('Shift');
    }
    if(live.state.oatcake==='packed'&&live.state.health<=5&&live.state.satchel==='carried'&&await button('Eat oatcake · +3 health').isEnabled()){
     await press('Eat oatcake · +3 health');
    }
    if(await button('Strike').isEnabled()){
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
   await capture('arrival');
   await station('pumpworks-locker');
   await press('Pack the survey kit');
   await press('Open Bag');
   await expect(page.locator('[data-bag-pocket=equipment]')).toHaveAttribute('aria-pressed','true');
   const gear=page.getByRole('list',{name:'Equipment'}).locator('[data-pump-bag]');
   await expect(gear.locator('.bag-stack-count')).toHaveText('1');
   await press('Equip sounding rod');
   await expect(gear).toContainText('Equipped');
   await capture('bag');
   await close(page).click();

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
   }
   if(shape.name==='desktop'){
    await move({x:12.45,y:11.55});
    await expect.poll(async()=>(await read(page))?.state.fight,{timeout:4500}).toBeNull();
    await expect(page.locator('#pump-controls')).toContainText('Cross the bridge');
    await capture('retreat');
    await walk('pumpworks-hopper');
    await expect.poll(async()=>(await read(page))?.combat.hopper.phase,{timeout:11000,intervals:[40]}).toBe('windup');
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
    await expect.poll(async()=>(await read(page))?.combat.impact,{intervals:[25]}).toBeNull();
    await capture('after-dodge');
    await expect.poll(async()=>(await read(page))?.combat.hopper.strikeCooldown,{intervals:[30]}).toBe(0);
    await press('Strike');
    await expect.poll(async()=>(await read(page))?.combat.enemyHealth).toBe(1);
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
