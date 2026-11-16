import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createWorkshop,isCurrentWorkshop,PLACEMENT_SLOTS,PROP_IDS} from '../src/game/live-workshop.ts';
import {emptyWorkroom,type HomeLayout} from '../src/game/live-home-layout.ts';
import {addressForPlot,PARCELS,routeToParcel} from '../src/game/neighborhood.ts';
import {homeExteriorForPlot} from '../src/art/residential.ts';
import {HOUSING_PLANS,PROPOSED_BUILD_MS} from '../src/design/housing-options.ts';
import {legacyHousingAccount,housingAccountSchema,makeHousingQuote,startHousingBuild,finishHousingBuild,arrangeHousing,allocatedCopies,publicHousing,housingFootprintFor,yardAnchors,housingBlocks,residentialFrame,housingVisit,YARD_ART,HOUSING_CATALOG_VERSION,type HousingAccount} from '../src/design/housing-contract.ts';
const start=Date.UTC(2026,10,16),H=3_600_000;
const request=(a:HousingAccount,target='pocket-cottage-2',plotId=a.home?.plotId??'1')=>({version:1,catalogVersion:HOUSING_CATALOG_VERSION,target,plotId,expectedRevision:a.workshop.revision});
import {housingFixture} from '../tools/housing-contract-fixture.ts';

function book(a:HousingAccount,target='pocket-cottage-2',at=start){const q=makeHousingQuote(a,request(a,target),at,randomUUID());const r=startHousingBuild(a,q,at,randomUUID());assert.ok(r.ok,r.message);return{q,a:r.account};}
const move=(a:HousingAccount,prop:string,to:{area:string;slot:string},from?:{area:string;slot:string},now=start)=>arrangeHousing(a,{version:1,catalogVersion:HOUSING_CATALOG_VERSION,expectedRevision:a.workshop.revision,action:'place',to,prop,...(from?{from}:{})},now);

