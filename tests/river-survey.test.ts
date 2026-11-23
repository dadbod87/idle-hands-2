import assert from 'node:assert/strict';
import test from 'node:test';
import {applyRiverSurvey,readRiverSurvey,CAST_MS,RIVER_SPOT_IDS} from '../src/game/river-survey.ts';

test('river survey keeps one cast, waits through reload and records each spot exactly once',()=>{
 const start=readRiverSurvey(null),t=Date.UTC(2026,10,23);
 let current=start,now=t;
 for(const spot of RIVER_SPOT_IDS){
  current=applyRiverSurvey(current,{kind:'cast',spot},now);
  assert.throws(()=>applyRiverSurvey(current,{kind:'cast',spot},now),/already out/);
  const saved=readRiverSurvey(JSON.stringify(current));
  assert.deepEqual(saved.cast,current.cast);
  const reel={kind:'reel',cast:saved.cast!} as const;
  assert.throws(()=>applyRiverSurvey(saved,reel,now+CAST_MS-1),/still quiet/);
  now+=CAST_MS;
  current=applyRiverSurvey(saved,reel,now);
  assert.throws(()=>applyRiverSurvey(current,reel,now),/changed elsewhere/);
  assert.throws(()=>applyRiverSurvey(current,{kind:'cast',spot},now),/already surveyed/);
 }
 assert.deepEqual(current.recorded,RIVER_SPOT_IDS);
 assert.deepEqual(start.recorded,[]);
});

test('river survey rejects unsupported records, duplicate finds and a stale reel',()=>{
 assert.throws(()=>readRiverSurvey('{"version":1,"recorded":["reeds","reeds"],"cast":null}'));
 assert.throws(()=>readRiverSurvey('{"version":2,"recorded":[],"cast":null}'));
 assert.throws(()=>readRiverSurvey('{"version":1,"recorded":["reeds"],"cast":{"spot":"reeds","readyAt":20}}'));
 const now=Date.UTC(2026,10,23);
 const state=applyRiverSurvey(readRiverSurvey(null),{kind:'cast',spot:'bridge'},now);
 assert.throws(()=>applyRiverSurvey(state,{kind:'reel',cast:{spot:'bridge',readyAt:now}},now+CAST_MS),/changed elsewhere/);
 assert.throws(()=>applyRiverSurvey(state,{kind:'reel',cast:state.cast!},NaN),/clock/);
});
