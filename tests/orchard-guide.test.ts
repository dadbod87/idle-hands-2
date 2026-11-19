import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newOrchard,orchardAction,PACK_SNACK_MS,type Orchard} from '../src/game/orchard.ts';
import {orchardGuide} from '../src/game/orchard-guide.ts';

const step=(pantry:Orchard,kind:Parameters<typeof orchardAction>[1],now:number)=>{
 const next=orchardAction(pantry,kind,now);
 assert.ok(next.ok);
 return next.state;
};

test('Jun points to one ripe branch, then the packing table, while leaving the pantry intact',()=>{
 const empty=newOrchard(),now=5_000;
 assert.equal(orchardGuide(empty,now,false).to,'orchard-branch-low-branch');
 const picked=step(empty,{kind:'pick',branch:'low-branch'},now);
 const before=JSON.stringify(picked);
 assert.equal(orchardGuide(picked,now,false).to,'orchard-branch-two-forks');
 assert.equal(JSON.stringify(picked),before);
 const two=step(picked,{kind:'pick',branch:'two-forks'},now);
 assert.equal(orchardGuide(two,now,false).to,'commons-orchard');
});

test('waiting gives the resident another place to go and the exact deadline returns them for collection',()=>{
 const now=5_000;
 let pantry=step(newOrchard(),{kind:'pick',branch:'low-branch'},now);
 pantry=step(pantry,{kind:'pick',branch:'two-forks'},now);
 pantry=step(pantry,{kind:'pack'},now);
 assert.equal(orchardGuide(pantry,now+PACK_SNACK_MS-1,false).to,'allotment');
 assert.match(orchardGuide(pantry,now+PACK_SNACK_MS,false).detail,/ready for collection/);
 assert.equal(orchardGuide(pantry,now+PACK_SNACK_MS,false).to,'commons-orchard');
});

test('Jun suggests tasting first and the private café shelf only where it is available',()=>{
 const oncePacked={...newOrchard(),apples:0,picked:4,packed:2,snacks:2};
 assert.equal(orchardGuide(oncePacked,0,true).to,'commons-orchard');
 const tasted=step(oncePacked,{kind:'taste'},0);
 assert.equal(orchardGuide(tasted,0,false).to,'orchard-branch-low-branch');
 assert.equal(orchardGuide(tasted,0,true).to,'cafe');
 const quiet={...tasted,snacks:0,tasted:2,ripeAt:{'low-branch':100,'two-forks':100,'over-the-path':100}};
 assert.equal(orchardGuide(quiet,0,true).to,undefined);
 assert.equal(orchardGuide(quiet,100,true).to,'orchard-branch-low-branch');
});
