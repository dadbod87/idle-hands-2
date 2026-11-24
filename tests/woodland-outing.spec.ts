import{test,expect}from'@playwright/test';import{mkdirSync,writeFileSync}from'node:fs';import{busyGuidanceFixture}from'./helpers/busy-guidance.ts';
const out='test-results/browser';test.beforeEach(()=>mkdirSync(out,{recursive:true}));
for(const shape of[{name:'desktop',w:1440,h:900,text:100},{name:'phone',w:360,h:640,text:100},{name:'short200',w:844,h:390,text:200}])test('woodland outing: native repair, safe detour and persistent journal '+shape.name,async({browser})=>{
 const context=await browser.newContext({viewport:{width:shape.w,height:shape.h},hasTouch:shape.name==='phone'}),page=await context.newPage(),errors:string[]=[],commands:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/api/'))commands.push(r.url());});
 try{const fixture=busyGuidanceFixture(Date.now());await page.addInitScript(s=>{if(!localStorage.getItem('ih2:workshop:v2')){localStorage.setItem('ih2:workshop:v2',JSON.stringify(s));localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'square',position:{x:48,y:42}}));}},fixture);
 await page.goto('/');await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);await page.evaluate(text=>document.documentElement.style.fontSize=text+'%',shape.text);const original=await page.evaluate(()=>localStorage.getItem('ih2:workshop:v2'));
 const tap=async(selector:string)=>{const target=page.locator(selector);await target.scrollIntoViewIfNeeded();if(shape.name==='phone')await target.tap();else await target.click();};
 await tap('#interact');await expect(page.locator('#panel-title')).toHaveText('Woodland work');await tap('[data-outing-action=start-rope]');await expect(page.locator('.outing-condition')).toContainText('Wind at the bend');await page.screenshot({path:out+'/outing-'+shape.name+'-borrowed.png'});
 await page.getByRole('button',{name:'Woodland bend · direct route',exact:true}).click();await expect(page.locator('#panel-title')).toHaveText('Woodland work',{timeout:20000});await tap('[data-outing-action=cross]');await expect(page.locator('.outing-status')).toContainText('needs a brace');
 await page.getByRole('button',{name:'Marked detour · same waymarker',exact:true}).click();await expect(page.locator('[data-outing-action=detour]')).toBeVisible({timeout:20000});await tap('[data-outing-action=detour]');await page.getByRole('button',{name:'Walk to the leaning waymarker',exact:true}).click();await expect(page.locator('[data-outing-action=align-west]')).toBeVisible({timeout:20000});if(shape.name==='short200'){await expect(page.locator('[data-outing-action=align-west]')).toBeFocused();expect(await page.locator('[data-outing-action=align-west]').evaluate(el=>{const r=el.getBoundingClientRect(),head=document.querySelector('.dialog-head')!.getBoundingClientRect();return r.top>=head.bottom&&r.bottom<=innerHeight-10;})).toBe(true);}
 await tap('[data-outing-action=align-east]');await expect(page.locator('.outing-status')).toContainText('Town is west');if(shape.name==='phone')await tap('[data-outing-action=align-west]');else{await page.locator('[data-outing-action=align-west]').focus();await page.keyboard.press('Enter');}await expect(page.locator('.outing-assembly')).toHaveAttribute('src','/art/outing/post-aligned.svg');await page.reload();await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);await page.evaluate(text=>document.documentElement.style.fontSize=text+'%',shape.text);await tap('#interact');await expect(page.locator('[data-outing-action=pin]')).toBeVisible();await tap('[data-outing-action=pin]');await expect(page.locator('.outing-assembly')).toHaveAttribute('src','/art/outing/post-pinned.svg');await tap('[data-outing-action=secure]');await expect(page.locator('.outing-assembly')).toHaveAttribute('src','/art/outing/post-repaired.svg');await page.screenshot({path:out+'/outing-'+shape.name+'-repaired.png'});
 await page.getByRole('button',{name:'Report back at the desk',exact:true}).click();await expect(page.locator('[data-outing-action=finish]')).toBeVisible({timeout:20000});await tap('[data-outing-action=finish]');await expect(page.getByRole('heading',{name:'Waymarker repaired',exact:true})).toBeVisible();await expect(page.getByText('Woodland journal · 1 repair',{exact:true})).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('ih2:woodland-outing:v1')!).state.journal.length)).toBe(1);expect(await page.evaluate(()=>localStorage.getItem('ih2:workshop:v2'))).toBe(original);
 await page.getByText('Woodland journal · 1 repair',{exact:true}).click();await expect(page.locator('[data-outing-note]').first()).toBeFocused();await expect.poll(()=>page.locator('[data-outing-note]').first().evaluate(el=>{const r=el.getBoundingClientRect(),head=document.querySelector('.dialog-head')!.getBoundingClientRect();return r.top>=head.bottom&&r.bottom<=innerHeight-10;})).toBe(true);await page.screenshot({path:out+'/outing-'+shape.name+'-journal.png'});await tap('[data-outing-action=start-rope]');await expect(page.locator('.outing-condition')).toContainText('Soft bank');await page.getByText('End this outing',{exact:true}).click();await tap('[data-outing-action=leave]');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('ih2:woodland-outing:v1')!).state.journal.length)).toBe(1);expect(await page.locator('dialog').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);expect(commands).toEqual([]);expect(errors).toEqual([]);
 writeFileSync(out+'/outing-'+shape.name+'.json',JSON.stringify({fixture:'Legal elapsed local both-busy/full-stock/completed-marker save and explicit woodland-desk starting feet. Native actual walk, wrong-tool/refusal, detour, all repair steps, reload, return, journal, changed second condition and unfinished leave. No API interception, fake runtime clock or reward grant; browser/text/touch emulation only.',ordinaryRawSaveExact:true,commands,errors},null,2));
 }catch(e){writeFileSync(out+'/outing-'+shape.name+'-failure.json',JSON.stringify({errors,state:await page.evaluate(()=>({metrics:(window as any).__pilot?.metrics(),body:document.body.innerText,position:localStorage.getItem('ih2:pilot-position:v1'),outing:localStorage.getItem('ih2:woodland-outing:v1')})).catch(()=>null)},null,2));throw e;}finally{await context.close();}
});

