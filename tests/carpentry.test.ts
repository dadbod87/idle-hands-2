import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGarden,applyGarden,gardenSchema,migrateGarden,consumeGarden,GARDEN_HOUR as H,GARDEN_DAY as D,GARDEN_TIME_MAX,type GardenState,type GardenAction} from '../src/game/garden.ts';
import {createWorkshop,loadWorkshop,applyWorkshop} from '../src/game/workshop.ts';
import {createCarpentry,carpentrySchema,applyCarpentry,settleCarpentry,carpentryLedgerMatches,nextCarpentryDeadline,carpentryActionLocations,easelGoal,createNoticeboard,recordNoticeboard,settleNoticeboard,noticeboardSchema,PINE_STATIONS,type CarpentryState,type CarpentryAction} from '../src/game/carpentry.ts';
type Pair={state:CarpentryState;garden:GardenState};
function garden(s:GardenState,a:GardenAction,now:number){const r=applyGarden(s,a,now);assert.equal(r.ok,true,r.message);return r.state;}
function use(p:Pair,a:CarpentryAction,now:number):Pair{const before=structuredClone(p),r=applyCarpentry(p.state,p.garden,a,now);assert.equal(r.ok,true,r.message);assert.deepEqual(p,before);assert.equal(carpentrySchema.safeParse(r.state).success,true);assert.equal(gardenSchema.safeParse(r.garden).success,true);assert.equal(carpentryLedgerMatches(r.state,r.garden),true);assert.ok(r.message.length<=240);return{state:r.state,garden:r.garden};}
function reject(p:Pair,a:unknown,now:number){const before=JSON.stringify(p),r=applyCarpentry(p.state,p.garden,a,now);assert.equal(r.ok,false,r.message);assert.equal(r.state,p.state);assert.equal(r.garden,p.garden);assert.equal(r.awardEasel,false);assert.equal(r.recordIntent,false);assert.equal(JSON.stringify(p),before);return r;}
function initial():Pair{return{state:createCarpentry(0),garden:createGarden(0)};}
function equipped():Pair{let p=use(initial(),{action:'learn-saw'},0);return use(p,{action:'equip-saw',equipped:true},0);}
function planted(p:Pair,at:number):Pair{for(const [bed,crop]of [[0,'radish'],[1,'radish'],[2,'marigold']]as const)if(!p.garden.beds[bed])p={...p,garden:garden(p.garden,{action:'plant',bed,crop},at)};return p;}
function harvested(p:Pair,at:number):Pair{for(let bed=0;bed<3;bed++)if(p.garden.beds[bed]&&p.garden.beds[bed]!.readyAt<=at&&p.garden.produce[p.garden.beds[bed]!.crop]<12)p={...p,garden:garden(p.garden,{action:'harvest',bed},at)};return p;}
function ready():Pair{let p=planted(equipped(),0);p=use(p,{action:'gather-pine',station:'crooked'},0);return harvested(p,4*H);}
test('free lesson, explicit equipment and missing-entitlement recovery never grant duplicate tools or a multiplier',()=>{
 let p=initial();reject(p,{action:'equip-saw',equipped:true},0);reject(p,{action:'recover-saw'},0);reject(p,{action:'gather-pine',station:'crooked'},0);
 p=use(p,{action:'learn-saw'},0);assert.equal(p.state.lessonAt,0);assert.deepEqual(p.state.saw,{owned:true,equipped:false});reject(p,{action:'learn-saw'},0);reject(p,{action:'recover-saw'},0);
 p=use(p,{action:'equip-saw',equipped:true},0);reject(p,{action:'equip-saw',equipped:true},0);p=use(p,{action:'equip-saw',equipped:false},0);
 // Disclosed broken-entitlement fixture; no runtime action removes a bound saw.
 p.state.saw.owned=false;p=use(p,{action:'recover-saw'},H);assert.deepEqual(p.state.saw,{owned:true,equipped:false});reject(p,{action:'recover-saw'},H);assert.equal(p.state.practice,0);assert.equal(p.state.produced,0);
});
test('three pine locations share one personal renewable pool rather than multiplying supply or spending old timber',()=>{
 let p=equipped();p=use(p,{action:'gather-pine',station:PINE_STATIONS[0]},0);assert.equal(p.state.pine.carried,6);
 for(const station of PINE_STATIONS)reject(p,{action:'gather-pine',station},4*H-1);
 p=use(p,{action:'gather-pine',station:PINE_STATIONS[1]},4*H);assert.equal(p.state.pine.carried,7);assert.equal(p.state.pine.available,0);
 assert.equal(settleCarpentry(p.state,100*D).pine.available,6);assert.equal(settleCarpentry(p.state,100*D).pine.carried,7);assert.equal(p.garden.harvested.radish,0);
});
test('full-bank time is not hidden reserve; fractional recovery survives reload and carried-full rejection is atomic',()=>{
 let p=equipped();p=use(p,{action:'gather-pine',station:'crooked'},100*H);assert.equal(p.state.pine.lastAt,100*H);reject(p,{action:'gather-pine',station:'forked'},104*H-1);
 p=use(p,{action:'gather-pine',station:'forked'},106*H);assert.equal(p.state.pine.lastAt,104*H);assert.equal(p.state.pine.carried,7);assert.equal(settleCarpentry(p.state,108*H).pine.available,1);
 for(const t of [132,156,180])p=use(p,{action:'gather-pine',station:'sheltered'},t*H);assert.equal(p.state.pine.carried,24);assert.equal(p.state.pine.available,1);
 reject(p,{action:'gather-pine',station:'crooked'},204*H);assert.equal(p.state.pine.available,1);assert.equal(p.state.pine.carried,24);
 const copy=carpentrySchema.parse(JSON.parse(JSON.stringify(p.state)));assert.deepEqual(settleCarpentry(copy,204*H),settleCarpentry(p.state,204*H));
});
test('fixed easel recipe conserves old crop history, spends literal inputs once and holds its independent twelve-hour job',()=>{
 let p=ready();const before=structuredClone(p.garden),raw={action:'start-easel'} as const;
 p=use(p,raw,4*H);assert.equal(p.state.pine.carried,2);assert.equal(p.state.pine.spent,4);assert.deepEqual(p.garden.consumed,{easels:{radish:0,marigold:1},hampers:{radish:0,marigold:0}});
 for(const k of ['seeds','beds','harvested','requests','nextRequestAt','practice','bonusPractice','markers','errand']as const)assert.deepEqual(p.garden[k],before[k],k);
 assert.deepEqual(p.state.job,{startedAt:4*H,readyAt:16*H});reject(p,raw,4*H);reject(p,{action:'claim-easel'},16*H-1);
 const held=settleCarpentry(p.state,90*D);assert.deepEqual(held.job,p.state.job);assert.equal(held.produced,0);const r=applyCarpentry(held,p.garden,{action:'claim-easel'},90*D);assert.equal(r.ok,true);assert.equal(r.awardEasel,true);assert.equal(r.recordIntent,false);assert.equal(r.state.produced,1);assert.equal(r.state.practice,3);assert.equal(r.state.job,null);reject({state:r.state,garden:r.garden},{action:'claim-easel'},90*D);
});
test('hamper is optional, literal-cost, independently cooled down and cannot fabricate mixed requests or grant old economy',()=>{
 let p=ready();const g=structuredClone(p.garden);p=use(p,{action:'deliver-hamper'},4*H);
 assert.deepEqual(p.garden.produce,{radish:0,marigold:0});assert.deepEqual(p.garden.consumed.hampers,{radish:2,marigold:1});assert.equal(p.garden.requests,0);assert.equal(p.garden.nextRequestAt,null);assert.equal(p.garden.practice,g.practice);assert.equal(p.state.pine.carried,5);assert.equal(p.state.hampers,1);assert.equal(p.state.practice,1);assert.equal(p.state.nextHamperAt,8*H);
 p=harvested(planted(p,4*H),8*H);reject(p,{action:'deliver-hamper'},8*H-1);p=use(p,{action:'deliver-hamper'},8*H);assert.equal(p.state.hampers,2);assert.equal(p.state.practice,2);assert.equal(p.garden.harvested.radish,4);assert.equal(p.garden.requests,0);
});
test('goal is only a planning aid: flower warning, explicit override and clear toggle do not reserve or auto-spend stock',()=>{
 let p=ready();assert.deepEqual(easelGoal(p.state,p.garden),{active:true,pineNeeded:0,flowersNeeded:0,spendingLastFlower:true});
 const before=structuredClone(p);p=use(p,{action:'set-easel-goal',enabled:false},4*H);assert.equal(easelGoal(p.state,p.garden).active,false);assert.deepEqual(p.garden,before.garden);assert.deepEqual(p.state.pine,settleCarpentry(before.state,4*H).pine);
 p=use(p,{action:'set-easel-goal',enabled:true},4*H);p=use(p,{action:'deliver-hamper'},4*H);assert.equal(p.state.keepEaselGoal,true);assert.equal(easelGoal(p.state,p.garden).flowersNeeded,1);reject(p,{action:'start-easel'},4*H);
});
test('each claimed craft can be recorded once, keeps the item, and emits a separate anonymous transactional intent',()=>{
 let p=ready();reject(p,{action:'record-easel'},4*H);p=use(p,{action:'start-easel'},4*H);reject(p,{action:'record-easel'},16*H);p=use(p,{action:'claim-easel'},16*H);
 const r=applyCarpentry(p.state,p.garden,{action:'record-easel'},16*H);assert.equal(r.ok,true);assert.equal(r.recordIntent,true);assert.equal(r.awardEasel,false);assert.equal(r.state.produced,1);assert.equal(r.state.recorded,1);assert.deepEqual(r.garden,p.garden);assert.equal(r.state.practice,p.state.practice);assert.deepEqual(r.state.pine,p.state.pine);reject({state:r.state,garden:r.garden},{action:'record-easel'},16*H);
});
test('one resident can record six kept crafts and continue personal production after the anonymous goal is funded',()=>{
 let p=equipped(),board=createNoticeboard();let t=0;
 for(let n=0;n<7;n++){
  p=planted(p,t);p=use(p,{action:'gather-pine',station:'crooked'},t);t+=4*H;p=harvested(p,t);p=use(p,{action:'start-easel'},t);t+=12*H;p=use(p,{action:'claim-easel'},t);const before=p.state.produced;
  p=use(p,{action:'record-easel'},t);const r=recordNoticeboard(board,t);board=r.state;assert.equal(r.credited,n<6);assert.equal(p.state.produced,before);assert.equal(p.state.recorded,n+1);
  if(n===5)assert.equal(p.state.sixthRecordAt,t);
 }
 assert.equal(board.credits,6);assert.equal(board.readyAt,6*16*H+D);assert.equal(p.state.sixthRecordAt,6*16*H);assert.equal(p.state.produced,7);assert.equal(p.state.practice,21);assert.equal(p.garden.requests,0);assert.equal(p.garden.consumed.easels.marigold,7);
});
test('noticeboard requires exactly six records, one fixed day, no unique-helper rule and no private fields',()=>{
 let board=createNoticeboard();for(let n=0;n<5;n++)board=recordNoticeboard(board,n*H).state;assert.equal(board.phase,'collecting');assert.equal(board.readyAt,null);
 board=recordNoticeboard(board,5*H).state;assert.deepEqual(board,{credits:6,phase:'installing',startedAt:5*H,readyAt:29*H,openedAt:null});assert.equal(settleNoticeboard(board,29*H-1),board);assert.equal(recordNoticeboard(board,20*H).state,board);
 const open=settleNoticeboard(board,90*D);assert.equal(open.phase,'open');assert.equal(open.openedAt,29*H);assert.deepEqual(recordNoticeboard(open,91*D),{state:open,credited:false});
 for(const bad of [{...board,credits:7},{...board,phase:'open'},{...board,readyAt:29*H+1},{...board,ownerId:'somebody'},{...board,stock:10},{...board,equipment:'saw'},{...createNoticeboard(),credits:6}])assert.equal(noticeboardSchema.safeParse(bad).success,false);
 assert.throws(()=>settleNoticeboard(board,5*H-1));
});
test('deadline selector returns only future wakeups and never auto-claims a held ready job or refills carried stock',()=>{
 let p=ready();p=use(p,{action:'start-easel'},4*H);assert.equal(nextCarpentryDeadline(p.state,4*H),8*H);assert.equal(nextCarpentryDeadline(p.state,28*H),null);assert.equal(p.state.job!.readyAt,16*H);assert.equal(p.state.produced,0);assert.equal(p.state.pine.carried,2);
 const s=createCarpentry(0);assert.equal(nextCarpentryDeadline(s,100*D),null);
});
test('strict actions, invalid clocks and corrupted counters reject atomically without an award or public credit',()=>{
 const p=ready();for(const a of [{action:'learn-saw',amount:3},{action:'equip-saw',equipped:'true'},{action:'gather-pine',station:'unknown'},{action:'start-easel',cost:0},{action:'record-easel',ownerId:'other'},{action:'deliver-hamper',reward:100},{action:'set-easel-goal',enabled:true,spend:true},{action:'speed-up'},null])reject(p,a,4*H);
 for(const t of [-1,NaN,Infinity,.5,4*H-1,GARDEN_TIME_MAX+1])reject(p,{action:'start-easel'},t);
 for(const bad of [{...p.state,version:2},{...p.state,extra:true},{...p.state,produced:1},{...p.state,practice:1},{...p.state,recorded:1},{...p.state,saw:{owned:false,equipped:true}},{...p.state,pine:{...p.state.pine,carried:25}},{...p.state,job:{startedAt:0,readyAt:1}}])assert.equal(carpentrySchema.safeParse(bad).success,false);
 const broken=structuredClone(p);broken.garden.consumed.easels.marigold=1;reject(broken,{action:'start-easel'},4*H);
});
test('exhausted, missing ingredient and storage/counter bounds fail without changing the queued job or either ledger',()=>{
 let p=equipped();reject(p,{action:'start-easel'},0);reject(p,{action:'deliver-hamper'},0);p=use(p,{action:'gather-pine',station:'crooked'},0);reject(p,{action:'start-easel'},0);
 // Valid saturated history fixture, independent of runtime player data.
 p=ready();p.state.started=99;p.state.produced=99;p.state.practice=297;p.state.pine.spent=396;p.state.pine.gathered=402;p.garden.harvested.marigold+=99;p.garden.planted+=99;p.garden.practice+=99;p.garden.consumed.easels.marigold=99;assert.equal(carpentrySchema.safeParse(p.state).success,true);assert.equal(gardenSchema.safeParse(p.garden).success,true);reject(p,{action:'start-easel'},4*H);
 const empty=initial();empty.state.pine.gathered=1;reject(empty,{action:'learn-saw'},0);
});
test('strict garden v1 migration is deterministic, preserves populated history and refuses future, extra or forged consumption',()=>{
 let g=ready().garden;g=garden(g,{action:'submit-request'},4*H);g=garden(g,{action:'make-marker',marker:'sunburst'},4*H);
 const old=JSON.parse(JSON.stringify(g));old.version=1;delete old.consumed;const before=JSON.stringify(old),converted=migrateGarden(old) as GardenState;
 assert.equal(converted.version,2);assert.equal(gardenSchema.safeParse(converted).success,true);assert.equal(JSON.stringify(old),before);assert.deepEqual(migrateGarden(old),converted);
 const {version,consumed,...rest}=converted;const {version:_,...legacy}=old;assert.deepEqual(rest,legacy);assert.deepEqual(consumed,{easels:{radish:0,marigold:0},hampers:{radish:0,marigold:0}});
 for(const bad of [{...old,version:3},{...old,extra:true},{...old,consumed:{easels:{radish:0,marigold:1}}},{...old,requests:99},{...old,produce:{radish:12,marigold:12}}])assert.equal(migrateGarden(bad),bad);
});
test('workshop v1 garden migration retains ordinary job, inventory, furniture, revisions and receipts without changing the old input',()=>{
 let s=createWorkshop(0);for(const resource of ['scrap','timber','supplies'])s=applyWorkshop(s,{id:resource,expectedRevision:s.revision,kind:'gather',resource},0).state;
 s=applyWorkshop(s,{id:'old-job',expectedRevision:s.revision,kind:'craft',recipe:'planter'},0).state;const old=JSON.parse(JSON.stringify(s));old.garden.version=1;delete old.garden.consumed;const before=JSON.stringify(old);
 const migrated=loadWorkshop(old,0);assert.equal(migrated.recovered,false);assert.equal(migrated.state.garden.version,2);for(const key of Object.keys(s).filter(k=>k!=='garden'))assert.deepEqual((migrated.state as any)[key],(s as any)[key],key);assert.equal(JSON.stringify(old),before);
 old.garden.extra='do not discard';assert.equal(loadWorkshop(old,0).recovered,true);assert.equal(old.garden.extra,'do not discard');
});
test('garden consumed-by-use conservation rejects mismatched recipes and never invents old requests',()=>{
 const g=ready().garden,r=consumeGarden(g,'hampers',4*H)!;assert.ok(r);assert.equal(r.requests,g.requests);assert.equal(r.practice,g.practice);
 for(const consumed of [{...r.consumed,easels:{radish:1,marigold:0}},{...r.consumed,hampers:{radish:1,marigold:1}},{...r.consumed,hampers:{radish:4,marigold:2}},{...r.consumed,unlisted:{radish:0,marigold:0}}])assert.equal(gardenSchema.safeParse({...r,consumed}).success,false);
 assert.equal(consumeGarden(r,'easels',4*H),null);
});
test('action locations are explicit per station, with independent rack and attendant rather than the ordinary bench',()=>{
 for(const station of PINE_STATIONS)assert.deepEqual(carpentryActionLocations({action:'gather-pine',station}),[{room:'square',stopId:'pine-'+station}]);
 for(const action of ['start-easel','claim-easel']as const)assert.deepEqual(carpentryActionLocations({action}),[{room:'workshop',stopId:'finishing-rack'}]);
 assert.deepEqual(carpentryActionLocations({action:'deliver-hamper'}),[{room:'square',stopId:'carpentry-desk'}]);
});

