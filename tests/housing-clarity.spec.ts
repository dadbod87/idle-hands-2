import{test,expect,type Page}from'@playwright/test';import{mkdirSync,writeFileSync}from'node:fs';import{createWorkshop}from'../src/game/live-workshop.ts';import{emptyWorkroom}from'../src/game/home-layout.ts';
const out='test-results/browser';
async function fixture(p:Page,mode:'claim'|'owner'|'visitor'){
 const owner=mode==='owner',visitor=mode==='visitor',id=visitor?'bea':'aster',name=visitor?'Bea':'Aster',state=createWorkshop(Date.now());state.owned.planter=1;let level=1,logged=false,claimed=mode!=='claim';
 const placements={'north-west':'planter','north-middle':null,'north-east':null,'south-west':null,'south-middle':null,'south-east':null},plot=()=>({id:'1',ownerId:'aster',ownerName:'Aster',level,placements,workroomPlacements:emptyWorkroom()});
 const position=()=>mode==='claim'?{room:'square',position:{x:30,y:29}}:{room:level===2?'home-expanded':'home',homePlotId:'1',position:{x:9,y:10}};
 const snapshot=()=>({playerId:id,name,workshop:state,position:position(),quest:{contentVersion:1,awarded:[]},bridge:{contributed:3,target:3,restored:true,phase:'open'},plot:owner||mode==='claim'&&claimed?plot():null,plots:claimed?[plot()]:[],seasonKey:'2026-11-06',scores:[],serverTime:Date.now(),serverInstance:'housing-ui-fixture'});
 const commands:unknown[]=[];
 await p.addInitScript(()=>{class E extends EventTarget{onopen:((e:Event)=>void)|null=null;constructor(){super();(window as any).__housingEvents=this;queueMicrotask(()=>this.onopen?.(new Event('open')));}close(){}};(window as any).EventSource=E;});
 await p.route('**/api/town/**',async route=>{const path=new URL(route.request().url()).pathname.split('/').at(-1);
  if(path==='fixtures')return route.fulfill({json:{fixtures:[{id,name}]}});if(path==='login'){logged=true;return route.fulfill({json:{snapshot:snapshot()}});}if(path==='snapshot')return logged?route.fulfill({json:{snapshot:snapshot()}}):route.fulfill({status:401,json:{message:'Choose a fictional UI fixture.'}});
  if(path==='movement')return route.fulfill({json:{ok:true,position:position()}});
  if(path==='command'){const c=route.request().postDataJSON();commands.push(c);expect(visitor).toBe(false);expect(c.expectedRevision).toBe(state.revision);expect(c.kind).toBe(owner?'upgrade-plot':'claim-plot');expect(state.bridgeKits).toBe(owner?24:12);if(!owner)expect(c.plotId).toBeUndefined();else expect(c.plotId).toBe('1');state.bridgeKits-=owner?24:12;state.revision++;if(owner)level=2;else claimed=true;return route.fulfill({json:{ok:true,message:owner?'Home upgraded. Your furniture was not restructured.':'Your own plot is reserved.',snapshot:snapshot()}});}
  return route.fulfill({status:400,json:{message:'Unexpected UI fixture request.'}});
 });
 await p.goto('/?town=1');await p.getByRole('button',{name,exact:true}).click();await expect.poll(()=>p.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);await expect(p.getByRole('dialog')).toBeHidden();
 return{commands,placements,update:async(kits:number)=>{state.bridgeKits=kits;state.revision++;await p.evaluate(()=>(window as any).__housingEvents.dispatchEvent(new MessageEvent('invalidate',{data:'{}'})));},state:()=>structuredClone(state)};
}
async function open(p:Page,mode:'claim'|'owner'|'visitor'){
 if(mode==='claim')await p.locator('#interact').click();else{await p.locator('#bag').click();await p.getByRole('button',{name:'Inspect or arrange a house',exact:true}).click();}
}
test('housing claim: cost, missing stock and live availability remain readable and focus-stable on phones and short enlarged views',async({browser})=>{
 mkdirSync(out,{recursive:true});for(const shape of[{name:'320',width:320,height:640,text:100},{name:'360',width:360,height:640,text:100},{name:'short200',width:844,height:390,text:200}]){
  const c=await browser.newContext({viewport:{width:shape.width,height:shape.height},hasTouch:shape.width<400}),p=await c.newPage(),errors:string[]=[];p.on('pageerror',e=>errors.push(e.message));try{
   const f=await fixture(p,'claim');await p.evaluate(n=>document.documentElement.style.fontSize=n+'%',shape.text);await open(p,'claim');const facts=p.locator('[data-housing-purchase=claim]'),button=p.getByRole('button',{name:'Claim your house plot · 12 bridge kits',exact:true});await expect(facts).toContainText('Bridge kits · 0 / 12');await expect(facts).toContainText('Need 12 more');await expect(facts).toContainText('6 furnishing nooks');await expect(button).toBeDisabled();const original=await button.elementHandle();await button.scrollIntoViewIfNeeded();await p.screenshot({path:out+'/housing-claim-'+shape.name+'.png'});expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   const close=p.getByRole('button',{name:'Close panel',exact:true});await close.focus();await f.update(11);await expect(facts).toContainText('11 / 12');await expect(facts).toContainText('Need 1 more');await expect(close).toBeFocused();await expect(button).toBeDisabled();await f.update(12);await expect(facts).toContainText('Ready to claim');await expect(button).toBeEnabled();await expect(close).toBeFocused();expect(await original!.evaluate(e=>e===document.querySelector('[aria-describedby^=housing-cost-new]'))).toBe(true);await expect(button).toHaveAttribute('aria-describedby',await facts.getAttribute('id')as string);await button.click();await expect(p.locator('.town-status')).toContainText('Your own plot is reserved.');expect(f.state().bridgeKits).toBe(0);await expect(p.getByRole('combobox',{name:'Plot furniture position'}).locator('option')).toHaveCount(6);expect(f.commands).toHaveLength(1);expect(errors).toEqual([]);
  }finally{await c.close();}
 }
 writeFileSync(out+'/housing-claim-proof.json',JSON.stringify({disclosure:'Intercepted UI-only snapshots/EventSource/arrival/replies with declared synthetic stock, layout and transaction responses; not a server/payment/pacing proof. Native phone/short200 input, no real/protected state.',thresholds:[0,11,12],inPlaceUpdatesAndUnchangedFocus:true,commandShapeRetained:true},null,2)+'\n');
});
test('housing expansion: owner disclosure, exact extra kits, saved furnishings and visitor read-only controls',async({browser})=>{
 const c=await browser.newContext({viewport:{width:360,height:640},hasTouch:true}),p=await c.newPage();try{
  const f=await fixture(p,'owner');await open(p,'owner');const details=p.locator('[data-home-secondary]');await expect(details).not.toHaveAttribute('open');await p.getByRole('combobox',{name:'Plot furniture position'}).selectOption('south-middle');await details.locator('summary').click();const facts=p.locator('[data-housing-purchase=expand]'),button=p.getByRole('button',{name:'Upgrade plot · 24 bridge kits',exact:true});await expect(facts).toContainText('0 / 24');await expect(facts).toContainText('adds 2 workroom nooks; keeps your furniture');await expect(button).toBeDisabled();await details.locator('summary').focus();await f.update(23);await expect(facts).toContainText('Need 1 more');await expect(details.locator('summary')).toBeFocused();await expect(details).toHaveAttribute('open');await expect(p.getByRole('combobox',{name:'Plot furniture position'})).toHaveValue('south-middle');await f.update(24);await expect(button).toBeEnabled();await p.screenshot({path:out+'/housing-expand-phone.png'});await button.click();await expect(facts).toContainText('Already expanded');await expect(button).toBeDisabled();await expect(p.getByRole('combobox',{name:'Plot furniture position'}).locator('option')).toHaveCount(8);expect(f.state().bridgeKits).toBe(0);expect(f.placements['north-west']).toBe('planter');expect(f.commands).toHaveLength(1);
 }finally{await c.close();}
 const g=await browser.newContext({viewport:{width:320,height:640},hasTouch:true}),v=await g.newPage();try{const f=await fixture(v,'visitor');await open(v,'visitor');await expect(v.locator('#panel-title')).toHaveText('Visiting');await expect(v.locator('[data-housing-purchase]')).toHaveCount(0);await expect(v.getByRole('button',{name:/Claim|Upgrade plot/})).toHaveCount(0);expect(f.commands).toHaveLength(0);await v.screenshot({path:out+'/housing-visitor-phone.png'});}finally{await g.close();}
});