test('woodland local: native two tabs share one borrowed run and storage failures retry without changing ordinary progress',async({browser})=>{
 const context=await browser.newContext({viewport:{width:360,height:640}});const a=await context.newPage(),b=await context.newPage();
 try{
 await context.addInitScript(()=>{if(!localStorage.getItem('ih2:pilot-position:v1'))localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'square',position:{x:48,y:42}}));const set=Storage.prototype.setItem;(window as any).__outingFailure='';Storage.prototype.setItem=function(k,v){if(k==='ih2:woodland-outing:v1'&&(window as any).__outingFailure==='quota')throw new DOMException('Isolated outing quota fixture','QuotaExceededError');set.call(this,k,v);if(k==='ih2:woodland-outing:v1'&&(window as any).__outingFailure==='after')throw new Error('Isolated write succeeded but response lost');};});
 for(const p of[a,b]){await p.goto('/');await expect.poll(()=>p.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);await p.locator('#interact').click();}
 const original=await a.evaluate(()=>localStorage.getItem('ih2:workshop:v2'));
 await a.evaluate(()=>(window as any).__outingFailure='quota');await a.locator('[data-outing-action=start-brace]').click();await expect(a.locator('[data-outing-action=retry]')).toBeVisible();expect(await a.evaluate(()=>localStorage.getItem('ih2:woodland-outing:v1'))).toBeNull();await a.evaluate(()=>(window as any).__outingFailure='');await a.locator('[data-outing-action=retry]').click();await expect(a.locator('.outing-condition')).toContainText('Borrowed brace');await expect(b.locator('.outing-condition')).toContainText('Borrowed brace');
 await a.evaluate(()=>(window as any).__outingFailure='after');await a.locator('[data-outing-action=borrow-rope]').click();await expect(a.locator('[data-outing-action=retry]')).toBeVisible();await expect(b.locator('.outing-condition')).toContainText('Borrowed rope');await a.evaluate(()=>(window as any).__outingFailure='');await a.locator('[data-outing-action=retry]').click();await expect(a.locator('.outing-condition')).toContainText('Borrowed rope');
 await a.evaluate(()=>{(window as any).__outingBarrier=navigator.locks.request('ih2:woodland-outing-writer:v1',()=>new Promise<void>(resolve=>(window as any).__releaseOutingBarrier=resolve));});
 await expect.poll(()=>a.evaluate(()=>typeof(window as any).__releaseOutingBarrier)).toBe('function');
 await Promise.all([a.locator('[data-outing-action=borrow-brace]').click(),b.locator('[data-outing-action=borrow-brace]').click()]);
 await expect.poll(()=>a.evaluate(async()=>(await navigator.locks.query()).pending?.filter(l=>l.name==='ih2:woodland-outing-writer:v1').length)).toBe(2);await a.evaluate(()=>(window as any).__releaseOutingBarrier());
 await expect.poll(()=>a.evaluate(()=>JSON.parse(localStorage.getItem('ih2:woodland-outing:v1')!).state.revision)).toBe(3);
 const save=await a.evaluate(()=>JSON.parse(localStorage.getItem('ih2:woodland-outing:v1')!));expect(save.state.runs).toBe(1);expect(save.state.revision).toBe(3);expect(save.state.journal).toHaveLength(0);expect(save.receipts.filter((r:any)=>r.ok)).toHaveLength(3);expect(await a.evaluate(()=>localStorage.getItem('ih2:workshop:v2'))).toBe(original);await a.screenshot({path:out+'/outing-two-tab-recovery-phone.png'});
 writeFileSync(out+'/outing-browser-recovery.json',JSON.stringify({syntheticLocalStorageFailureInjection:true,realWebLocksAndStorageEvents:true,fixtureHeldLockQueuesBothNativeActionsBeforeRelease:true,twoNativeTabs:true,quotaAndWriteThenThrowSameCandidateRetry:true,oneRunThreeSuccessfulMutations:true,ordinarySaveExact:true},null,2));
 }finally{await context.close();}
});

