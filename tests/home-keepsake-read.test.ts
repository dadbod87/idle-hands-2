import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../src/game/session.ts';
import { NATURALIST_KEEPSAKE } from '../src/game/home-keepsake.ts';
import { TILE } from '../src/game/world.ts';
import { SUNROOM_NOTEBOOK } from '../src/game/home-sunroom.ts';

test('the displayed certificate creates a readable stop only in the visited home', () => {
 const frame = NATURALIST_KEEPSAKE.frame;
 const art = {x:frame.x/TILE-.5,y:frame.y/TILE-.5};
 for (const room of ['home','home-expanded'] as const) {
  const session = new Session();
  session.enter(room,{x:9,y:11});
  assert.ok(!session.stops.some(stop=>stop.id==='home-keepsake'));
  session.setHomeStops(true,null);
  assert.ok(session.point(art));
  session.setHomeStops(false,null);
  assert.equal(session.path.length,0);
  assert.equal(session.takeArrival(),undefined);

  session.setHomeStops(true,null);
  assert.ok(session.point(art));
  for (let frame=0;frame<40;frame++)session.tick(50);
  assert.equal(session.takeArrival()?.id,'home-keepsake');
  session.enter('square');
  assert.ok(!session.stops.some(stop=>stop.id==='home-keepsake'));
 }
});


test('the Sunroom notebook only exists in the confirmed expanded room and removal cancels travel',()=>{
 const session=new Session();
 const [x,y,width,height]=SUNROOM_NOTEBOOK.doorArea!;
 const sign={x:x+width/2-0.5,y:y+height/2-0.5};
 session.setHomeStops(true,SUNROOM_NOTEBOOK);
 session.enter('home');
 assert.ok(!session.stops.some(stop=>stop.id===SUNROOM_NOTEBOOK.id));
 session.enter('home-expanded',{x:19.2,y:8});
 assert.ok(session.point(sign));
 assert.ok(session.path.length>0);
 session.setHomeStops(true,null);
 assert.equal(session.path.length,0);
 assert.equal(session.takeArrival(),undefined);
 assert.ok(session.stops.some(stop=>stop.id==='home-keepsake'));
 session.setHomeStops(false,SUNROOM_NOTEBOOK);
 assert.ok(session.point(sign));
 for(let frame=0;frame<80;frame++)session.tick(50);
 assert.equal(session.takeArrival()?.id,SUNROOM_NOTEBOOK.id);
 session.enter('square');
 assert.ok(!session.stops.some(stop=>stop.id===SUNROOM_NOTEBOOK.id));
});
