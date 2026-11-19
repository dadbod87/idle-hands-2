import test from 'node:test';
import assert from 'node:assert/strict';
import {start,offerStep,OFFER_WINDOW,parcelLedger,privateParcelView} from './model.ts';

const offer={kind:'offer',id:'send',offerId:'one',recipient:'flint'} as const;
const accept={kind:'accept',id:'accept',offerId:'one'} as const;
const reclaim={kind:'reclaim',id:'return',offerId:'one'} as const;
function success(step:ReturnType<typeof offerStep>){
 assert.ok(step.ok,step.message);
 return step.state;
}

test('a recipient privately accepts one reserved apple snack; a third resident cannot read or take it',()=>{
 const before=start({sorrel:2,flint:0,casey:0});
 const sent=success(offerStep(before,'sorrel',offer,10));
 assert.deepEqual(parcelLedger(sent),{available:1,reserved:1,tasted:0,made:2,conserved:true});
 assert.deepEqual(privateParcelView(sent,'casey'),[]);
 assert.equal(offerStep(sent,'casey',accept,20).ok,false);
 assert.equal(offerStep(sent,'sorrel',accept,20).ok,false);
 const after=success(offerStep(sent,'flint',accept,20));
 assert.equal(after.available.flint,1);
 assert.equal(parcelLedger(after).conserved,true);
 const same=offerStep(after,'flint',accept,21);
 assert.equal(same.replayed,true);
 assert.equal(same.state,after);
 assert.equal(offerStep(after,'flint',{...accept,kind:'decline'},21).ok,false);
 assert.equal(offerStep(after,'sorrel',reclaim,21).ok,false);
});

test('a full recipient leaves an offer pending and a sender can always reclaim the reserved space',()=>{
 let s=success(offerStep(start({sorrel:3,flint:3}),'sorrel',offer,10));
 assert.equal(offerStep(s,'flint',accept,11).ok,false);
 assert.equal(offerStep(s,'sorrel',{id:'craft',kind:'collect'},11).ok,false);
 s=success(offerStep(s,'flint',{id:'no-thanks',kind:'decline',offerId:'one'},11));
 assert.equal(parcelLedger(s).reserved,1);
 s=success(offerStep(s,'sorrel',reclaim,20));
 assert.deepEqual(s.available,{sorrel:3,flint:3});
 assert.equal(parcelLedger(s).conserved,true);
});

test('unused offers expire exactly, never wait out a player into loss, and cannot be reclaimed twice',()=>{
 const s=success(offerStep(start({sorrel:1,flint:0}),'sorrel',offer,10));
 assert.equal(offerStep(s,'flint',accept,10+OFFER_WINDOW-1).ok,true);
 assert.equal(offerStep(s,'flint',accept,10+OFFER_WINDOW).ok,false);
 assert.equal(offerStep(s,'sorrel',reclaim,9).ok,false);
 const returned=success(offerStep(s,'sorrel',reclaim,10+3*OFFER_WINDOW));
 assert.deepEqual(parcelLedger(returned),{available:1,reserved:0,tasted:0,made:1,conserved:true});
 assert.equal(offerStep(returned,'sorrel',reclaim,10+4*OFFER_WINDOW).replayed,true);
 assert.equal(offerStep(returned,'sorrel',{...reclaim,id:'retry-new'},10+4*OFFER_WINDOW).ok,false);
});

test('two willing neighbors can cross offers without owning extra stock or affecting an unrelated pantry',()=>{
 let s=start({sorrel:1,flint:1,casey:1});
 s=success(offerStep(s,'sorrel',offer,10));
 s=success(offerStep(s,'flint',{...offer,offerId:'two',recipient:'sorrel'},10));
 assert.equal(parcelLedger(s).reserved,2);
 s=success(offerStep(s,'flint',accept,11));
 s=success(offerStep(s,'sorrel',{...accept,offerId:'two'},12));
 assert.deepEqual(s.available,{sorrel:1,flint:1,casey:1});
 s=success(offerStep(s,'flint',{kind:'taste',id:'eat'},13));
 assert.deepEqual(parcelLedger(s),{available:2,reserved:0,tasted:1,made:3,conserved:true});
});


test('a failed receipt stays refused after the recipient makes room',()=>{
 const sent=success(offerStep(start({sorrel:1,flint:3}),'sorrel',offer,10));
 const refused=offerStep(sent,'flint',accept,11);
 assert.equal(refused.ok,false);
 const room=success(offerStep(refused.state,'flint',{id:'eat-to-make-room',kind:'taste'},12));
 const old=offerStep(room,'flint',accept,13);
 assert.equal(old.ok,false);
 assert.equal(old.replayed,true);
 assert.equal(old.state,room);
 const fresh=offerStep(room,'flint',{...accept,id:'new-accept'},14);
 assert.ok(fresh.ok);
 assert.equal(fresh.state.available.flint,3);
 assert.equal(parcelLedger(fresh.state).conserved,true);
});
