import {test,expect} from '@playwright/test';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {setTimeout as pause} from 'node:timers/promises';
import {paintedStreet,squareAtGate,streetFixture} from '../../tests/helpers/neighborhood-art-fixture.ts';

test('measure square and street artwork with a fixed SVG delay on loopback',async({browser,baseURL})=>{
  const samples=[];
  const svgDelayMs=75;
  for(const viewport of [{width:1440,height:900},{width:320,height:650}]){
    for(let repeat=1;repeat<=3;repeat++){
      const context=await browser.newContext({viewport,baseURL,hasTouch:viewport.width===320,reducedMotion:'reduce'});
      const page=await context.newPage();
      try{
        const fixture=await streetFixture(page);
        let step:'square'|'street'='square';
        const reads:Array<Promise<{step:string;path:string;bytes:number}>>=[];
        page.on('response',response=>{
          const path=new URL(response.url()).pathname;
          if(!path.startsWith('/art/')||!path.endsWith('.svg'))return;
          const stage=step;
          reads.push(response.body().then(body=>({step:stage,path,bytes:body.length})));
        });
        await page.route('**/art/**/*.svg',async route=>{await pause(svgDelayMs);await route.continue();});
        const start=performance.now();
        await squareAtGate(page);
        const squareMs=Math.round(performance.now()-start);
        step='street';
        const gate=page.locator('#interact');
        const streetAt=performance.now();
        if(viewport.width===320)await gate.tap();
        else await gate.click();
        await paintedStreet(page);
        const streetMs=Math.round(performance.now()-streetAt);
        const data=await Promise.all(reads);
        const measure=(name:string)=>{
          const files=data.filter(read=>read.step===name);
          return {files:files.length,decodedBytes:files.reduce((n,read)=>n+read.bytes,0),paths:files.map(read=>read.path).sort()};
        };
        expect(fixture.commands).toEqual(['enter-neighborhood']);
        expect(fixture.errors).toEqual([]);
        samples.push({viewport,repeat,squareMs,streetMs,square:measure('square'),street:measure('street')});
      }finally{
        await page.unrouteAll({behavior:'wait'});
        await context.close();
      }
    }
  }
  const root=process.env.IH2_STREET_STATIC_DIR??'dist';
  const indexSha256=createHash('sha256').update(readFileSync(join(root,'index.html'))).digest('hex');
  mkdirSync('test-results/neighborhood-art-study',{recursive:true});
  writeFileSync('test-results/neighborhood-art-study/BOOT_AND_STREET.json',JSON.stringify({
    indexSha256,browser:browser.version(),svgDelayMs,
    method:'Fresh Chromium contexts. Adds 75 ms to each loopback SVG response. Uses the same fictional intercepted town and actual renderer. Measures usable square and painted street, along with response counts and decoded bytes. No bandwidth model, saved service, database, or physical-device measurement.',
    samples,
  },null,2)+'\n');
});
