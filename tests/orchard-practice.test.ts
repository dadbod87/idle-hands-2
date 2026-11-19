import test from 'node:test';
import assert from 'node:assert/strict';
import {
 APPLE_REGROW_MS, PACK_SNACK_MS, BROWSER_ORCHARD_KEY, ORCHARD_BRANCHES, ORCHARD_STOPS,
 newOrchard, orchardAction, orchardBranchFromStop, readOrchard, writeOrchard,
 type Orchard, type OrchardAction,
} from '../src/game/orchard.ts';
import {COMMONS_TREES,COMMONS_STOPS} from '../src/game/town-expansion.ts';
import {routeTo,canStand} from '../src/game/world.ts';

const at = 1_000_000;
function apply(state:Orchard, action:OrchardAction, now:number){
 const result=orchardAction(state,action,now);
 assert.ok(result.ok,result.message);
 return result.state;
}

test('orchard pick stops have drawable original trees, free feet and safe return routes', () => {
 const sign=COMMONS_STOPS.find(stop=>stop.id==='commons-orchard')!.point;
 for (const branch of ORCHARD_BRANCHES) {
  assert.ok(COMMONS_TREES.some(tree=>tree.kind==='fruit'&&tree.x===branch.x&&tree.y===branch.y));
  const stop=ORCHARD_STOPS.find(stop=>orchardBranchFromStop(stop.id)===branch.id)!;
  assert.ok(canStand('square',stop.point));
  assert.ok(routeTo('square',sign,stop.point).length>0);
  assert.ok(routeTo('square',stop.point,sign).length>0);
 }
});

test('three private apple branches wait independently and the basket caps without consuming ripeness', () => {
 let state=newOrchard();
 const action={kind:'pick',branch:'low-branch'} as const;
 state=apply(state,action,at);
 assert.equal(orchardAction(state,action,at+APPLE_REGROW_MS-1).ok,false);
 assert.equal(orchardAction(state,action,at-1).ok,false);
 state=apply(state,{kind:'pick',branch:'two-forks'},at);
 state=apply(state,{kind:'pick',branch:'over-the-path'},at);
 for(const branch of ORCHARD_BRANCHES)state=apply(state,{kind:'pick',branch:branch.id},at+APPLE_REGROW_MS);
 assert.equal(state.apples,6);
 const before=structuredClone(state);
 const later=at+10*APPLE_REGROW_MS;
 assert.equal(orchardAction(state,action,later).ok,false);
 assert.deepEqual(state,before);
 state=apply(state,{kind:'pack'},later);
 state=apply(state,action,later);
 assert.equal(state.apples,5);
 assert.equal(newOrchard().ripeAt['low-branch'],0);
});

test('packing costs once, collection is explicit and a taste leaves a single kept journal tally', () => {
 let state=newOrchard();
 assert.equal(orchardAction(state,{kind:'pack'},at).ok,false);
 for(const branch of ORCHARD_BRANCHES.slice(0,2))state=apply(state,{kind:'pick',branch:branch.id},at);
 state=apply(state,{kind:'pack'},at);
 assert.equal(state.apples,0);
 assert.equal(orchardAction(state,{kind:'pack'},at).ok,false);
 assert.equal(orchardAction(state,{kind:'collect'},at+PACK_SNACK_MS-1).ok,false);
 state=apply(state,{kind:'collect'},at+PACK_SNACK_MS);
 assert.equal(state.snacks,1);
 assert.equal(orchardAction(state,{kind:'collect'},at+PACK_SNACK_MS).ok,false);
 state=apply(state,{kind:'taste'},at+1_000*PACK_SNACK_MS);
 assert.deepEqual([state.apples,state.snacks,state.packed,state.tasted],[0,0,1,1]);
 assert.equal(orchardAction(state,{kind:'taste'},state.observedAt).ok,false);
});

test('strict orchard storage preserves unrelated bytes and refuses stale, failed and malformed writes', () => {
 const data=new Map<string,string>([['workshop','existing']]);
 const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value)};
 const action={kind:'pick',branch:'low-branch'} as const;
 const first=writeOrchard(storage,null,action,at);
 assert.equal(first.status,'saved');
 assert.equal(writeOrchard(storage,null,{kind:'pick',branch:'two-forks'},at).status,'changed');
 if(first.status!=='saved')throw new Error('Expected confirmed apple');
 const blocked={...storage,setItem(){throw new Error('quota')}};
 assert.equal(writeOrchard(blocked,first.raw,{kind:'pick',branch:'two-forks'},at).status,'save-failed');
 assert.equal(data.get(BROWSER_ORCHARD_KEY),first.raw);
 assert.equal(data.get('workshop'),'existing');

 const bad=JSON.stringify({...first.state,picked:0});
 data.set(BROWSER_ORCHARD_KEY,bad);
 assert.equal(readOrchard(storage).status,'unreadable');
 assert.equal(writeOrchard(storage,bad,action,at).status,'unreadable');
 assert.equal(data.get(BROWSER_ORCHARD_KEY),bad);
});
