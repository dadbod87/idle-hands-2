import assert from 'node:assert/strict';
import {test} from 'node:test';
import {applyPigmentStudy,enrollPigmentStudy,PIGMENT_CROPS,PIGMENT_STOCK_LIMIT,pigmentStudy,pigmentStudyView,type PigmentAction} from '../src/design/nursery-pigments.ts';

const hour=3_600_000,at=Date.UTC(2026,10,24,23);
const local={opened:true,nearTray:true,nearDesk:true};
type Payload=PigmentAction extends infer T?T extends PigmentAction?Omit<T,'revision'>:never:never;
const enrollment=()=>enrollPigmentStudy(at,true)!;
function apply(state:ReturnType<typeof enrollment>,action:Payload,when:number){
 const result=applyPigmentStudy(state,{...action,revision:state.revision},when,local);
 assert.ok(result.ok,result.ok?'':result.reason);
 return result.state;
}

test('the optional trial opens with the nursery and two colors have distinct real-clock deadlines',()=>{
 assert.equal(enrollPigmentStudy(at,false),null);
 for(const plant of ['inkMint','duskBasil'] as const){
  const planted=apply(enrollment(),{kind:'plant',plant},at);
  const readyAt=at+PIGMENT_CROPS[plant].hours*hour;
  assert.equal(planted.tray?.readyAt,readyAt);
  assert.deepEqual(pigmentStudyView(planted,readyAt-1),{tray:planted.tray,remainingMs:1,phase:'growing'});
  assert.deepEqual(applyPigmentStudy(planted,{kind:'harvest',revision:1},readyAt-1,local),{ok:false,reason:'unready'});
  assert.equal(pigmentStudyView(planted,readyAt)?.phase,'ready');
  assert.equal(planted.stock[plant],0,'ready never auto-deposits');
  const afterAWeek=apply(planted,{kind:'harvest'},readyAt+7*24*hour);
  assert.equal(afterAWeek.stock[plant],1);
  assert.equal(afterAWeek.harvested[plant],1);
  assert.equal(afterAWeek.tray,null);
  assert.deepEqual(applyPigmentStudy(afterAWeek,{kind:'harvest',revision:1},readyAt+7*24*hour,local),{ok:false,reason:'stale'});
  assert.deepEqual(applyPigmentStudy(afterAWeek,{kind:'harvest',revision:2},readyAt+7*24*hour,local),{ok:false,reason:'unready'});
  assert.deepEqual(pigmentStudy.parse(JSON.parse(JSON.stringify(afterAWeek))),afterAWeek);
 }
});

test('one growing tray stays full, craft uses the exact color, and owned swatches are not spent twice',()=>{
 const planted=apply(enrollment(),{kind:'plant',plant:'inkMint'},at);
 assert.deepEqual(applyPigmentStudy(planted,{kind:'plant',plant:'duskBasil',revision:1},at,local),{ok:false,reason:'occupied'});
 const grown=apply(planted,{kind:'harvest'},at+24*hour);
 assert.deepEqual(applyPigmentStudy(grown,{kind:'make-swatch',plant:'duskBasil',finish:'dot',revision:2},at+24*hour,local),{ok:false,reason:'materials'});
 const sample=apply(grown,{kind:'make-swatch',plant:'inkMint',finish:'dot'},at+24*hour);
 assert.deepEqual(sample.stock,{inkMint:0,duskBasil:0});
 assert.deepEqual(sample.samples,['inkMint-dot']);
 assert.deepEqual(applyPigmentStudy(sample,{kind:'make-swatch',plant:'inkMint',finish:'dot',revision:3},at+24*hour,local),{ok:false,reason:'owned'});
 assert.deepEqual(grown.samples,[],'unsubmitted preview or earlier save is unmodified');
});

test('full stock, wrong station, invalid state and backward clocks preserve existing history',()=>{
 let state=enrollment(),now=at;
 for(let n=0;n<PIGMENT_STOCK_LIMIT;n++){
  state=apply(state,{kind:'plant',plant:'duskBasil'},now);
  now+=36*hour;
  state=apply(state,{kind:'harvest'},now);
 }
 const before=JSON.stringify(state);
 const seed={kind:'plant',plant:'duskBasil',revision:state.revision};
 assert.deepEqual(applyPigmentStudy(state,seed,now,local),{ok:false,reason:'capacity'});
 assert.deepEqual(applyPigmentStudy(state,seed,now-1,local),{ok:false,reason:'clock'});
 assert.deepEqual(applyPigmentStudy(state,seed,now,{...local,nearTray:false}),{ok:false,reason:'where'});
 assert.deepEqual(applyPigmentStudy({...state,stock:{inkMint:1,duskBasil:4}},seed,now,local),{ok:false,reason:'invalid'});
 assert.equal(JSON.stringify(state),before);
 state=apply(state,{kind:'make-swatch',plant:'duskBasil',finish:'stripe'},now);
 state=apply(state,{kind:'plant',plant:'duskBasil'},now);
 assert.equal(state.stock.duskBasil,3);
 assert.equal(state.harvested.duskBasil,4);
 assert.equal(state.tray?.readyAt,now+36*hour);
});
