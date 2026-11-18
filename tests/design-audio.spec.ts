import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {createServer,type Server} from 'node:http';
import {readFileSync,mkdirSync,writeFileSync,cpSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {audioStudyFiles,checkAudioStudy} from '../tools/create-audio-study.ts';

// Inspect a real browser graph while deliberately muting its hardware output.
// This is not a listening test or a physical-phone audio test.
test.use({launchOptions:{args:['--mute-audio']}});
let server:Server,base:string;
const out='test-results/browser/audio-study';
const state=(p:Page)=>p.evaluate(()=>(window as any).__audioStudy.state());
test.beforeAll(async()=>{
  expect(checkAudioStudy()).toEqual([]);mkdirSync(out,{recursive:true});
  const allowed=new Set(Object.keys(audioStudyFiles())),root=resolve('docs/evidence/IH2-129/study');
  server=createServer((req,res)=>{
    const name=new URL(req.url!,'http://localhost').pathname.slice(1)||'index.html';
    if(!allowed.has(name)){res.writeHead(404);res.end();return;}
    const mime:Record<string,string>={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.wav':'audio/wav'};
    res.setHeader('Content-Type',mime[extname(name)]!);res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');res.end(readFileSync(resolve(root,name)));
  });
  await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+(server.address()as{port:number}).port+'/';
});
test.afterAll(async()=>{cpSync('docs/evidence/IH2-129/study',out+'/study',{recursive:true});if(server){server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}});

test('audio study: native deliberate playback, keyboard gains and bounded accents use no game/API or optional WAV requests',async({page})=>{
  const requests:string[]=[],errors:string[]=[];page.on('request',r=>requests.push(new URL(r.url()).pathname));page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await expect(page.locator('[data-theme]')).toHaveCount(3);await page.waitForTimeout(200);
  expect((await state(page)).contextState).toBe('none');expect((await state(page)).musicVoices).toBe(0);
  await page.getByRole('button',{name:'Play music',exact:true}).click();await expect.poll(async()=>(await state(page)).mode).toBe('playing');
  expect((await state(page)).contextState).toBe('running');expect((await state(page)).musicVoices).toBe(1);
  await page.locator('#music-volume').focus();await page.keyboard.press('Home');for(let i=0;i<5;i++)await page.keyboard.press('ArrowRight');
  await expect.poll(async()=>(await state(page)).musicVolume).toBe(.05);expect((await state(page)).appliedMusicGain).toBeCloseTo(.05,5);
  let peak=0;for(const b of await page.locator('[data-accent]').all()){await b.click();const s=await state(page);peak=Math.max(peak,s.musicVoices+s.effectVoices);expect(s.effectVoices).toBeLessThanOrEqual(1);}
  expect(peak).toBeLessThanOrEqual(2);await expect.poll(async()=>(await state(page)).effectVoices).toBe(0);
  await page.locator('[data-theme="woodland"]').click();expect((await state(page)).musicVoices).toBe(0);expect((await state(page)).selected).toBe('woodland');
  await page.getByRole('button',{name:'Play music',exact:true}).click();await expect.poll(async()=>(await state(page)).mode).toBe('playing');
  await page.getByRole('button',{name:'Mute all',exact:true}).click();await expect.poll(async()=>(await state(page)).contextState).toBe('suspended');
  expect((await state(page)).musicVoices+(await state(page)).effectVoices).toBe(0);await expect(page.locator('#play')).toBeDisabled();
  await page.getByRole('button',{name:'Unmute',exact:true}).click();expect((await state(page)).musicVoices).toBe(0);
  expect(requests.filter(p=>p.startsWith('/api/')||p.endsWith('.wav'))).toEqual([]);expect(errors).toEqual([]);
  expect(await page.evaluate(()=>localStorage.length)).toBe(0);
  writeFileSync(out+'/controls.json',JSON.stringify({method:'Native Chrome/Chromium UI/AudioContext graph, hardware output deliberately muted. No human/physical-device listening claim.',requests,peakVoices:peak,state:await state(page),errors},null,2));
});

test('audio study: touch choice, rapid cancellation, controlled hidden return and reload stay quiet',async({browser})=>{
  const context=await browser.newContext({viewport:{width:360,height:640},hasTouch:true}),page=await context.newPage();
  try{
    await page.goto(base);await page.locator('[data-theme="home"]').tap();expect((await state(page)).selected).toBe('home');
    const y=()=>page.locator('[data-accent="door"]').evaluate(e=>e.getBoundingClientRect().top+scrollY);
    const before=await y();
    await page.getByRole('button',{name:'Play music',exact:true}).tap();await expect.poll(async()=>(await state(page)).mode).toBe('playing');
    await page.locator('#play').tap();expect((await state(page)).musicVoices).toBe(0);
    expect(await y()).toBe(before);
    await page.locator('#play').tap();await expect.poll(async()=>(await state(page)).mode).toBe('playing');
    await page.evaluate(()=>(window as any).__audioStudy.setHidden(true));await expect.poll(async()=>(await state(page)).contextState).toBe('suspended');
    await page.evaluate(()=>(window as any).__audioStudy.setHidden(false));expect((await state(page)).musicVoices+(await state(page)).effectVoices).toBe(0);
    await page.locator('#play').tap();await expect.poll(async()=>(await state(page)).mode).toBe('playing');
    await page.reload();await expect.poll(async()=>(await state(page)).contextState).toBe('none');expect((await state(page)).musicVoices).toBe(0);
    writeFileSync(out+'/touch.json',JSON.stringify({method:'Native emulated touch; explicit auxiliary controlled visibility API, not native background/device proof. Hardware audio muted.',reloadState:await state(page)},null,2));
  }finally{await context.close();}
});

test('audio study: standalone file opens and plays without using a game, HTTP server or external asset',async({page})=>{
  const network:string[]=[],errors:string[]=[];page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(resolve('docs/evidence/IH2-129/study/index.html')).href);
  await expect(page.locator('[data-theme]')).toHaveCount(3);expect((await state(page)).contextState).toBe('none');
  await page.locator('#play').click();await expect.poll(async()=>(await state(page)).mode).toBe('playing');
  await page.locator('#play').click();expect((await state(page)).musicVoices).toBe(0);
  expect(network).toEqual([]);expect(errors).toEqual([]);
  writeFileSync(out+'/file-open.json',JSON.stringify({standaloneFileOpen:true,network,errors,hardwareOutputMuted:true,humanListening:false},null,2));
});

test('audio study: desktop, phone and short doubled-text layouts keep whole controls, focus and original art',async({page})=>{
  const layouts=[['desktop',1440,900,100],['phone390',390,844,100],['phone360',360,640,100],['phone320',320,640,100],['phone200',360,640,200],['phone320-200',320,640,200],['short',844,390,100],['short200',844,390,200]] as const;
  const checks:unknown[]=[];
  for(const[name,width,height,percent]of layouts){
    await page.setViewportSize({width,height});await page.goto(base);if(percent===200){await page.evaluate(()=>document.documentElement.style.fontSize='200%');await expect(page.locator('body')).toHaveClass('large-text');}
    await expect.poll(()=>page.evaluate(()=>[...document.images].every(img=>img.complete&&img.naturalWidth>0))).toBe(true);
    const problems=await page.evaluate(()=>{
      const errors:string[]=[];if(document.documentElement.scrollWidth>innerWidth)errors.push('document overflow');
      for(const b of document.querySelectorAll<HTMLElement>('button,input,summary,a')){
        if(!b.getClientRects().length)continue;const r=b.getBoundingClientRect();if(r.width<44||r.height<44||r.left<0||r.right>innerWidth+.5)errors.push(b.id+' target');
        if(b.tagName==='INPUT')continue;const walker=document.createTreeWalker(b,NodeFilter.SHOW_TEXT);
        while(walker.nextNode())for(const word of(walker.currentNode.textContent??'').matchAll(/\S+/g)){
          const range=document.createRange();range.setStart(walker.currentNode,word.index!);range.setEnd(walker.currentNode,word.index!+word[0].length);
          if([...range.getClientRects()].some(box=>box.left<r.left-.5||box.right>r.right+.5))errors.push(b.id+' clipped word '+word[0]);
        }
      }
      for(const name of document.querySelectorAll<HTMLElement>('[data-volume-name]')){
        const n=name.getBoundingClientRect(),v=name.nextElementSibling!.getBoundingClientRect();
        if(Math.min(n.right,v.right)>Math.max(n.left,v.left)+.5&&Math.min(n.bottom,v.bottom)>Math.max(n.top,v.top)+.5)errors.push('volume label overlaps percentage');
      }
      return errors;
    });
    expect(problems).toEqual([]);await page.locator('#play').scrollIntoViewIfNeeded();await page.locator('#play').focus();await expect(page.locator('#play')).toBeFocused();
    expect((await state(page)).contextState).toBe('none');
    await page.screenshot({path:out+'/'+name+'.png',fullPage:true});
    if(['desktop','phone360','short200'].includes(name)){const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(axe.violations).toEqual([]);checks.push({name,axeViolations:axe.violations,axeIncomplete:axe.incomplete});}
    else checks.push({name,problems});
  }
  writeFileSync(out+'/layouts.json',JSON.stringify({method:'Eight actual standalone page layouts; doubled DOM text and emulated viewports, not physical devices or sound quality.',checks},null,2));
});
