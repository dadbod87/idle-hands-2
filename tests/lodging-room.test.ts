import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {Pool} from 'pg';
import {TownStore as HistoricalTownStore} from '../server/store.ts';
import {TownStore, canonicalHomePosition} from '../server/live-store.ts';
import {Session} from '../src/game/session.ts';
import {canStand, clearSegment, routeTo, worlds} from '../src/game/world.ts';
import {LODGING_BEDSIDE, LODGING_DOOR, LODGING_FRONT, LODGING_ROOM, squareWithLodging} from '../src/game/lodging.ts';

test('browser lodging returns through the same visible front door and shares no room context',()=>{
  const geometry=squareWithLodging(worlds.square);
  const exit=LODGING_ROOM.stops.find(stop=>stop.id==='lodging-exit')!;
  assert.deepEqual(exit.arrival,LODGING_DOOR.point);
  assert.ok(canStand('square',LODGING_FRONT,geometry));
  assert.ok(canStand('lodging',LODGING_BEDSIDE,LODGING_ROOM));
  assert.ok(routeTo('lodging',LODGING_BEDSIDE,exit.point,LODGING_ROOM).length);
  const clerk=worlds.square.stops.find(stop=>stop.id==='clerk')!;
  const path=routeTo('square',LODGING_FRONT,clerk.point,geometry);
  assert.ok(path.length);
  assert.ok(path.every((leg,index)=>clearSegment('square',index===0?LODGING_FRONT:path[index-1],leg,geometry)));
  assert.equal(worlds.square.stops.includes(LODGING_DOOR),false);
  assert.throws(()=>new Session().enter('lodging'),/browser practice/);
});

test('only a valid old position covered by the browser lodging is moved to the front steps',()=>{
  const old={version:1,room:'square',position:{x:10.5,y:18}};
  const local=new Session(old,undefined,true);
  assert.equal(local.recoveredLodgingFootprint,true);
  assert.deepEqual(local.position,LODGING_FRONT);
  const relocated=new Session(local.save(),undefined,true);
  assert.equal(relocated.recoveredLodgingFootprint,false);
  assert.deepEqual(relocated.position,LODGING_FRONT);
  const shared=new Session(old);
  assert.deepEqual(shared.position,old.position);
  const safe={...old,position:{x:12.3,y:23.4}};
  assert.deepEqual(new Session(safe,undefined,true).save(),safe);
  assert.equal(new Session({...old,position:{x:-1,y:18}},undefined,true).recoveredLodgingFootprint,false);
});

test('the browser room can resume in place and walks around furniture with the existing movement model',()=>{
  const s=new Session(undefined,undefined,true);
  s.enter('lodging',LODGING_BEDSIDE);
  const resume=new Session(s.save(),undefined,true);
  assert.deepEqual(resume.save(),s.save());
  assert.equal(resume.nearby()?.id,'lodging-note');
  const exit=LODGING_ROOM.stops.find(stop=>stop.id==='lodging-exit')!;
  assert.ok(resume.approach(exit.id));
  for(let frame=0;frame<100;frame++){
    resume.tick(50);
    assert.ok(canStand('lodging',resume.position,LODGING_ROOM));
  }
  assert.equal(resume.takeArrival()?.id,exit.id);
  resume.enter(exit.transition!,exit.arrival);
  assert.deepEqual(resume.position,LODGING_FRONT);
});

test('both shared stores reject a browser boarding-room position before persistence',async()=>{
  const position={room:'lodging',position:LODGING_BEDSIDE} as const;
  let reads=0;
  const pool={query(){reads++;throw new Error('Unexpected persistence');}} as unknown as Pool;
  await assert.rejects(new TownStore(pool).savePosition('aster',position),/Invalid server-validated position/);
  await assert.rejects(new HistoricalTownStore(pool).savePosition('aster',position),/Invalid server-validated position/);
  assert.throws(()=>canonicalHomePosition(position,[]),/Invalid durable room context/);
  assert.equal(reads,0);
});
