import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';

test('profile cold browser-practice SVG loads without changing the game',async({browser})=>{
  const runs=3;
  const samples=[];
  const rooms=[
    {room:'square'},
    {room:'workshop',position:{x:9,y:11}},
    {room:'garden',position:{x:9,y:14}},
    {room:'lodging',position:{x:6.4,y:6.3}},
  ];
  for(const viewport of [{width:1440,height:900},{width:320,height:640}]){
    for(const entry of rooms){
      for(let run=0;run<runs;run++){
        const context=await browser.newContext({viewport,hasTouch:viewport.width===320,reducedMotion:'reduce'});
        try{
          const page=await context.newPage();
          const errors:string[]=[],external:string[]=[],api:string[]=[];
          const reads:Array<Promise<{file:string;bytes:number;beforeReady:boolean}>>=[];
          let ready=false;
          page.on('pageerror',error=>errors.push(error.message));
          page.on('request',request=>{
            const url=new URL(request.url());
            if(url.origin!=='http://127.0.0.1:4320')external.push(url.origin);
            if(url.pathname.startsWith('/api/'))api.push(url.pathname);
          });
          page.on('response',response=>{
            const file=new URL(response.url()).pathname;
            if(!file.startsWith('/art/')||!file.endsWith('.svg'))return;
            const beforeReady=!ready;
            reads.push(response.body().then(body=>({file,bytes:body.length,beforeReady})));
          });
          if(entry.position)await page.addInitScript(fixture=>{
            localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,...fixture}));
          },entry);
          const at=performance.now();
          await page.goto('/?sky-study=1&phase=day&weather=clear',{waitUntil:'domcontentloaded'});
          await page.waitForFunction(()=>(window as any).__pilot?.metrics().ready===true);
          ready=true;
          const readyMs=Math.round(performance.now()-at);
          expect(await page.evaluate(()=>(window as any).__pilot.snapshot().room)).toBe(entry.room);
          await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
          const files=(await Promise.all(reads)).filter(x=>x.beforeReady);
          const families:Record<string,{files:number;decodedBytes:number}>={};
          for(const item of files){
            const key=item.file.split('/')[2];
            const family=families[key]??={files:0,decodedBytes:0};
            family.files++;family.decodedBytes+=item.bytes;
          }
          const names=[...new Set(files.map(file=>file.file))].sort();
          expect(names.length).toBe(files.length);
          expect(names.length).toBeGreaterThan(20);
          expect(errors).toEqual([]);expect(external).toEqual([]);expect(api).toEqual([]);
          samples.push({viewport,room:entry.room,run:run+1,readyMs,files:names.length,
            decodedBytes:files.reduce((sum,file)=>sum+file.bytes,0),families});
        }finally{await context.close();}
      }
    }
  }
  mkdirSync('test-results/bootstrap-art',{recursive:true});
  writeFileSync('test-results/bootstrap-art/COLD_SYNTHETIC.json',JSON.stringify({
    browser:browser.version(),method:'Fresh native Chromium context per sample. Browser practice only, cosmetic clear daytime, disposable loopback static uncompressed files and no saved user data. SVG headers seen before the ready frame. Decoded response lengths, not a hosted-network or device benchmark.',
    samples,
  },null,2)+'\n');
});