test('legacy contract maps every facade/tier and bigint address without charging, settling or changing creative work',()=>{
 for(const id of ['1','2','3','24','25','999999999999999999'])for(const tier of [1,2] as const){
  const a=housingFixture('aster',tier,id),raw=structuredClone(a);assert.equal(a.home!.legacyExterior,homeExteriorForPlot(id,tier).id);assert.equal(a.home!.planId,'legacy-'+a.home!.legacyExterior);assert.equal(a.workshop.bridgeKits,48);assert.equal(a.build,null);assert.equal(a.home!.layout.level,tier);assert.deepEqual(addressForPlot(a.home!.plotId),addressForPlot(id));assert.deepEqual(housingAccountSchema.parse(JSON.parse(JSON.stringify(a))),raw);
 }
 const a=housingFixture();for(const bad of [{...a,version:2},{...a,extra:'repair'},{...a,home:{...a.home,legacyExterior:'other'}},{...a,home:{...a.home,layout:{...a.home!.layout,level:2}}}])assert.equal(housingAccountSchema.safeParse(bad).success,false);
 assert.throws(()=>legacyHousingAccount('aster',{version:2},null));
});
test('exact complete quote separates rights from remodels, never charges taste twice or downgrades earned nooks',()=>{
 const cases:[[0|1|2,string,number,number],...Array<[0|1|2,string,number,number]>]=[[0,'pocket-cottage-1',12,0],[0,'garden-studio-2',36,0],[1,'pocket-cottage-2',24,0],[1,'porch-house-1',0,2],[2,'garden-studio-2',0,2]];
 for(const [tier,target,rights,remodel]of cases){const a=housingFixture('a',tier),q=makeHousingQuote(a,request(a,target),start,randomUUID());assert.equal(q.rightsKits,rights);assert.equal(q.remodelKits,remodel);assert.equal(q.totalKits,rights+remodel);assert.equal(q.constructionMs,6*H);assert.deepEqual(a,housingFixture('a',tier));}
 const a=housingFixture('a',2);assert.throws(()=>makeHousingQuote(a,request(a,'pocket-cottage-1'),start,randomUUID()));assert.throws(()=>makeHousingQuote(a,{...request(a),plotId:'2'},start,randomUUID()));assert.throws(()=>makeHousingQuote(a,{...request(a),catalogVersion:'old'},start,randomUUID()));
});
test('expired, insufficient, forged, foreign, stale and backward-clock confirmations preserve exact input',()=>{
 const a=housingFixture(),q=makeHousingQuote(a,request(a),start,randomUUID()),before=structuredClone(a);
 for(const [raw,at]of [[q,q.expiresAt],[{...q,totalKits:0},start],[{...q,ownerId:'other'},start],[q,start-1]] as const){const r=startHousingBuild(a,raw,at,randomUUID());assert.equal(r.ok,false);assert.strictEqual(r.account,a);assert.deepEqual(a,before);}
 const poor=structuredClone(a);poor.workshop.bridgeKits=0;assert.equal(startHousingBuild(poor,q,start,randomUUID()).ok,false);
 const stale=structuredClone(a);stale.workshop.revision++;assert.equal(startHousingBuild(stale,q,start,randomUUID()).ok,false);
});
test('fixed six-hour independent build keeps original home/placements/job and persists without attendance or weekly reset',()=>{
 const a=housingFixture();a.workshop.inventory={scrap:3,timber:2,supplies:1};a.workshop.job={recipe:'bridge-kit',startedAt:start,readyAt:start+12*H};
 const before=structuredClone(a),b=book(a);assert.equal(b.a.workshop.bridgeKits,24);assert.deepEqual(b.a.home,before.home);assert.deepEqual(b.a.workshop.job,before.workshop.job);assert.deepEqual(b.a.workshop.garden,before.workshop.garden);assert.deepEqual(b.a.workshop.owned,before.workshop.owned);
 assert.equal(finishHousingBuild(b.a,start+6*H-1).ok,false);assert.throws(()=>makeHousingQuote(b.a,request(b.a,'porch-house-2'),start+H,randomUUID()));
 const reloaded=housingAccountSchema.parse(JSON.parse(JSON.stringify(b.a))),done=finishHousingBuild(reloaded,start+7*24*H);assert.ok(done.ok);assert.equal(done.account.home!.layout.level,2);assert.equal(done.account.home!.plotId,'1');assert.deepEqual(done.account.home!.layout.placements,before.home!.layout.placements);assert.deepEqual(done.account.workshop.owned,before.workshop.owned);assert.deepEqual(done.account.workshop.job,before.workshop.job);assert.equal(done.account.build,null);assert.equal(finishHousingBuild(done.account,start+8*24*H).ok,false);
});
test('one ledger moves owned items across rental/interior/yard, refuses duplicates and returns incompatible yard copies',()=>{
 let a=finishHousingBuild(book(housingFixture()).a,start+6*H).account;
 // Existing donated stool is in the home, and cannot be duplicated in the rental.
 const usedBefore=allocatedCopies(a,'stool');assert.equal(move(a,'stool',{area:'rental',slot:'north-west'},undefined,start+6*H).ok,false);assert.equal(usedBefore,1);
 const stool=Object.entries(a.home!.layout.placements).find(([,p])=>p==='stool')![0];let r=move(a,'stool',{area:'rental',slot:'north-west'},{area:'indoor',slot:stool},start+6*H);assert.ok(r.ok);a=r.account;assert.equal(allocatedCopies(a,'stool'),1);
 assert.equal(move(a,'stool',{area:'yard',slot:'front-left'},{area:'rental',slot:'north-west'},start+6*H).ok,false);
 // Synthetic valid planter history, explicitly isolated fixture only.
 a.workshop.owned.planter=1;a.workshop.stats.plantersCrafted=1;a.workshop.stats.crafted=1;a.workshop.skills.making=1;assert.ok(isCurrentWorkshop(a.workshop));
 r=move(a,'planter',{area:'yard',slot:'side-left'},undefined,start+6*H);assert.ok(r.ok,r.message);a=r.account;const owned=structuredClone(a.workshop.owned);
 const q=makeHousingQuote(a,request(a,'workshop-lodge-2'),start+6*H,randomUUID());assert.deepEqual(q.bagReturns,[{slot:'side-left',prop:'planter'}]);assert.equal(q.totalKits,2);const paid=startHousingBuild(a,q,start+6*H,randomUUID());assert.ok(paid.ok);assert.equal(paid.account.home!.yard['side-left'],'planter');const done=finishHousingBuild(paid.account,start+12*H);assert.ok(done.ok);assert.deepEqual(done.bagReturns,q.bagReturns);assert.equal(done.account.home!.yard['side-left'],null);assert.deepEqual(done.account.workshop.owned,owned);assert.equal(allocatedCopies(done.account,'planter'),0);assert.equal(done.account.home!.layout.level,2);
});
test('new footprint never strands a neighbor; smaller footprints have usable sides and doors stay exact in every lot',()=>{
 for(const p of HOUSING_PLANS)for(const parcel of PARCELS){const plot=String(parcel.slot),b=housingFootprintFor(plot,p.id);assert.deepEqual(b.door,parcel.foot);assert.deepEqual(b.front,parcel.front);assert.ok(b.x>=parcel.lot.x&&b.y>=parcel.lot.y&&b.x+b.width<=parcel.lot.x+8&&b.y+b.height<=parcel.lot.y+10);assert.equal(housingBlocks(plot,p.id,parcel.front),false);for(const point of routeToParcel(parcel.slot))assert.equal(housingBlocks(plot,p.id,point),false);for(const anchor of yardAnchors(p.id)){assert.equal(housingBlocks(plot,p.id,{x:parcel.lot.x+anchor.x,y:parcel.lot.y+anchor.y}),false);assert.ok(anchor.x>=.3&&anchor.x<=7.7&&anchor.y>=.3&&anchor.y<=9.7);assert.ok(YARD_ART.planter.groundRadius+.24<.5);assert.equal(YARD_ART.planter.collides,false);assert.equal(YARD_ART.letterbox.collides,false);}}
 let a=finishHousingBuild(book(housingFixture()).a,start+6*H).account;a=book(a,'workshop-lodge-2',start+6*H).a;const b=housingFootprintFor('1','workshop-lodge-2'),point={x:b.x+.4,y:b.y+1};assert.equal(housingBlocks('1','pocket-cottage-2',point),false);assert.equal(finishHousingBuild(a,start+12*H,[{districtId:'1',point:{x:NaN,y:0}}]).ok,false);const blocked=finishHousingBuild(a,start+12*H,[{districtId:'1',point}]);assert.equal(blocked.ok,false);assert.strictEqual(blocked.account,a);assert.ok(finishHousingBuild(a,start+12*H,[{districtId:'2',point}]).ok);assert.ok(finishHousingBuild(a,start+12*H).ok);
});
test('public appearance excludes inventory, costs, quotes, paid history and private garden; surround adds no lots',()=>{
 const first=book(housingFixture('first',0),'pocket-cottage-1').a;assert.equal(publicHousing(first,start)!.planId,null);assert.equal(publicHousing(first,start)!.construction,'building');assert.equal(housingVisit(first,'first'),null);const a=book(housingFixture()).a,p=publicHousing(a,start)!;assert.deepEqual(Object.keys(p).sort(),['address','construction','indoor','legacyExterior','letterboxMotif','level','ownerId','pennantOwned','planId','plotId','yard']);assert.equal('workshop'in p,false);assert.equal('build'in p,false);assert.equal(p.construction,'building');assert.equal(publicHousing(a,start+6*H)!.construction,'ready');
 for(const [w,h]of [[2560,1440],[3840,2160],[320,640],[844,390]]){const f=residentialFrame(w,h,1);assert.ok(f.width>=w&&f.height>=h);assert.deepEqual(f.walkable,{x:0,y:0,width:2048,height:2048});}
 const a2=structuredClone(a);a2.home!.yard['front-left']='stool';assert.equal(housingAccountSchema.safeParse(a2).success,false);
 for(const p of PROP_IDS)assert.equal(allocatedCopies(a,p)<=a.workshop.owned[p],true);
});

