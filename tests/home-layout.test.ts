import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorkshop,applyWorkshop,PLACEMENT_SLOTS,PROP_IDS,type WorkshopState} from '../src/game/workshop.ts';
import {HOME_ART} from '../src/art/home.ts';
import {emptyWorkroom,homeLayoutSchema,homeSlots,applyHomeArrangement,isCurrentHomeLayout,type HomeLayout} from '../src/game/home-layout.ts';
const layout=(level:1|2=2):HomeLayout=>({level,placements:Object.fromEntries(PLACEMENT_SLOTS.map(s=>[s.id,null])) as HomeLayout['placements'],workroomPlacements:emptyWorkroom()});
const place=(s:WorkshopState,l:HomeLayout,slot:string,fromSlot?:string)=>applyHomeArrangement(s,l,{id:'arrange-'+s.revision,expectedRevision:s.revision,action:'place',slot,prop:'stool',...(fromSlot?{fromSlot}:{})},s.observedAt);
test('workroom format is strict and does not extend rental or starter slots',()=>{
 assert.equal(PLACEMENT_SLOTS.length,6);assert.equal(homeSlots(1).length,6);assert.equal(homeSlots(2).length,8);
 assert.ok(isCurrentHomeLayout(layout()));assert.equal(isCurrentHomeLayout({...layout(),workroomPlacements:undefined}),false);assert.equal(isCurrentHomeLayout({...layout(),workroomPlacements:{}}),false);
 assert.equal(homeLayoutSchema.safeParse({...layout(),workroomPlacements:{...emptyWorkroom(),unknown:null}}).success,false);
 const invalid=layout(1);invalid.workroomPlacements['workroom-north']='stool';assert.equal(isCurrentHomeLayout(invalid),false);
 for(const slot of homeSlots(2).filter(s=>s.id.startsWith('workroom-')))for(const id of PROP_IDS){const a=HOME_ART.furniture[id],x=(slot.x+.5)*32,y=(slot.y+.5)*32;assert.ok(x-a.foot.x>=576&&x-a.foot.x+a.width<=744,id);assert.ok(y-a.foot.y>=88&&y-a.foot.y+a.height<=488,id);}
});
test('atomic old/workroom moves preserve ownership, clocks, progression and receipt semantics',()=>{
 const initial=createWorkshop(1000),l=layout();const a=place(initial,l,'north-west');assert.ok(a.ok,a.message);const b=place(a.state,a.layout,'workroom-north','north-west');assert.ok(b.ok,b.message);assert.equal(b.layout.placements['north-west'],null);assert.equal(b.layout.workroomPlacements['workroom-north'],'stool');assert.equal(b.state.stats.placed,2);assert.equal(b.state.revision,2);assert.equal(b.state.receipts.length,2);
 for(const k of ['inventory','owned','placements','job','skills','garden','carpentry','commission','bridgeKits'])assert.deepEqual((b.state as any)[k],(initial as any)[k]);
 const duplicate=applyHomeArrangement(b.state,b.layout,{id:'arrange-1',expectedRevision:1,action:'place',slot:'workroom-north',prop:'stool',fromSlot:'north-west'},1000);assert.ok(duplicate.replayed);assert.equal(duplicate.state,b.state);
 const reject=place(b.state,b.layout,'workroom-south');assert.equal(reject.ok,false);assert.equal(reject.state,b.state);assert.deepEqual(reject.layout,b.layout);
 const removed=applyHomeArrangement(b.state,b.layout,{id:'remove',expectedRevision:2,action:'remove',slot:'workroom-north'},1000);assert.ok(removed.ok);assert.equal(removed.state.stats.placed,2);assert.equal(removed.state.revision,3);assert.equal(removed.layout.workroomPlacements['workroom-north'],null);
 const rental=structuredClone(initial);rental.placements['south-west']='stool';assert.equal(place(rental,l,'workroom-north').ok,false);
 assert.equal(place(initial,layout(1),'workroom-north').ok,false);assert.equal(place(initial,l,'other').ok,false);
 const occupied=structuredClone(b.layout);occupied.placements['north-west']='lamp';assert.equal(place(b.state,occupied,'north-west','workroom-north').ok,false);assert.equal(place(b.state,b.layout,'workroom-south','south-east').ok,false);
});
test('a home planter never completes workshop orientation and failed layouts do not replace progress',()=>{
 let s=createWorkshop(1000);let id=0;const cmd=(c:object,t=s.observedAt)=>{const r=applyWorkshop(s,{...c,id:'make-'+id++,expectedRevision:s.revision},t);assert.ok(r.ok,r.message);s=r.state;};for(const resource of ['scrap','timber','supplies'])cmd({kind:'gather',resource});cmd({kind:'craft',recipe:'planter'});cmd({kind:'claim'},s.job!.readyAt);assert.equal(s.stats.planterPlacedAfterCraft,false);
 const before=structuredClone(s),r=applyHomeArrangement(s,layout(),{id:'home-planter',expectedRevision:s.revision,action:'place',slot:'workroom-south',prop:'planter'},s.observedAt);assert.ok(r.ok,r.message);assert.equal(r.state.stats.planterPlacedAfterCraft,false);assert.deepEqual(r.state.owned,before.owned);assert.deepEqual(r.state.inventory,before.inventory);assert.deepEqual(r.state.skills,before.skills);
 const invalid=layout();invalid.workroomPlacements['workroom-north']='letterbox';const fail=applyHomeArrangement(before,invalid,{id:'invalid',expectedRevision:before.revision,action:'remove',slot:'workroom-north'},before.observedAt);assert.equal(fail.ok,false);assert.equal(fail.state,before);
});
