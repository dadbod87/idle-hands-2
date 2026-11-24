import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {
 GLASSHOUSE_RULES, newGlasshouse, glasshouseView, reviewGlasshouse, contributeGlasshouse, glasshouseTour,
 type Glasshouse, type GlasshouseActor, type GlasshouseReview,
} from '../src/design/glasshouse-restoration.ts';

const learner = {resident:'Aster',atGlasshouse:true,pine:0,trailStamps:0};
const carpenter = {resident:'Bea',atGlasshouse:true,pine:6,trailStamps:3};
const guide = {resident:'Casey',atGlasshouse:true,pine:0,trailStamps:3};
const t = 110_000;
function review(project:Glasshouse, actor:GlasshouseActor, task:GlasshouseReview['task'], now=t) {
 const result=reviewGlasshouse(project,actor,task,now,randomUUID());
 assert.ok(result.ok);
 return result.review;
}
function confirm(project:Glasshouse, actor:GlasshouseActor, prepared:GlasshouseReview, now=t+1) {
 return contributeGlasshouse(project,actor,prepared.id,prepared,now);
}

test('three different tasks offer an empty-Bag role and protect held resources',()=>{
 const project=newGlasshouse();
 assert.deepEqual(reviewGlasshouse(project,learner,'frame',t,randomUUID()),{ok:false,reason:'pine'});
 assert.deepEqual(reviewGlasshouse(project,learner,'chart',t,randomUUID()),{ok:false,reason:'notes'});
 assert.deepEqual(reviewGlasshouse(project,{...learner,atGlasshouse:false},'entrance',t,randomUUID()),{ok:false,reason:'visit'});
 const clear=confirm(project,learner,review(project,learner,'entrance'));
 assert.ok(clear.ok);
 assert.equal(clear.debit,null);
 assert.deepEqual(glasshouseView(clear.project,t+1),{phase:'overgrown',opensAt:null,entrance:true,chart:false,frame:false});
 assert.deepEqual(project,newGlasshouse());
});

test('one worker or three neighbors can finish in any job order with one frame debit',()=>{
 const original=newGlasshouse();
 for(const actors of [[carpenter,carpenter,carpenter],[learner,carpenter,guide]]){
  const deals=[review(original,actors[0],'entrance'),review(original,actors[1],'frame'),review(original,actors[2],'chart')];
  for(const order of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]]){
   let project=original,spent=0;
   for(const [i,index] of order.entries()){
    const reply=confirm(project,actors[index],deals[index],t+i+1);
    assert.ok(reply.ok);
    assert.equal(reply.project.opensAt,i===2?t+3+GLASSHOUSE_RULES.buildMs:null);
    project=reply.project;
    spent+=reply.debit?.pine??0;
   }
   assert.equal(spent,2);
   assert.equal(carpenter.pine-spent,4);
   assert.deepEqual(original,newGlasshouse());
  }
 }
});

test('concurrent volunteers keep one frame and a stale surplus confirmation spends nothing',()=>{
 const start=newGlasshouse(),r1=review(start,carpenter,'frame');
 const volunteer={...carpenter,resident:'Devon'};
 const r2=review(start,volunteer,'frame');
 const committed=confirm(start,carpenter,r1);
 assert.ok(committed.ok);
 assert.deepEqual(committed.debit,{kind:'glasshouse-frame',pine:2});
 assert.deepEqual(confirm(committed.project,volunteer,r2,t+2),{ok:false,reason:'already'});
 assert.deepEqual(confirm(committed.project,carpenter,r1,t+3),{ok:false,reason:'already'});
 assert.equal(committed.project.work.frame?.resident,carpenter.resident);
});

test('reviews bind resident, price, deadline and present condition without blocking another task',()=>{
 const original=newGlasshouse(),prepared=review(original,carpenter,'frame');
 for(const [actor,change,now,reason] of [
  [{...carpenter,resident:'wrong'},prepared,t+1,'review'],
  [carpenter,{...prepared,pine:0},t+1,'review'],
  [carpenter,{...prepared,expiresAt:prepared.expiresAt+1},t+1,'review'],
  [carpenter,prepared,t-1,'review'],
  [carpenter,prepared,prepared.expiresAt,'review'],
  [{...carpenter,pine:1},prepared,t+1,'pine'],
  [{...carpenter,atGlasshouse:false},prepared,t+1,'visit'],
 ] as const)assert.deepEqual(contributeGlasshouse(original,actor,prepared.id,change,now),{ok:false,reason});
 assert.deepEqual(contributeGlasshouse(original,carpenter,randomUUID(),prepared,t+1),{ok:false,reason:'review'});
 const next=confirm(original,learner,review(original,learner,'entrance'));
 assert.ok(next.ok);
 assert.ok(confirm(next.project,carpenter,prepared,t+2).ok);
 assert.deepEqual(original,newGlasshouse());
});

test('fixed time passes offline, public view exposes only work states, and later visitors can tour',()=>{
 let project=newGlasshouse();
 for(const [i,task] of (['entrance','frame','chart'] as const).entries()){
  const now=t+i+1;
  const result=confirm(project,carpenter,review(project,carpenter,task,now),now);
  assert.ok(result.ok);
  project=result.project;
 }
 const opens=project.opensAt!;
 assert.equal(glasshouseView(project,opens-1)?.phase,'under-repair');
 assert.deepEqual(glasshouseView(project,opens),{phase:'open',opensAt:opens,entrance:true,chart:true,frame:true});
 assert.equal(glasshouseTour(project,learner,false,'committee-fern',opens-1),null);
 const late=glasshouseTour(project,learner,false,'committee-fern',opens+24*3_600_000);
 assert.equal(late?.plant,'committee-fern');
 assert.equal(glasshouseTour(project,learner,true,'committee-fern',opens),null);
 assert.equal(glasshouseTour(project,{...learner,atGlasshouse:false},false,'committee-fern',opens),null);
});

test('malformed stored deadlines, time going backwards and unknown extra data fail closed',()=>{
 const start=newGlasshouse(),completed=confirm(start,learner,review(start,learner,'entrance'));
 assert.ok(completed.ok);
 assert.equal(glasshouseView({...start,opensAt:42},t),null);
 assert.equal(glasshouseView({...start,privateInventory:[1]},t),null);
 assert.deepEqual(reviewGlasshouse(completed.project,carpenter,'frame',t,randomUUID()),{ok:false,reason:'clock'});
 assert.deepEqual(reviewGlasshouse({...start,opensAt:42},carpenter,'frame',t,randomUUID()),{ok:false,reason:'unreadable'});
 assert.deepEqual(reviewGlasshouse(start,carpenter,'frame',Number.MAX_SAFE_INTEGER,randomUUID()),{ok:false,reason:'clock'});
});
