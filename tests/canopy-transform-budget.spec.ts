import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';

test('nearby canopies retain real movement while stable and offscreen transforms are spared',async({browser})=>{
 const out='test-results/browser/canopy-transform-budget';
 mkdirSync(out,{recursive:true});
 const report=[];
 for(const spec of [
  {name:'desktop',width:1440,height:900,position:{x:24,y:25}},
  {name:'phone',width:320,height:650,position:{x:95.8,y:50.8}},
  {name:'wide2k',width:2560,height:1440,position:{x:24,y:25}},
 ]){
  const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},reducedMotion:'no-preference',hasTouch:spec.name==='phone'});
  try{
   const page=await context.newPage(),errors:string[]=[],api:string[]=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))api.push(r.url());});
   await page.addInitScript(position=>localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'square',position})),spec.position);
   await page.goto('/');
   await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
   const ambient=()=>page.evaluate(()=>{
    const metrics=(window as any).__pilot.metrics();
    return {frame:metrics.presentation.renderedFrames,canopyTransformWrites:metrics.visual.canopyTransformWrites,...metrics.visual.variety.ambient};
   });
   await expect.poll(async()=>(await ambient()).canopyTransformWrites).toBeGreaterThan(0);
   const frames=[];
   for(let i=0;i<5;i++){
    const old=(await ambient()).frame;
    await page.waitForFunction(frame=>(window as any).__pilot.metrics().presentation.renderedFrames>frame,old);
    frames.push(await ambient());
   }
   const count=frames[0].canopies.length,baseline=2*count;
   expect(count).toBeGreaterThan(20);
   expect(frames.every(frame=>frame.canopyTransformWrites>0&&frame.canopyTransformWrites<=count)).toBe(true);
   expect(frames.every(frame=>frame.canopies.some((tree:any)=>tree.offsetX===0))).toBe(true);
   expect(frames[0].canopies.some((tree:any,index:number)=>Math.abs(tree.offsetX-frames[4].canopies[index].offsetX)>.01)).toBe(true);
   expect(frames.flatMap(frame=>frame.canopies).every(tree=>tree.rotation===0&&Math.abs(tree.offsetX)<=2.201)).toBe(true);
   await page.screenshot({path:out+'/'+spec.name+'.png'});
   await page.emulateMedia({reducedMotion:'reduce'});
   await expect.poll(async()=>(await ambient()).canopyTransformWrites).toBe(0);
   expect((await ambient()).canopies.every((tree:any)=>tree.offsetX===0&&tree.rotation===0)).toBe(true);
   await page.emulateMedia({reducedMotion:'no-preference'});
   await expect.poll(async()=>(await ambient()).canopyTransformWrites).toBeGreaterThan(0);
   if(spec.name==='phone'){
    const before=(await ambient()).canopies;
    await page.locator('#places').tap();
    await page.getByRole('searchbox',{name:'Find a place'}).fill('Orchard walk');
    await page.getByRole('region',{name:'Matching places'}).getByRole('button',{name:/Walk to Orchard walk/}).tap();
    await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.snapshot().nearby)).toBe('commons-orchard');
    await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.snapshot().walking)).toBe(false);
    const changed=async()=> {
     const after=(await ambient()).canopies;
     return {
      entered:before.some((tree:any,i:number)=>tree.offsetX===0&&after[i].offsetX!==0),
      left:before.some((tree:any,i:number)=>tree.offsetX!==0&&after[i].offsetX===0),
     };
    };
    await expect.poll(changed).toEqual({entered:true,left:true});
    await page.screenshot({path:out+'/phone-arrived.png'});
   }

   report.push({name:spec.name,width:spec.width,height:spec.height,trees:count,previousWritesPerUpdate:baseline,
    currentWrites:frames.map(frame=>frame.canopyTransformWrites),reducedMotionSteadyWrites:0});
   expect(errors).toEqual([]);
   expect(api).toEqual([]);
  }finally{await context.close();}
 }
 writeFileSync(out+'/observations.json',JSON.stringify({
  scope:'Native browser transform setters. Previous comparison is the exact old loop formula, not a measured timing.',
  samples:report,
 },null,2)+'\n');
});