test('street directory finds the intended resident or address and confirms the same front door',async({browser})=>{
 const {frontForPlot,TOWN_GATE}=await import('../src/game/neighborhood.ts');
 const {worlds}=await import('../src/game/world.ts');
 const output=process.env.QA_EVIDENCE_DIR??out;
 mkdirSync(output,{recursive:true});
 for(const shape of [
  {name:'desktop',width:1440,height:900,text:100,touch:false},
  {name:'phone',width:320,height:640,text:100,touch:true},
  {name:'phone200',width:320,height:640,text:200,touch:true},
  {name:'short200',width:844,height:390,text:200,touch:true},
 ]){
  const context=await browser.newContext({viewport:{width:shape.width,height:shape.height},hasTouch:shape.touch});
  const page=await context.newPage(),errors:string[]=[],commands:Array<{kind:string;id?:string;districtId?:string;plotId?:string}>=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
   const workshop=createWorkshop(Date.now());
   const street=worlds.neighborhood.stops.find(stop=>stop.id==='neighborhood-directory')!.point;
   let position={room:'neighborhood',districtId:'1',position:{...street},homePlotId:undefined as string|undefined};
   const plots=Array.from({length:7},(_,index)=>({id:String(index+2),ownerId:'neighbor-'+index,ownerName:index===0?'Rowan':'Neighbor '+index,
    level:1,placements:{'north-west':null,'north-middle':null,'north-east':null,'south-west':null,'south-middle':null,'south-east':null},
    workroomPlacements:emptyWorkroom()}));
   const target={...plots[0],id:'25',ownerId:'rowan-east',level:2};
   plots.push(target);
   const snapshot=()=>({playerId:'visitor',name:'Fictional visitor',workshop,position,quest:{contentVersion:1,awarded:[]},
    bridge:{contributed:3,target:3,restored:true,phase:'open'},plot:null,plots,seasonKey:'2026-11-06',scores:[],serverTime:Date.now(),serverInstance:'directory-fixture'});
   let signedIn=false;
   await page.addInitScript(()=>{class Stream extends EventTarget {
    onopen:((event:Event)=>void)|null=null;
    constructor(){super();(window as any).__directoryStream=this;queueMicrotask(()=>this.onopen?.(new Event('open')));}
    close(){}
   }
   (window as any).EventSource=Stream;});
   await page.route('**/api/town/**',async route=>{
    const path=new URL(route.request().url()).pathname.split('/').at(-1);
    if(path==='fixtures')return route.fulfill({json:{fixtures:[{id:'visitor',name:'Fictional visitor'}]}});
    if(path==='login'){signedIn=true;return route.fulfill({json:{snapshot:snapshot()}});}
    if(path==='snapshot')return signedIn?route.fulfill({json:{snapshot:snapshot()}}):route.fulfill({status:401,json:{message:'Choose a fictional resident.'}});
    if(path==='movement'){position=route.request().postDataJSON();return route.fulfill({json:{ok:true,position}});}
    if(path==='command'){
     const command=route.request().postDataJSON();
     commands.push(command);
     if(command.kind==='enter-neighborhood'){
      expect(command.districtId).toBe('2');
      expect(position).toEqual({room:'neighborhood',districtId:'1',position:street});
      position={room:'neighborhood',districtId:'2',position:{...TOWN_GATE},homePlotId:undefined};
     }else{
      expect(command.kind).toBe('enter-home');
      expect(command.plotId).toBe('25');
      const front=frontForPlot('25');
      expect(position.districtId).toBe(front.districtId);
      expect(Math.hypot(position.position.x-front.position.x,position.position.y-front.position.y)).toBeLessThanOrEqual(1.25);
      position={room:'home-expanded',homePlotId:'25',districtId:'2',position:{x:9,y:10}};
     }
     return route.fulfill({json:{ok:true,message:'Allowed fictional visit.',snapshot:snapshot()}});
    }
    return route.fulfill({status:400,json:{message:'Unexpected fixture request.'}});
   });
   await page.goto('/?town=1');
   await page.getByRole('button',{name:'Fictional visitor',exact:true}).click();
   await expect(page.getByRole('dialog')).toBeHidden();
   await page.evaluate(text=>document.documentElement.style.fontSize=text+'%',shape.text);
   const interact=page.getByRole('button',{name:'Inspect Street directory'});
   await expect(interact).toBeEnabled();
   await interact.click();
   await expect(page.getByRole('dialog')).toHaveAccessibleName('Homes & neighbors');
   await expect(page.locator('[data-neighborhood-enter]')).toHaveCount(2);
   const directory=page.locator('.neighbor-directory');
   const disclosure=directory.getByText('Find a neighbor',{exact:true});
   if(shape.touch)await disclosure.tap();else await disclosure.press('Enter');
   const search=directory.getByRole('searchbox',{name:'Name or street address'});
   const status=directory.getByRole('status');
   await expect(status).toContainText('Showing 6 of 8 homes.');
   await search.fill('seaglass lane');
   await expect(status).toHaveText('No matching homes.');
   await search.press('Enter');
   await expect(search).toBeFocused();
   await search.fill('ROWAN');
   await expect(directory.getByRole('button',{name:/Visit Rowan/})).toHaveCount(2);
   if(shape.name==='phone')await page.screenshot({path:output+'/neighbor-directory-same-name.png'});
   await search.fill('Rowan Clover neighborhood 2');
   await expect(status).toHaveText('1 matching home.');
   const visit=directory.getByRole('button',{name:/Visit Rowan.*1 Clover Court.*neighborhood 2/i});
   await expect(visit).toHaveAttribute('data-neighbor-visit','25');
   expect(commands).toHaveLength(0);
   await search.press('Enter');
   await expect(visit).toBeFocused();
   await expect(visit).toBeInViewport({ratio:1});
   const bounds=(await visit.boundingBox())!,header=(await page.locator('.dialog-head').boundingBox())!;
   expect(bounds.height).toBeGreaterThanOrEqual(44);
   expect(bounds.y).toBeGreaterThanOrEqual(header.y+header.height);
   expect(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
   if(shape.name==='phone200')expect(await visit.locator('.neighbor-address').evaluate(address=>{
    const text=address.firstChild!,range=document.createRange(),word='neighborhood';
    const start=address.textContent!.indexOf(word);
    range.setStart(text,start);
    range.setEnd(text,start+word.length);
    return range.getClientRects().length;
   })).toBe(1);
   await page.screenshot({path:output+'/neighbor-directory-'+shape.name+'.png'});
   if(shape.name==='desktop'){
    const updateOwner=async(ownerId:string)=>{
     target.ownerId=ownerId;
     await page.evaluate(()=>(window as any).__directoryStream.dispatchEvent(new MessageEvent('invalidate',{data:'{}'})));
     await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.town()?.plots.find((plot:any)=>plot.id==='25')?.ownerId)).toBe(ownerId);
    };
    await updateOwner('new-rowan-owner');
    await visit.press('Enter');
    await expect(status).toContainText('This listing changed.');
    expect(commands).toHaveLength(0);
    await updateOwner('rowan-east');
   }
   if(shape.touch)await visit.tap();else await visit.press('Enter');
   await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.town()?.position),{timeout:25000})
    .toEqual({room:'home-expanded',homePlotId:'25',districtId:'2',position:{x:9,y:10}});
   expect(commands.map(c=>c.kind)).toEqual(['enter-neighborhood','enter-home']);
   expect(await page.evaluate(()=>(window as any).__pilot.town()?.workshop)).toEqual(workshop);
   expect(errors).toEqual([]);
   await page.screenshot({path:output+'/neighbor-visited-'+shape.name+'.png'});
  }finally{await context.close();}
 }
});
