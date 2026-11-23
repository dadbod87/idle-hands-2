import{expect,type Page}from'@playwright/test';
import type {TownPlot,TownSnapshot} from '../../src/ui/town-client.ts';
import type {TownPosition} from '../../server/live-store.ts';
import{combinedAuditFixture}from'../../tools/combined-audit-fixtures.ts';
import{applyWorkshop,loadWorkshop,PLACEMENT_SLOTS}from'../../src/game/live-workshop.ts';
import{addressForPlot,TOWN_GATE}from'../../src/game/neighborhood.ts';
import{applyHomeArrangement,emptyWorkroom,type HomeLayout}from'../../src/game/live-home-layout.ts';
export async function homePanelFixture(page:Page,options:{level?:1|2;visitor?:boolean;outside?:boolean;otherPlots?:number;planId?:string;allowVisit?:boolean;ownerName?:string;position?:TownPosition;yard?:TownPlot['yard'];housing?:TownSnapshot['housing']}={}){
 const now=Date.now(),level=options.level??2;let state=loadWorkshop(combinedAuditFixture('returning',now).state!,now).state,seq=0;
 const act=(action:object)=>{const r=applyWorkshop(state,{...action,id:'home-panel-'+seq++,expectedRevision:state.revision}as any,Math.max(now,Date.now(),state.observedAt));expect(r.ok,r.message).toBe(true);state=r.state;};
 act({kind:'carpentry',carpentryAction:{action:'claim-easel'}});for(const s of PLACEMENT_SLOTS)if(state.placements[s.id])act({kind:'remove',slot:s.id});
 let layout:HomeLayout={level,placements:Object.fromEntries(PLACEMENT_SLOTS.map((s,i)=>[s.id,['planter','stool','rug','lamp','crate','shelf'][i]]))as HomeLayout['placements'],workroomPlacements:level===2?{'workroom-north':'letterbox','workroom-south':'easel'}:emptyWorkroom()};
 if(options.yard)for(const prop of Object.values(options.yard)){
  if(!prop)continue;
  const slot=PLACEMENT_SLOTS.find(candidate=>layout.placements[candidate.id]===prop);
  if(slot)layout.placements[slot.id]=null;
 }
 let planId=options.planId,ownerId:string|null='aster';
 const id=options.visitor?'bea':'aster',name=options.visitor?'Bea':'Aster',plot=()=>({id:'42',ownerId,ownerName:options.ownerName??'Aster',...layout,...(planId?{planId}:{}),pennantOwned:true,letterboxMotif:state.commission.motif,...(options.yard?{yard:options.yard}:{})});
 let position:TownPosition=options.position??(options.outside?{room:'square',position:{x:30,y:29}}:{room:level===2?'home-expanded':'home',homePlotId:'42',position:{x:9,y:10}});
 const snapshot=()=>({playerId:id,name,workshop:state,position,quest:{contentVersion:1,awarded:[]},bridge:{contributed:3,target:3,restored:true,phase:'open'},plot:options.visitor?null:plot(),plots:[plot(),...Array.from({length:options.otherPlots??0},(_,i)=>({...plot(),id:String(43+i),ownerId:'bea',ownerName:'Bea'}))],seasonKey:'2026-11-06',scores:[],serverTime:Date.now(),serverInstance:'home-panel-fixture',...(options.housing?{housing:options.housing}:{})});
 let logged=false,release:(()=>void)|null=null;const control={commands:[]as any[],rejectNext:false,loseNext:false,holdNext:false,commits:0,replays:0,payloads:[]as string[],receipts:new Map<string,any>(),release:()=>{release?.();release=null;},saved:()=>structuredClone({state,layout}),invalidate:()=>{act({kind:'commission',commissionAction:{action:'style',motif:state.commission.motif==='moth'?'sun':'moth'}});return page.evaluate(()=>(window as any).__homePanelEvents.dispatchEvent(new MessageEvent('invalidate',{data:'{}'})));}};
 await page.addInitScript(()=>{class E extends EventTarget{onopen:((e:Event)=>void)|null=null;constructor(){super();(window as any).__homePanelEvents=this;queueMicrotask(()=>this.onopen?.(new Event('open')));}close(){}};(window as any).EventSource=E;});
 await page.route('**/api/town/**',async route=>{
  const path=new URL(route.request().url()).pathname.split('/').at(-1);
  if(path==='fixtures')return route.fulfill({json:{fixtures:[{id,name}]}});
  if(path==='login'){logged=true;return route.fulfill({json:{snapshot:snapshot()}});}
  if(path==='snapshot')return logged?route.fulfill({json:{snapshot:snapshot()}}):route.fulfill({status:401,json:{message:'Choose a fictional fixture.'}});
  if(path==='movement'){
   if(options.allowVisit)position=route.request().postDataJSON();
   return route.fulfill({json:{ok:true,position}});
  }
  if(path==='command'){
   const c=route.request().postDataJSON();control.commands.push(c);control.payloads.push(route.request().postData()!);
   if(options.allowVisit&&c.kind==='enter-neighborhood'){
    expect(position.room).toBe('square');
    expect(c.districtId).toBe(addressForPlot('42').block);
    position={room:'neighborhood',districtId:c.districtId,position:{...TOWN_GATE}};
    return route.fulfill({json:{ok:true,message:'Entered the street.',snapshot:snapshot()}});
   }
   if(options.allowVisit&&c.kind==='enter-home'){
    expect(position.room).toBe('neighborhood');
    expect(c.plotId).toBe('42');
    expect(ownerId).toBe('aster');
    position={room:level===2?'home-expanded':'home',homePlotId:'42',districtId:position.districtId,position:{x:9,y:13}};
    return route.fulfill({json:{ok:true,message:'Entered.',snapshot:snapshot()}});
   }
   if(control.holdNext){control.holdNext=false;await new Promise<void>(r=>release=r);}
   if(control.receipts.has(c.id)){control.replays++;return route.fulfill({json:{...control.receipts.get(c.id),snapshot:snapshot(),replayed:true}});}
   if(control.rejectNext){control.rejectNext=false;return route.fulfill({json:{ok:false,message:'Fixture rejection: that nook changed. Nothing was moved.',snapshot:snapshot()}});}
   expect(c.kind).toBe('edit-plot');expect(c.plotId).toBe('42');expect(options.visitor).not.toBe(true);
   const{kind,plotId,...raw}=c,r=applyHomeArrangement(state,layout,raw,Date.now());
   if(r.ok){state=r.state;layout=r.layout;control.commits++;}
   const response={ok:r.ok,message:r.message,snapshot:snapshot()};control.receipts.set(c.id,response);
   if(control.loseNext){control.loseNext=false;return route.abort('failed');}return route.fulfill({json:response});
  }
  return route.fulfill({status:400,json:{message:'Unexpected fixture endpoint.'}});
 });
 await page.goto('/?town=1');await page.getByRole('button',{name,exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.snapshot().room)).toBe(position.room);
 return Object.assign(control,{setOccupant:async(value:string|null)=>{ownerId=value;await page.evaluate(()=>(window as any).__homePanelEvents.dispatchEvent(new MessageEvent('invalidate',{data:'{}'})));},setPosition:(value:TownPosition)=>{position=value;},setPlan:async(value:string)=>{planId=value;await page.evaluate(()=>(window as any).__homePanelEvents.dispatchEvent(new MessageEvent('invalidate',{data:'{}'})));}});
}
