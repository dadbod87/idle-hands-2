import assert from 'node:assert/strict';
import test from 'node:test';
import { ResidentMotion } from '../src/game/resident-motion.ts';

const clear = () => true;
const blocked = () => false;

test('peer footsteps finish at the last confirmed point and match its facing', () => {
  const resident = new ResidentMotion({x:3,y:5});
  const target = {x:4,y:5};
  resident.sample(target,100,true,clear);
  assert.equal(resident.walking,true);
  assert.equal(resident.facing,'east');
  assert.equal(resident.frame,15);
  resident.sample({...target},200,true,clear);
  assert.deepEqual(resident.position,{x:3.5,y:5});
  assert.ok(resident.frame>15);
  resident.sample({...target},400,true,clear);
  assert.deepEqual(resident.position,target);
  assert.equal(resident.walking,false);
  assert.equal(resident.frame,14);
});

test('peer jumps, obstructions and reduced motion settle without simulated footsteps', () => {
  const resident = new ResidentMotion({x:3,y:5});
  resident.sample({x:5,y:5},100,true,()=>assert.fail('Do not trace a long jump.'));
  assert.deepEqual(resident.position,{x:5,y:5});
  resident.sample({x:5,y:4},200,true,blocked);
  assert.deepEqual(resident.position,{x:5,y:4});
  assert.equal(resident.frame,7);
  resident.sample({x:5,y:3},230,true,clear);
  assert.equal(resident.walking,true);
  resident.sample({x:5,y:3},240,false,clear);
  assert.deepEqual(resident.position,{x:5,y:3});
  assert.equal(resident.walking,false);
});
