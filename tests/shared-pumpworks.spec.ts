import {test,expect,type Page} from '@playwright/test';
import type {SharedFieldView} from '../src/game/shared-field.ts';
import type {Point} from '../src/game/world.ts';

type Pilot={
 sharedField():SharedFieldView|null;
 snapshot():{room:string;nearby:string|null;position:Point;walking:boolean};
};
const view=(page:Page)=>page.evaluate(()=>(window as Window&{__pilot?:Pilot}).__pilot?.sharedField());
const snapshot=(page:Page)=>page.evaluate(()=>(window as Window&{__pilot?:Pilot}).__pilot?.snapshot());

for(const shape of [
 {member:'Tamsin',width:1440,height:900,touch:false,name:'desktop'},
 {member:'Milo',width:320,height:640,touch:true,name:'phone'},
]){
 test('Shared Pumpworks shows server telegraphs, saves training and keeps a private encounter · '+shape.name,
 async({browser,baseURL},info)=>{
  test.setTimeout(105000);
  const context=await browser.newContext({viewport:{width:shape.width,height:shape.height},hasTouch:shape.touch});
  const page=await context.newPage();
  const errors:string[]=[],fieldStatuses:number[]=[];
  let applied=0;
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{
   if(!response.url().endsWith('/api/town/field'))return;
   fieldStatuses.push(response.status());
   if(response.request().method()==='POST')applied++;
  });
  const button=(name:string)=>page.getByRole('button',{name,exact:true});
  const act=(name:string)=>shape.touch?button(name).tap():button(name).click();
  const walk=async(id:string)=>{
   await act('Places');
   const item=page.locator('[data-destination="'+id+'"]');
   if(shape.touch)await item.tap();else await item.click();
  };
  const shot=(name:string)=>page.screenshot({path:info.outputPath(shape.name+'-'+name+'.png')});
  try{
   // Dedicated fictional residents start outside the hatch with ordinary gear,
   // health and inventory. All movement, field updates and saves are native.
   await page.goto(baseURL+'/?town=1&sky-study=1&phase=day&weather=clear');
   await act(shape.member);
   await expect(page.locator('#location')).toHaveAttribute('data-room','square');
   await expect.poll(async()=>(await snapshot(page))?.nearby).toBe('pumpworks-door');
   await act('Enter the Pumpworks');
   await expect(page.locator('#location')).toHaveAttribute('data-room','pumpworks');
   await expect.poll(async()=>(await view(page))?.encounter,{timeout:15000}).toEqual(expect.any(String));
   await walk('pumpworks-locker');
   await act('Inspect Survey locker');
   await act('Equip rod and take kit');
   await expect.poll(async()=>(await view(page))?.state.rod).toBe('equipped');
   await act('Borrow padded vest');
   await expect.poll(async()=>(await view(page))?.state.vest).toBe('equipped');
   await act('Close panel');
   await walk('pumpworks-bell');
   await expect(page.locator('#pump-controls')).toContainText('Try a swing');
   await act('Strike');
   await expect.poll(async()=>(await view(page))?.impact?.kind,{intervals:[30]}).toBe('bell');
   expect((await view(page))?.state.weaponPractice).toBeUndefined();
   await shot('practice');
   await walk('pumpworks-hopper');
   await expect.poll(async()=>(await view(page))?.hopper.phase,{timeout:18500,intervals:[45]}).toBe('windup');
   const warning=await view(page);
   expect(warning?.hopper.aim).toBeTruthy();
   expect(warning?.playerId).toBe(shape.member==='Milo'?'field-milo':'field-tamsin');
   await shot('lunge');
   if(shape.touch){
    await page.setViewportSize({width:844,height:390});
    for(const name of ['Strike','Brace','Places','Bag','Journal'])await expect(button(name)).toBeInViewport({ratio:1});
    await shot('short');
    await page.setViewportSize({width:320,height:640});
   }
   const started=performance.now();
   while(!(await view(page))?.state.weaponPractice?.rod&&performance.now()-started<16000){
    const live=await view(page);
    if(live?.hopper.phase==='recover'&&await button('Strike').isEnabled()){
     if(shape.touch)await act('Strike');else await page.keyboard.press('Space');
    }
    if(live?.state.health===0)break;
    await page.waitForTimeout(50);
   }
   const marks=(await view(page))?.state.weaponPractice?.rod;
   expect(marks).toBeGreaterThan(0);
   await shot('practice-earned');
   await page.reload();
   await expect.poll(async()=>(await view(page))?.state.weaponPractice?.rod,{timeout:15000}).toBe(marks);
   await expect(page.locator('#location')).toHaveAttribute('data-room','pumpworks');
   expect(await page.evaluate(()=>localStorage.getItem('ih2:pumpworks:v1'))).toBeNull();
   expect(applied).toBeGreaterThanOrEqual(4);
   expect(fieldStatuses.every(status=>status===200)).toBe(true);
   expect(errors).toEqual([]);
  }finally{await context.close();}
 });
}