test('two distinct woodland repairs unlock an inspectable workshop certificate',async({browser})=>{
 test.setTimeout(90_000);
 const output=process.env.QA_EVIDENCE_DIR??out;
 mkdirSync(output,{recursive:true});
 const context=await browser.newContext({viewport:{width:320,height:640},hasTouch:true});
 try{
  const page=await context.newPage(),errors:string[]=[],requests:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))requests.push(request.url());});
  // Only the starting feet are a fixture. Complete both repairs normally.
  await page.addInitScript(()=>{
   if(!localStorage.getItem('ih2:pilot-position:v1'))localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'square',position:{x:48,y:42}}));
  });
  const ready=()=>expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
  const action=(id:string)=>page.locator('[data-outing-action="'+id+'"]');
  const button=(name:string)=>page.getByRole('button',{name,exact:true});
  const read=(key:string)=>page.evaluate(key=>localStorage.getItem(key),key);
  const certificate=button('Preview certificate for your workshop');
  await page.goto('/?sky-study=1&phase=day&weather=clear');
  await ready();
  const ordinary=await read('ih2:workshop:v2');
  await page.locator('#interact').tap();
  for(const [index,tool] of ['brace','rope'].entries()){
   await action('start-'+tool).tap();
   await button('Woodland bend · direct route').tap();
   await expect(action('cross')).toBeVisible({timeout:20000});
   await action('cross').tap();
   await button('Walk to the leaning waymarker').tap();
   await expect(action('align-west')).toBeVisible({timeout:20000});
   for(const step of ['align-west','pin','secure'])await action(step).tap();
   await button('Report back at the desk').tap();
   await expect(action('finish')).toBeVisible({timeout:20000});
   await action('finish').tap();
   await page.getByText('Woodland journal · '+(index+1)+(index?' repairs':' repair'),{exact:true}).tap();
   if(!index)await expect(certificate).toHaveCount(0);
  }
  await expect(certificate).toBeVisible();
  const outing=await read('ih2:woodland-outing:v1');
  expect(JSON.parse(outing!).state.journal.map((entry:{variant:string})=>entry.variant)).toEqual(['wind','soft-bank']);
  await certificate.tap();
  const picker=page.getByRole('combobox',{name:'Choose a workshop print'});
  await expect(picker).toBeFocused();
  await expect(picker).toHaveValue('woodland-certificate');
  const preview=page.locator('.workshop-print-preview');
  await expect(preview).toHaveAttribute('src','/art/outing/field-certificate.svg');
  expect(await read('ih2:river-print:v1')).toBeNull();
  await button('Display print').tap();
  await expect(page.getByText('Print displayed.',{exact:true})).toBeInViewport({ratio:1});
  await page.screenshot({path:output+'/woodland-certificate-phone.png'});
  await button('See it in the workshop').tap();
  const display=()=>page.evaluate(()=>(window as any).__pilot?.metrics().visual.workshopPrint);
  await expect.poll(display,{timeout:35000}).toBe('woodland-certificate');
  await page.reload();
  await ready();
  await expect.poll(display).toBe('woodland-certificate');
  await page.setViewportSize({width:1440,height:900});
  await page.locator('#places').tap();
  await page.locator('[data-destination=workshop-print]').tap();
  await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.snapshot().nearby)).toBe('workshop-print');
  await page.locator('#interact').press('Enter');
  const inspected=page.getByRole('dialog',{name:'Qualified to point left',exact:true});
  await expect(inspected.getByText('The arrow now reports to you.',{exact:false})).toBeInViewport({ratio:1});
  await page.screenshot({path:output+'/woodland-certificate-desktop.png'});
  expect(await read('ih2:workshop:v2')).toBe(ordinary);
  expect(await read('ih2:woodland-outing:v1')).toBe(outing);
  expect(await read('ih2:river-survey:v1')).toBeNull();
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
 }finally{await context.close();}
});
