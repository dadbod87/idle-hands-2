import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyWorkshop,createWorkshop,isCurrentWorkshop,loadWorkshop,PROP_IDS,questStep,recipeDuration,type WorkshopState} from '../src/game/workshop.ts';
import {defaultGardenRules} from '../src/game/garden.ts';
import {SURVEYS} from '../src/game/fieldwork.ts';
import {RECIPIENT_IDS} from '../src/game/commission.ts';
import {cafeWorkshopSchema,migrateCafeCandidate,serveLocalCafeCandidate,localCafeProject,type CafeWorkshopCandidate} from '../src/game/cafe-candidate.ts';
import {applyCafeOrdinaryCommand,cafeGardenRules,settleCafeWorkshopCandidate} from '../src/game/cafe-commands-candidate.ts';
import {cafeFixture,CAFE_FIXTURE_AT as at} from './helpers/cafe.ts';
const H=3_600_000,D=24*H;
function driver(initial?:CafeWorkshopCandidate){
 let state=initial??migrate(),now=state.observedAt,n=0;
 function act(raw:Record<string,unknown>,expected=true){const command={id:'compat-'+(++n),expectedRevision:state.revision,...raw};const r=applyCafeOrdinaryCommand(state,command,now);assert.equal(r.ok,expected,r.message);if(r.ok)state=r.state;assert.ok(cafeWorkshopSchema.safeParse(state).success);return{...r,command};}
 function serve(){const r=serveLocalCafeCandidate(state,{expectedRevision:state.revision,presentation:'slices'},now);assert.ok(r.ok,r.message);state=r.state;return r;}
 return{get state(){return state;},get now(){return now;},set now(v:number){now=v;},act,serve,garden:(a:Record<string,unknown>,ok=true)=>act({kind:'garden',gardenAction:a},ok),wood:(a:Record<string,unknown>,ok=true)=>act({kind:'carpentry',carpentryAction:a},ok),post:(a:Record<string,unknown>,ok=true)=>act({kind:'commission',commissionAction:a},ok)};
}
function migrate(old=createWorkshop(at)){const r=migrateCafeCandidate(old);assert.ok(r.ok);return r.state;}
function earnedTeapot(){let s=cafeFixture();for(let i=0;i<3;i++){const r=serveLocalCafeCandidate(s,{expectedRevision:s.revision,presentation:'formal'},at+i*4*H);assert.ok(r.ok);s=r.state;}return s;}
function freeze<T>(v:T):T{if(v&&typeof v==='object'){Object.freeze(v);for(const x of Object.values(v))freeze(x);}return v;}
/** Comparison only on zero-cafe histories. Never used to execute a command. */
function legacyView(s:CafeWorkshopCandidate):WorkshopState{
 assert.equal(s.cafe.totalServes,0);assert.equal(s.owned.teapot,0);
 const {cafe,version,...root}=structuredClone(s),{teapot,...owned}=root.owned,{cafe:sink,...consumed}=root.garden.consumed;
 assert.equal(sink.radish,0);
 return {...root,version:2,owned,garden:{...root.garden,version:3,consumed}} as WorkshopState;
}
test('no-cafe golden histories: every ordinary action family matches existing outcomes, quantities, timers and receipts',()=>{
 let old=createWorkshop(at),candidate=migrate(old),now=at,n=0;const kinds=new Set<string>(),actions=new Set<string>();
 const run=(raw:Record<string,any>,ok=true)=>{const body={id:'golden-'+(++n),expectedRevision:old.revision,...raw};const before=JSON.stringify({old,candidate});const a=applyWorkshop(freeze(old),body,now),b=applyCafeOrdinaryCommand(freeze(candidate),body,now);assert.equal(a.ok,ok,a.message);assert.equal(b.ok,a.ok);assert.equal(b.message,a.message);assert.equal(b.replayed,a.replayed);assert.equal(JSON.stringify({old,candidate}),before);old=a.state;candidate=b.state;assert.deepEqual(legacyView(candidate),old);assert.deepEqual(questStep(candidate),questStep(old));assert.equal(recipeDuration(candidate,'planter'),recipeDuration(old,'planter'));kinds.add(raw.kind);if(raw.gardenAction)actions.add(raw.gardenAction.action);return body;};
 const g=(a:Record<string,unknown>,ok=true)=>run({kind:'garden',gardenAction:a},ok),w=(a:Record<string,unknown>,ok=true)=>run({kind:'carpentry',carpentryAction:a},ok),p=(a:Record<string,unknown>,ok=true)=>run({kind:'commission',commissionAction:a},ok);
 for(const resource of ['scrap','timber','supplies'])run({kind:'gather',resource});run({kind:'craft',recipe:'planter'});run({kind:'claim'},false);now+=5000;run({kind:'claim'});run({kind:'place',prop:'planter',slot:'north-west'});run({kind:'craft',recipe:'bridge-kit'});
 g({action:'recover-seeds'},false);g({action:'plant',bed:0,crop:'radish'});g({action:'plant',bed:1,crop:'marigold'});g({action:'observe',bed:0});g({action:'swap-beds',from:0,to:2});
 g({action:'make-marker',marker:'leaf-fan'});g({action:'display-marker',marker:'leaf-fan'});g({action:'accept-errand'});for(const[station,choice]of [['forked','sound-end'],['striped','paint-mark'],['notched','square-notch']])g({action:'inspect-stake',station,choice});g({action:'assemble-marker'});
 w({action:'learn-saw'});w({action:'recover-saw'},false);w({action:'equip-saw',equipped:true});w({action:'gather-pine',station:'crooked'});w({action:'set-easel-goal',enabled:false});w({action:'set-easel-goal',enabled:true});
 now+=4*H;g({action:'harvest',bed:2});g({action:'harvest',bed:1});g({action:'submit-request'});g({action:'submit-request'},false);
 g({action:'plant',bed:0,crop:'radish'});g({action:'plant',bed:1,crop:'marigold'});now+=4*H;g({action:'harvest',bed:0});g({action:'harvest',bed:1});w({action:'start-easel'});w({action:'claim-easel'},false);
 p({action:'accept'});p({action:'pause',paused:true});p({action:'pause',paused:false});for(const parcel of RECIPIENT_IDS)p({action:'handover',parcel,recipient:parcel});p({action:'complete'});p({action:'make',motif:'leaf'});p({action:'style',motif:'sun'});p({action:'publish',enabled:true});
 g({action:'plant',bed:0,crop:'radish'});g({action:'plant',bed:2,crop:'radish'});g({action:'plant',bed:1,crop:'marigold'});now+=4*H;for(const bed of [0,1,2])g({action:'harvest',bed});w({action:'gather-pine',station:'forked'});w({action:'deliver-hamper'});
 now+=12*H;run({kind:'claim'});w({action:'claim-easel'});w({action:'record-easel'});run({kind:'place',prop:'rug',slot:'south-west'});run({kind:'place',prop:'rug',slot:'south-east',fromSlot:'south-west'});run({kind:'remove',slot:'south-east'});
 for(const station of ['oak','birch','fruit']as const)run({kind:'survey',station,choice:SURVEYS[station].answer});
 assert.deepEqual([...kinds].sort(),['carpentry','claim','commission','craft','garden','gather','place','remove','survey']);assert.equal(actions.size,11);
});
test('mixed real-rule history: cafe spending coexists with active jobs, all recipe sinks, crops and the one teapot',()=>{
 const d=driver();for(const resource of ['scrap','timber','supplies'])d.act({kind:'gather',resource});d.act({kind:'craft',recipe:'planter'});d.now+=5000;d.act({kind:'claim'});d.act({kind:'place',prop:'planter',slot:'north-west'});d.act({kind:'craft',recipe:'bridge-kit'});
 d.wood({action:'learn-saw'});d.wood({action:'equip-saw',equipped:true});d.wood({action:'gather-pine',station:'crooked'});
 for(const[bed,crop]of [[0,'radish'],[1,'radish'],[2,'marigold']])d.garden({action:'plant',bed,crop});d.now+=4*H;for(const bed of [0,1,2])d.garden({action:'harvest',bed});const ordinary=structuredClone(d.state.job);d.serve();const first=structuredClone(d.state.cafe);
 d.wood({action:'start-easel'});const finishing=structuredClone(d.state.carpentry.job);d.post({action:'accept'});for(const parcel of RECIPIENT_IDS)d.post({action:'handover',parcel,recipient:parcel});d.post({action:'complete'});d.post({action:'make',motif:'sun'});assert.deepEqual(d.state.cafe,first);assert.deepEqual(d.state.job,ordinary);assert.deepEqual(d.state.carpentry.job,finishing);
 for(const[bed,crop]of [[0,'radish'],[1,'radish'],[2,'marigold']])d.garden({action:'plant',bed,crop});d.now+=4*H;for(const bed of [0,1,2])d.garden({action:'harvest',bed});d.serve();d.garden({action:'plant',bed:0,crop:'radish'});d.now+=H/2;d.garden({action:'harvest',bed:0});d.wood({action:'gather-pine',station:'sheltered'});d.wood({action:'deliver-hamper'});
 d.garden({action:'plant',bed:0,crop:'radish'});d.now+=H/2;d.garden({action:'harvest',bed:0});d.now=at+5000+12*H;assert.equal(d.serve().teapotAwarded,true);const cafe=structuredClone(d.state.cafe);d.act({kind:'claim'});d.act({kind:'place',prop:'teapot',slot:'south-east'});
 d.now=at+5000+16*H;d.wood({action:'claim-easel'});d.wood({action:'record-easel'});assert.deepEqual(d.state.cafe,cafe);assert.deepEqual(d.state.garden.consumed,{easels:{radish:0,marigold:1},hampers:{radish:2,marigold:1},commission:{radish:1,marigold:0},cafe:{radish:3,marigold:0}});assert.equal(d.state.garden.harvested.radish,6);assert.equal(d.state.garden.produce.radish,0);assert.equal(d.state.owned.teapot,1);assert.equal(d.state.owned.easel,1);assert.equal(d.state.owned.letterbox,1);assert.equal(d.state.bridgeKits,1);
 d.now+=14*D;d.garden({action:'make-marker',marker:'sunburst'});assert.deepEqual(d.state.cafe,cafe);assert.equal(d.state.owned.teapot,1);assert.equal(localCafeProject(d.state).credits,3);const reload=migrateCafeCandidate(JSON.parse(JSON.stringify(d.state)));assert.ok(reload.ok);assert.deepEqual(reload.state,d.state);
});
test('rental teapot place/move/remove conserves ownership and validates trusted external allocations',()=>{
 const s=earnedTeapot(),now=s.observedAt;let n=0;const run=(state:CafeWorkshopCandidate,raw:Record<string,unknown>,external:Record<string,number>={})=>applyCafeOrdinaryCommand(state,{id:'pot-'+(++n),expectedRevision:state.revision,...raw},now,external);
 const no=run(cafeFixture(),{kind:'place',prop:'teapot',slot:'north-west'});assert.equal(no.ok,false);
 for(const bad of ([{teapot:1},{teapot:2},{teapot:-1},{teapot:NaN},{unknown:0}] as Record<string,number>[])){const r=run(s,{kind:'place',prop:'teapot',slot:'north-west'},bad);assert.equal(r.ok,false);assert.equal(r.state,s);}
 let r=run(s,{kind:'place',prop:'teapot',slot:'north-west'});assert.ok(r.ok,r.message);assert.equal(r.state.owned.teapot,1);const placed=r.state;
 assert.equal(run(placed,{kind:'place',prop:'teapot',slot:'north-east'}).ok,false);r=run(placed,{kind:'place',prop:'teapot',slot:'north-east',fromSlot:'north-west'});assert.ok(r.ok);assert.equal(r.state.placements['north-west'],null);assert.equal(r.state.placements['north-east'],'teapot');
 r=run(r.state,{kind:'remove',slot:'north-east'});assert.ok(r.ok);assert.equal(r.state.owned.teapot,1);assert.deepEqual(r.state.cafe,s.cafe);assert.deepEqual(r.state.garden.consumed.cafe,s.garden.consumed.cafe);
});
test('ordinary receipts survive cafe revisions; replay returns current cafe state and evicted stale commands cannot spend',()=>{
 const d=driver(cafeFixture());const first=d.act({kind:'gather',resource:'scrap'});d.serve();const after=structuredClone(d.state);let r=applyCafeOrdinaryCommand(d.state,first.command,d.now);assert.ok(r.replayed);assert.equal(r.state,d.state);assert.deepEqual(r.state,after);
 for(let i=0;i<70;i++)d.act(i%2?{kind:'remove',slot:'south-middle'}:{kind:'place',prop:'stool',slot:'south-middle'});
 const before=d.state;r=applyCafeOrdinaryCommand(before,first.command,d.now);assert.equal(r.ok,false);assert.equal(r.state,before);assert.equal(before.receipts.length,64);assert.equal(before.cafe.totalServes,1);assert.equal(before.garden.consumed.cafe.radish,1);
});
test('strict schemas, clock/overflow/stock refusals preserve frozen candidate data and fail atomically',()=>{
 const s=freeze(earnedTeapot()),before=JSON.stringify(s),base={id:'refuse',expectedRevision:s.revision};
 for(const raw of [{...base,kind:'craft',recipe:'teapot'},{...base,kind:'gather',resource:'radish'},{...base,kind:'place',prop:'unknown',slot:'north-west'},{...base,kind:'place',prop:'teapot',slot:'north-west',cost:0},{...base,kind:'gather',resource:'scrap',expectedRevision:0}]){const r=applyCafeOrdinaryCommand(s,raw,s.observedAt);assert.equal(r.ok,false);assert.equal(r.state,s);}
 for(const now of [NaN,Infinity,-1,s.observedAt-1,s.observedAt+.5])assert.equal(applyCafeOrdinaryCommand(s,{...base,kind:'gather',resource:'scrap'},now).state,s);
 const full=structuredClone(s);full.revision=1_000_000;assert.equal(applyCafeOrdinaryCommand(full,{...base,expectedRevision:full.revision,kind:'remove',slot:'north-west'},s.observedAt).state,full);
 const corrupt=structuredClone(s);corrupt.garden.consumed.cafe.radish=0;assert.equal(applyCafeOrdinaryCommand(corrupt,{...base,kind:'gather',resource:'scrap'},s.observedAt).state,corrupt);assert.equal(JSON.stringify(s),before);
});
test('seed recovery and garden deadline settlement preserve cafe sink, entitlement and original crop deadlines',()=>{
 const s=earnedTeapot();s.garden.seeds.radish=1;const d=driver(s),cafe=structuredClone(s.cafe);d.garden({action:'recover-seeds'});assert.equal(d.state.garden.seeds.radish,2);d.garden({action:'plant',bed:0,crop:'radish'});const ready=d.state.garden.beds[0]!.readyAt;
 assert.equal(cafeGardenRules.nextGardenDeadline(d.state.garden,d.now),ready);const input=freeze(d.state),settled=settleCafeWorkshopCandidate(input,d.now+30*D);assert.deepEqual(settled.cafe,cafe);assert.deepEqual(settled.garden,input.garden);assert.equal(settled.garden.beds[0]!.readyAt,ready);assert.equal(input.garden.consumed.cafe.radish,3);
});
test('legacy facade remains strict v2/garden3 and candidate command module is unregistered',()=>{
 const s=earnedTeapot();assert.equal(isCurrentWorkshop(s),false);assert.equal(loadWorkshop(s,s.observedAt).recovered,true);assert.equal(applyWorkshop(s as never,{id:'old',expectedRevision:s.revision,kind:'gather',resource:'scrap'},s.observedAt).ok,false);assert.throws(()=>defaultGardenRules.applyGarden(s.garden as never,{action:'recover-seeds'},s.observedAt));assert.equal(PROP_IDS.includes('teapot' as never),false);
 for(const path of ['src/main.ts','src/ui/workshop.ts','server/http.ts','server/store.ts'])assert.doesNotMatch(readFileSync(path,'utf8'),/cafe-commands-candidate|applyCafeOrdinaryCommand/);
});
test('full produce stack with prior cafe spending remains valid; refused harvest waits until a useful serve frees room',()=>{
 const d=driver(earnedTeapot());
 for(let i=0;i<3;i++){d.garden({action:'plant',bed:0,crop:'radish'});d.now+=H/2;d.garden({action:'harvest',bed:0});}
 assert.equal(d.state.garden.produce.radish,12);assert.equal(d.state.garden.harvested.radish,15);
 d.garden({action:'plant',bed:0,crop:'radish'});d.now+=H/2;const before=d.state,deadline=before.garden.beds[0]!.readyAt;
 const refused=d.garden({action:'harvest',bed:0},false);assert.equal(refused.state,before);assert.equal(d.state.garden.seeds.radish,1);assert.equal(d.state.garden.beds[0]!.readyAt,deadline);
 d.now=at+12*H;assert.equal(d.serve().teapotAwarded,false);d.garden({action:'harvest',bed:0});assert.equal(d.state.garden.produce.radish,12);assert.equal(d.state.garden.harvested.radish,16);assert.equal(d.state.garden.consumed.cafe.radish,4);assert.equal(d.state.owned.teapot,1);
});
test('mixed-produce requests after cafe retain both debits, their independent deadlines and teapot ownership',()=>{
 const d=driver(earnedTeapot());d.garden({action:'plant',bed:0,crop:'marigold'});d.now+=4*H;d.garden({action:'harvest',bed:0});
 const cafe=structuredClone(d.state.cafe);d.garden({action:'submit-request'});assert.deepEqual(d.state.cafe,cafe);assert.equal(d.state.garden.requests,1);assert.equal(d.state.garden.nextRequestAt,d.now+D);assert.deepEqual(d.state.garden.produce,{radish:8,marigold:0});
 const refused=d.state;assert.equal(d.garden({action:'submit-request'},false).state,refused);assert.equal(d.state.owned.teapot,1);
 assert.equal(d.serve().teapotAwarded,false);assert.equal(d.state.garden.consumed.cafe.radish,4);assert.equal(d.state.garden.produce.radish,7);assert.equal(d.state.garden.requests,1);assert.equal(d.state.garden.nextRequestAt,d.now+D);assert.equal(d.state.cafe.nextServeAt,d.now+4*H);assert.equal(d.state.owned.teapot,1);
});
test('shared executable rule bodies still match the recorded pre-refactor functions',async()=>{
 const {transformWithOxc}=await import('vite');const proof=JSON.parse(readFileSync('docs/evidence/IH2-107/rule-body-proof.json','utf8'));
 assert.equal(proof.functions.length,10);
 for(const f of proof.functions){const source=readFileSync(f.path,'utf8'),start=source.indexOf('function '+f.name+'('),end=source.indexOf('\n}',start);assert.ok(start>=0&&end>start);const executable=(await transformWithOxc(source.slice(start,end+2),'rules.ts')).code;assert.equal(executable,f.executable,f.name);}
});