import {earnedHousingFixture} from '../tools/earned-housing-fixture.ts';
test('all nine ordinarily earned prop families conserve rental/home/workroom/yard copies and owner/visitor door intent',()=>{
 let a=earnedHousingFixture(),at=a.workshop.observedAt;const original=structuredClone(a),props=PROP_IDS.filter(p=>p!=='letterbox');
 for(const [i,p]of props.entries()){const slot=i<6?PLACEMENT_SLOTS[i].id:i===6?'workroom-north':'workroom-south';const r=move(a,p,{area:'indoor',slot},undefined,at);assert.ok(r.ok,r.message);a=r.account;}
 const box=move(a,'letterbox',{area:'yard',slot:'front-left'},undefined,at);assert.ok(box.ok,box.message);a=box.account;assert.equal(move(a,'letterbox',{area:'yard',slot:'front-right'},undefined,at).ok,false);assert.equal(move(a,'teapot',{area:'rental',slot:'north-west'},undefined,at).ok,false);
 for(const p of PROP_IDS){assert.ok(original.workshop.owned[p]>=1,p);assert.equal(allocatedCopies(a,p),1,p);}assert.deepEqual(a.workshop.owned,original.workshop.owned);assert.deepEqual(a.workshop.garden,original.workshop.garden);assert.deepEqual(a.workshop.carpentry,original.workshop.carpentry);assert.deepEqual(a.workshop.commission,original.workshop.commission);assert.deepEqual(a.workshop.cafe,original.workshop.cafe);assert.equal(publicHousing(a,at,{pennantOwned:true})!.letterboxMotif,a.workshop.commission.motif);assert.equal(publicHousing(a,at,{pennantOwned:true})!.pennantOwned,true);const putAway=arrangeHousing(a,{version:1,catalogVersion:HOUSING_CATALOG_VERSION,expectedRevision:a.workshop.revision,action:'remove',to:{area:'yard',slot:'front-left'}},at);assert.ok(putAway.ok);assert.equal(publicHousing(putAway.account,at)!.letterboxMotif,null);
 const owner=housingVisit(a,'earned')!,visitor=housingVisit(a,'friend')!;assert.equal(owner.mayArrange,true);assert.equal(visitor.mayArrange,false);assert.equal(visitor.mayHarvestPrivateGarden,false);assert.deepEqual(owner.entry,visitor.entry);assert.deepEqual(visitor.exit.position,PARCELS[0].front);assert.equal(visitor.exit.districtId,'2');assert.equal(visitor.entry.homePlotId,'25');assert.deepEqual(housingAccountSchema.parse(JSON.parse(JSON.stringify(a))),a);
});

