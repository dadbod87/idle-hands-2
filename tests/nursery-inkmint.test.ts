import assert from 'node:assert/strict';
import {test} from 'node:test';
import {INKMINT_GROW_MS,inkmintSchema,inkmintStep,type Inkmint,type InkmintAction} from '../src/game/nursery-inkmint.ts';

const empty:Inkmint={phase:'empty',readyAt:null};
const start=Date.UTC(2026,10,25,15);
function step(state:Inkmint,action:InkmintAction,now=start):Inkmint{
 const result=inkmintStep(state,action,now);
 assert.equal(typeof result,'object',String(result));
 if(typeof result==='string')throw Error(result);
 return inkmintSchema.parse(result.state);
}
test('a kept plant earns exactly one finish and switching it retains the original pot',()=>{
 const growing=step(empty,'plant');
 assert.deepEqual(growing,{phase:'growing',readyAt:start+INKMINT_GROW_MS});
 assert.equal(typeof inkmintStep(growing,'collect',start+INKMINT_GROW_MS-1),'string');
 assert.equal(typeof inkmintStep(growing,'collect',NaN),'string');
 const collected=step(growing,'collect',start+INKMINT_GROW_MS);
 assert.equal(typeof inkmintStep(collected,'collect',start+INKMINT_GROW_MS*2),'string');
 assert.equal(typeof inkmintStep(collected,'apply',start),'string');
 const mixed=step(collected,'mix');
 assert.equal(typeof inkmintStep(mixed,'mix',start),'string');
 const applied=step(mixed,'apply');
 assert.deepEqual(step(step(applied,'remove'),'apply'),applied);
 assert.equal(typeof inkmintStep(mixed,'plant',start),'string');
 assert.deepEqual(empty,{phase:'empty',readyAt:null});
});
