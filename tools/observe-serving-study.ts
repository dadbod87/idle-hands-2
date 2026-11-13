import {chromium} from '@playwright/test';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const origin=process.argv[2]??'http://serving-review.localhost:49590/';
const target=new URL(origin);
if(!['127.0.0.1','serving-review.localhost'].includes(target.hostname)||target.protocol!=='http:')throw Error('Only the standalone local art study may be observed.');
const out=resolve(process.argv[3]??'../idle-hands-2-artifacts/serving-study-2026-11-13/native-v1');mkdirSync(out,{recursive:true});
const errors:string[]=[],unexpectedRequests:string[]=[];
const browser=await chromium.launch({channel:'chrome'});
const shapes=[{id:'desktop',width:1160,height:820,text:100,touch:false},{id:'phone320',width:320,height:740,text:100,touch:true},{id:'phone360',width:360,height:640,text:100,touch:true},{id:'phone320text200',width:320,height:740,text:200,touch:true},{id:'short200',width:844,height:390,text:200,touch:true}];
const records=[];
try{
 for(const shape of shapes){
  const context=await browser.newContext({viewport:{width:shape.width,height:shape.height},hasTouch:shape.touch,isMobile:shape.touch,reducedMotion:'no-preference'});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(new URL(request.url()).origin!==target.origin)unexpectedRequests.push(request.url());});
  await page.goto(origin);await page.evaluate(text=>document.documentElement.style.fontSize=text+'%',shape.text);
  const contact=page.locator('#contact');if(shape.touch){await contact.tap();}else{await contact.focus();await page.keyboard.press('Enter');}
  if(await page.locator('.actor').getAttribute('data-column')!=='2')throw Error('Contact did not respond.');
  if(shape.id==='desktop'){
   for(const facing of ['south','north','east','west']){
    await page.locator('#facing').selectOption(facing);await contact.click();await page.locator('.sample').screenshot({path:out+`/contact-${facing}-game.png`});
    await page.locator('#enlarge').check();await page.locator('.sample').screenshot({path:out+`/contact-${facing}-2x.png`});await page.locator('#enlarge').uncheck();
   }
   for(const [background,file]of [['wood','public/art/original/ground-workshop.svg'],['town','public/art/variety/ground-square.svg']]){
    const svg=readFileSync(file,'utf8');
    await page.locator('.sample').evaluate((element,svg)=>{const el=element as HTMLElement;el.style.backgroundImage='url(data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(svg)))+')';el.style.backgroundSize='576px 512px';el.style.backgroundPosition='center bottom';},svg);
    for(const facing of ['south','north','east','west']){await page.locator('#facing').selectOption(facing);await contact.click();await page.locator('.sample').screenshot({path:out+`/contrast-${background}-${facing}.png`});}
   }
   await page.locator('.sample').evaluate(element=>{const el=element as HTMLElement;el.style.backgroundImage='';el.style.backgroundSize='';el.style.backgroundPosition='';});
   await page.locator('#facing').selectOption('south');await page.evaluate(()=>{const w=window as any;w.servingObservation=[];const actor=document.querySelector('.actor')!;w.servingObserver=new MutationObserver(()=>{const column=Number((actor as HTMLElement).dataset.column),records=w.servingObservation;if(records.at(-1)?.column!==column)records.push({column,at:performance.now()});});w.servingObserver.observe(actor,{attributes:true,attributeFilter:['data-column']});});
   await page.locator('#replay').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('#status')?.textContent==='Gesture finished. Back at rest.');
   const timing=await page.evaluate(()=>{const w=window as any;w.servingObserver.disconnect();const records=w.servingObservation;return records.map((r:any)=>({column:r.column,elapsed:r.at-records[0].at}));});
   if(timing.map((r:any)=>r.column).join(',')!=='0,1,2,3,4')throw Error('Unexpected native replay sequence.');
   writeFileSync(out+'/native-timing.json',JSON.stringify({timing,method:'MutationObserver on displayed sprite column during native keyboard-triggered replay, real browser performance clock; no clock override. Scheduling measurements under local regression load, not an FPS guarantee.'},null,2));
   await page.locator('summary').click();await page.locator('details img').screenshot({path:out+'/contact-sheet.png'});
  }
  const controls=[];
  for(const locator of await page.locator('button,select,.preferences label,summary').all()){
   await locator.scrollIntoViewIfNeeded();const box=(await locator.boundingBox())!;
   if(box.height<44||box.x<0||box.x+box.width>shape.width+1)throw Error('Control bounds '+shape.id);
   controls.push({text:await locator.innerText(),...box});
  }
  const words=await page.evaluate(()=>{
   const problems:string[]=[];const walker=document.createTreeWalker(document.querySelector('main')!,NodeFilter.SHOW_TEXT);
   while(walker.nextNode()){
    const node=walker.currentNode;const parent=node.parentElement!;if(parent.closest('option,select,details:not([open])')||!parent.getClientRects().length)continue;
    const text=node.textContent??'';for(const match of text.matchAll(/\S+/g)){const range=document.createRange();range.setStart(node,match.index!);range.setEnd(node,match.index!+match[0].length);for(const rect of range.getClientRects())if(rect.left<0||rect.right>innerWidth+.5)problems.push(match[0]);}
   }return {problems,pageWidth:document.documentElement.scrollWidth,viewport:innerWidth};
  });
  if(words.problems.length||words.pageWidth>words.viewport)throw Error('Word overflow '+shape.id+JSON.stringify(words));
  await page.locator('.sample').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/'+shape.id+'.png',fullPage:true});
  records.push({...shape,controls,words});await context.close();
 }
 if(errors.length||unexpectedRequests.length)throw Error('Browser/network errors');
 const manifest=JSON.parse(readFileSync(resolve(out,'../frozen-v1.json'),'utf8'));const served=[];
 for(const [name,metadata]of Object.entries(manifest.files) as [string,{sha256:string}][]){const response=await fetch(new URL(name,origin));const body=Buffer.from(await response.arrayBuffer());const sha256=createHash('sha256').update(body).digest('hex');if(!response.ok||sha256!==metadata.sha256)throw Error('Frozen HTTP mismatch '+name);served.push({name,status:response.status,sha256,bytes:body.length});}
 writeFileSync(out+'/proof.json',JSON.stringify({classification:'Frozen standalone art study only, no gameplay integration',records,served,errors,unexpectedRequests,disclosure:'Native mouse/keyboard and browser touch taps; viewport/font emulation. No game/API/save data, clock/position/stock/reply interception. Eight contrast captures composite exact accepted ground SVGs behind this standalone actor; they are not actual Phaser world scenes. Not physical devices, Phaser action integration, general accessibility or enjoyment proof.'},null,2));
 console.log('PASS: five native shapes, four-facing game/enlarged captures, bounded real-clock replay and eight exact HTTP bodies.');
}finally{await browser.close();}
