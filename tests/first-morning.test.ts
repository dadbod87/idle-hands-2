import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FIRST_MORNING_KEY,readFirstMorning,saveFirstMorning} from '../src/game/first-morning.ts';
import {LODGING_BEDSIDE,LODGING_FRONT} from '../src/game/lodging.ts';

function fixture(){
  const data=new Map([['ih2:workshop:v2','a workshop'],['ih2:pilot-position:v1','legacy feet']]);
  let blocked=false;
  return {
    data,
    storage:{
      getItem:(key:string)=>data.get(key)??null,
      setItem:(key:string,value:string)=>{if(blocked)throw new Error('Quota');data.set(key,value);},
    },
    block:()=>{blocked=true;},
  };
}

test('first morning writes one exact safe checkpoint for rest, wake and the front step',()=>{
  const {storage,data}=fixture();
  const begin=saveFirstMorning(storage,null,{kind:'start'});
  assert.equal(begin.status,'saved');
  if(begin.status!=='saved')return;
  assert.deepEqual(begin.record,{version:1,phase:'bed',saved:{version:1,room:'lodging',position:LODGING_BEDSIDE}});
  assert.equal(saveFirstMorning(storage,begin.raw,{kind:'leave'}).status,'invalid');
  const wake=saveFirstMorning(storage,begin.raw,{kind:'wake'});
  assert.equal(wake.status,'saved');
  if(wake.status!=='saved')return;
  assert.equal(wake.record.phase,'awake');
  assert.deepEqual(wake.record.saved,begin.record.saved);
  assert.equal(saveFirstMorning(storage,begin.raw,{kind:'wake'}).status,'changed');
  const leave=saveFirstMorning(storage,wake.raw,{kind:'leave'});
  assert.equal(leave.status,'saved');
  if(leave.status!=='saved')return;
  assert.deepEqual(leave.record,{version:1,phase:'finished',saved:{version:1,room:'square',position:LODGING_FRONT}});
  assert.equal(saveFirstMorning(storage,leave.raw,{kind:'start'}).status,'invalid');
  assert.equal(saveFirstMorning(storage,leave.raw,{kind:'position',saved:{version:1,room:'square',position:{x:10.5,y:18}}}).status,'invalid');
  const travel=saveFirstMorning(storage,leave.raw,{kind:'position',saved:{version:1,room:'workshop',position:{x:9,y:11}}});
  assert.equal(travel.status,'saved');
  if(travel.status==='saved')assert.deepEqual(readFirstMorning(storage).record,travel.record);
  assert.equal(data.get('ih2:workshop:v2'),'a workshop');
  assert.equal(data.get('ih2:pilot-position:v1'),'legacy feet');
});

test('a failed or corrupt first-morning write keeps the accepted checkpoint and legacy save',()=>{
  const f=fixture();
  const prior=saveFirstMorning(f.storage,null,{kind:'start'});
  assert.equal(prior.status,'saved');
  if(prior.status!=='saved')return;
  f.block();
  assert.equal(saveFirstMorning(f.storage,prior.raw,{kind:'wake'}).status,'save-failed');
  assert.equal(f.data.get(FIRST_MORNING_KEY),prior.raw);
  const invalid=JSON.stringify({...prior.record,saved:{...prior.record.saved,position:{x:9,y:11}}});
  f.data.set(FIRST_MORNING_KEY,invalid);
  assert.equal(readFirstMorning(f.storage).status,'unreadable');
  assert.equal(saveFirstMorning(f.storage,invalid,{kind:'wake'}).status,'unreadable');
  assert.equal(f.data.get(FIRST_MORNING_KEY),invalid);
  assert.equal(f.data.get('ih2:pilot-position:v1'),'legacy feet');
});

test('the ordinary practice foot position cannot write a first-morning stage before a deliberate start',()=>{
  const {storage,data}=fixture();
  assert.equal(saveFirstMorning(storage,null,{kind:'position',saved:{version:1,room:'square',position:LODGING_FRONT}}).status,'invalid');
  assert.equal(data.has(FIRST_MORNING_KEY),false);
  assert.equal(readFirstMorning({getItem(){throw new Error('Blocked');},setItem(){}}).status,'unavailable');
});