import {canStand} from '../src/game/world.ts';
test('candidate interior expansion preserves every existing safe foot position and uses the same front-door exit',()=>{
 let checked=0;for(let y=.5;y<16;y+=.5)for(let x=.5;x<18;x+=.5)if(canStand('home',{x,y})){assert.equal(canStand('home-expanded',{x,y}),true,'No safe existing occupant may be stranded');checked++;}assert.ok(checked>500);
 const a=housingFixture();a.workshop.stats.placed=1_000_000;const r=move(a,'stool',{area:'rental',slot:'north-west'},{area:'indoor',slot:'north-west'});assert.equal(r.ok,false);assert.deepEqual(r.account,a);
});

import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {HOUSING_V1,HOUSING_V1_PLANS,legacyExteriorV1} from '../src/design/housing-catalog-v1.ts';
test('accepted-v1 catalog bytes, costs and six exact legacy facades are immutable; later tuning needs a new catalog version',()=>{
 assert.equal(createHash('sha256').update(readFileSync('src/design/housing-catalog-v1.json')).digest('hex'),'2eb05e8e93e50b46449023e2bb451db57fa55780018ea48263175769c589829f');
 assert.equal(HOUSING_V1.version,HOUSING_CATALOG_VERSION);assert.deepEqual(HOUSING_V1_PLANS,HOUSING_PLANS);assert.ok(Object.isFrozen(HOUSING_V1)&&Object.isFrozen(HOUSING_V1.plans[0].yard));
 for(let plot=1;plot<=100;plot++)for(const tier of [1,2] as const)assert.equal(legacyExteriorV1(String(plot),tier),homeExteriorForPlot(String(plot),tier).id);
 assert.throws(()=>{(HOUSING_V1 as any).starterKits=0;});
});