test('actual pure-rule schedules preserve separate uses and match all eighteen selected model cohorts',async()=>{
 const {carpentryRulesReport}=await import('../tools/simulate-carpentry-rules.ts');const report=carpentryRulesReport();assert.equal(report.cohorts.length,18);assert.ok(report.cohorts.every(c=>c.modelValuesMatched));
 const selected=report.cohorts.filter(c=>c.policy==='reserve-goal'&&c.days===42&&!c.absence);assert.deepEqual(selected.map(c=>c.frameClaims[0]/D),[2,1,2/3]);assert.ok(selected.every(c=>c.recordedKept===6&&c.frames===6&&c.noticeboard.phase==='open'));assert.ok(selected.every(c=>c.orders>0));
 const {readFileSync}=await import('node:fs');assert.deepEqual(JSON.parse(readFileSync('docs/evidence/IH2-067/pure-rule-schedules.json','utf8')),report);
});
test('garden sinks reject arbitrary use names; latest supported timestamps retain fixed deadlines without overflow',()=>{
 const p=ready();assert.equal(consumeGarden(p.garden,'invented' as any,4*H),null);
 const last=createCarpentry(GARDEN_TIME_MAX);assert.equal(carpentrySchema.safeParse(last).success,true);let board=createNoticeboard();for(let n=0;n<6;n++)board=recordNoticeboard(board,GARDEN_TIME_MAX).state;assert.equal(board.readyAt,Number.MAX_SAFE_INTEGER);assert.equal(noticeboardSchema.safeParse(board).success,true);
 const opened=settleNoticeboard({...board,startedAt:0,readyAt:D},D);assert.throws(()=>settleNoticeboard(opened,D-1));
});
