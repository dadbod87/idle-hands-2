import { test } from 'node:test';
import assert from 'node:assert/strict';
import { links, routesFrom, safeGround, stops, walkingSpeed } from './layout.mjs';

test('every open route follows its dry ground and legitimate crossing', () => {
  for (const repaired of [false,true]) {
    for (const [a,b,phase] of links) {
      if (phase && !repaired) continue;
      for (let step=0; step<=250; step++) {
        const t=step/250;
        const point={x:stops[a].x+(stops[b].x-stops[a].x)*t,y:stops[a].y+(stops[b].y-stops[a].y)*t};
        assert.ok(safeGround(point,repaired), `${a} → ${b} crosses an obstacle at ${t}`);
      }
    }
  }
});

test('a late visitor can do a quick local visit and reach every service before repair', () => {
  const open=routesFrom('gate');
  assert.ok(open.get('notice').tiles / walkingSpeed < 8);
  for(const name of ['westLodge','woodYard','canal','nursery','homes','quay']){
    assert.ok(open.get(name).tiles / walkingSpeed < 30);
    assert.ok(!open.get(name).ids.includes('northEast') || open.get(name).ids.includes('southEast'));
  }
});

test('repair makes a useful shortcut without moving the existing gate or home sites', () => {
  assert.ok(!safeGround({x:60,y:27},false));
  assert.ok(safeGround({x:60,y:27},true));
  const before=routesFrom('gate'), after=routesFrom('gate',true);
  assert.ok(after.get('woodYard').ids.includes('northWest'));
  assert.ok((before.get('woodYard').tiles - after.get('woodYard').tiles)/walkingSpeed >= 6);
  assert.deepEqual(before.get('homes'),after.get('homes'));
});
