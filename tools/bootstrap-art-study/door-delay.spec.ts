import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {setTimeout as pause} from 'node:timers/promises';

test('measure the first allotment entry with a fixed delay on every SVG response',async({browser})=>{
  const rooms=[];
  const svgDelayMs=75;
  for(const viewport of [{width:1440,height:900},{width:320,height:640}]){
    for(let repeat=1;repeat<=3;repeat++){
      const context=await browser.newContext({viewport,hasTouch:viewport.width===320,reducedMotion:'reduce'});
      try{
        const page=await context.newPage();
        const errors:string[]=[],api:string[]=[];
        let firstDoor=false,bootArt=0,doorArt=0;
        page.on('pageerror',error=>errors.push(error.message));
        page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))api.push(request.url());});
        await page.route('**/art/**/*.svg',async route=>{
          if(firstDoor)doorArt++;else bootArt++;
          await pause(svgDelayMs);
          await route.continue();
        });
        await page.addInitScript(()=>localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({
          version:1,room:'square',position:{x:17,y:37},
        })));
        const start=performance.now();
        await page.goto('/?sky-study=1&phase=day&weather=clear',{waitUntil:'domcontentloaded'});
        await page.waitForFunction(()=>(window as any).__pilot?.metrics().ready===true);
        const bootMs=Math.round(performance.now()-start);
        const canvas=page.locator('canvas');
        const target=await page.evaluate(()=>(window as any).__pilot.screenPoint(17,34.8));
        const before=await page.evaluate(()=>(window as any).__pilot.metrics().presentation.renderedFrames);
        firstDoor=true;
        const doorAt=performance.now();
        if(viewport.width===320)await canvas.tap({position:target});
        else await canvas.click({position:target});
        await page.waitForFunction(frame=>{
          const pilot=(window as any).__pilot,metrics=pilot.metrics();
          return pilot.snapshot().room==='garden'&&metrics.visual.garden.bedTextures.length===3&&
            metrics.presentation.renderedFrames>frame;
        },before);
        const doorMs=Math.round(performance.now()-doorAt);
        expect(errors).toEqual([]);expect(api).toEqual([]);
        rooms.push({viewport,repeat,bootMs,doorMs,bootArt,doorArt});
        await page.unrouteAll({behavior:'wait'});
      }finally{await context.close();}
    }
  }
  const root=process.env.IH2_BOOT_ART_STATIC_DIR??'dist';
  const indexSha256=createHash('sha256').update(readFileSync(join(root,'index.html'))).digest('hex');
  mkdirSync('test-results/bootstrap-art',{recursive:true});
  writeFileSync('test-results/bootstrap-art/DOOR_DELAY.json',JSON.stringify({
    browser:browser.version(),indexSha256,svgDelayMs,
    method:'Each intercepted SVG waits the same extra 75 ms on loopback. Fresh Chromium contexts, only fictional feet at the actual door. Time from navigation to first ready scene and native door action to the first rendered garden. No bandwidth model, database, hosted requests or physical-phone test.',
    rooms,
  },null,2)+'\n');
});
