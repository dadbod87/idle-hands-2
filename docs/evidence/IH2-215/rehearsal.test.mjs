import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createEncounter, encounterAction, HEALTH, INSPECTOR_HEALTH, RECOVERY_MS} from './study/encounter.mjs';

const at=1_000_000;
const apply=(state,action,time=at)=>encounterAction(state,action,time);
const run=(...actions)=>actions.reduce((state,action)=>apply(state,action),createEncounter());

test('entry is explicit and retreat spends nothing while ending danger',()=>{
 const trail=createEncounter();
 assert.equal(apply(trail,'swing'),trail);
 const warning=run('enter','swing');
 assert.equal(warning.warning,true);
 const outside=apply(warning,'retreat');
 assert.equal(outside.phase,'trail');
 assert.equal(outside.health,HEALTH);
 assert.equal(outside.sample,'held');
 assert.equal(outside.snacks,1);
 assert.equal(outside.warning,false);
 assert.equal(apply(outside,'swing'),outside);
 assert.equal(apply(outside,'enter').inspector,INSPECTOR_HEALTH);
});

test('the wind-up changes the cost of attacking and gives guard a clear purpose',()=>{
 const exposed=run('enter','swing','swing');
 const defended=run('enter','swing','guard');
 assert.equal(exposed.health,5);
 assert.equal(defended.health,9);
 assert.equal(defended.warning,false);
 const winner=run('enter','swing','guard','swing','guard','swing','guard','swing','guard','swing');
 assert.equal(winner.phase,'cleared');
 assert.equal(winner.inspector,0);
 assert.equal(winner.health,6);
 assert.equal(winner.sample,'held');
 assert.equal(apply(winner,'swing'),winner);
});

test('one snack heals without reviving or granting another snack',()=>{
 const full=run('enter');
 assert.equal(apply(full,'snack'),full);
 const hurt=run('enter','swing','swing');
 const fed=apply(hurt,'snack');
 assert.equal(fed.health,9);
 assert.equal(fed.snacks,0);
 assert.equal(apply(fed,'snack'),fed);
});

test('bed wake has one pouch; the exact deadline is inclusive and later returns preserve the question',()=>{
 const bed=run('enter','swing','swing','swing','swing');
 assert.equal(bed.phase,'bed');
 assert.equal(bed.health,HEALTH);
 assert.equal(bed.sample,'dropped');
 assert.equal(bed.recoverUntil,at+RECOVERY_MS);
 assert.equal(apply(bed,'recover'),bed);
 const gate=apply(bed,'back');
 const onTime=apply(gate,'recover',at+RECOVERY_MS);
 assert.equal(onTime.phase,'recovered');
 assert.equal(onTime.sample,'held');
 assert.equal(apply(onTime,'recover'),onTime);
 const late=apply(gate,'recover',at+RECOVERY_MS+1);
 assert.equal(late.phase,'expired');
 assert.equal(late.sample,'dropped');
 assert.equal(apply(late,'recover'),late);
 assert.deepEqual(apply(late,'reset'),createEncounter());
});
