import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../src/game/session.ts';
import { NATURALIST_KEEPSAKE } from '../src/game/home-keepsake.ts';
import { TILE } from '../src/game/world.ts';

test('the displayed certificate creates a readable stop only in the visited home', () => {
 const frame = NATURALIST_KEEPSAKE.frame;
 const art = {x:frame.x/TILE-.5,y:frame.y/TILE-.5};
 for (const room of ['home','home-expanded'] as const) {
  const session = new Session();
  session.enter(room,{x:9,y:11});
  assert.ok(!session.stops.some(stop=>stop.id==='home-keepsake'));
  session.setHomeKeepsake(true);
  assert.ok(session.point(art));
  session.setHomeKeepsake(false);
  assert.equal(session.path.length,0);
  assert.equal(session.takeArrival(),undefined);

  session.setHomeKeepsake(true);
  assert.ok(session.point(art));
  for (let frame=0;frame<40;frame++)session.tick(50);
  assert.equal(session.takeArrival()?.id,'home-keepsake');
  session.enter('square');
  assert.ok(!session.stops.some(stop=>stop.id==='home-keepsake'));
 }
});
