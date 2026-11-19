import test from 'node:test';
import assert from 'node:assert/strict';
import {PACK_SNACK_MS,newOrchard,orchardAction,orchardStateSchema,sharedPantrySchema,type Orchard,type OrchardPantry} from '../src/game/orchard.ts';
import {transferSnack} from '../src/game/snack-shelf.ts';

function packed(snacks: number, tasted=0): Orchard {
 return {...newOrchard(), observedAt:500, picked:2*(snacks+tasted), packed:snacks+tasted, tasted, snacks};
}

const apply=(result:ReturnType<typeof transferSnack>)=>{
 assert.ok(result.ok,result.ok?'':result.message);
 return result.state;
};

test('an existing pantry upgrades lazily and keeps its harvest, work deadline, packs and tastings',()=>{
 const old={...packed(2,1),picked:8,parcel:{startedAt:490,readyAt:490+PACK_SNACK_MS}};
 const reserved=apply(transferSnack(old,'offer',501,false));
 assert.equal(reserved.snacks,1);
 assert.deepEqual(reserved.gifts,{offered:1,received:0,returned:0});
 assert.deepEqual(reserved.parcel,old.parcel);
 assert.deepEqual(reserved.ripeAt,old.ripeAt);
 assert.equal(reserved.packed,old.packed);
 assert.equal(reserved.tasted,old.tasted);
 assert.equal(reserved.picked,old.picked);
 assert.equal(orchardStateSchema.safeParse(old).success,true);
 assert.equal(orchardStateSchema.safeParse(reserved).success,false);
 assert.equal(sharedPantrySchema.safeParse(reserved).success,true);
 const gotBack=apply(transferSnack(reserved,'reclaim',502,true));
 assert.equal(gotBack.snacks,old.snacks);
 assert.equal(gotBack.tasted,old.tasted);
 assert.equal(gotBack.gifts.returned,1);
});

test('occupied slots include an outstanding offer for receiving, packing and collection',()=>{
 const full=packed(3);
 const sender=apply(transferSnack(full,'offer',501,false));
 assert.equal(transferSnack(sender,'accept',502,true).ok,false);
 assert.equal(transferSnack(sender,'offer',502,true).ok,false);
 const apples={...sender,apples:2,picked:sender.picked+2};
 assert.equal(orchardAction(apples,{kind:'pack'},502,true).ok,false);
 const made=orchardAction(apples,{kind:'pack'},502);
 assert.ok(made.ok);
 assert.equal(orchardAction(made.state,{kind:'collect'},502+PACK_SNACK_MS,true).ok,false);
 const pickedUp=orchardAction(made.state,{kind:'collect'},502+PACK_SNACK_MS);
 assert.ok(pickedUp.ok);
 assert.equal(pickedUp.state.snacks,3);
});

test('a gift can be tasted without altering the harvest ledger and invalid versions stay unreadable',()=>{
 const started=newOrchard();
 const received=apply(transferSnack(started,'accept',501,false));
 assert.equal(received.packed,0);
 const tasted=orchardAction(received,{kind:'taste'},502);
 assert.ok(tasted.ok);
 assert.equal(tasted.state.tasted,1);
 assert.equal(tasted.state.snacks,0);
 assert.equal(tasted.state.gifts.received,1);
 assert.equal(transferSnack(started,'reclaim',501,false).ok,false);
 assert.equal(transferSnack(received,'offer',500,false).ok,false);
 assert.equal(transferSnack({...received,version:3} as unknown as OrchardPantry,'offer',502,false).ok,false);
 assert.equal(sharedPantrySchema.safeParse({...received,gifts:{...received.gifts,returned:1}}).success,false);
});
