// Analytical candidate only. Does not import/apply a player save or grant rewards.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {CARPENTRY_RULES as rules} from '../src/game/carpentry.ts';
const transfer=(s,requested)=>{
 const quantity=Math.min(requested,s.available,rules.carriedCap-s.carried);
 return {available:s.available-quantity,carried:s.carried+quantity,taken:s.taken+quantity};
};
let cases=0,orders=0,zeroAtFull=0;
for(let available=0;available<=rules.pineCap;available++){
 for(let carried=0;carried<=rules.carriedCap;carried++){
  const input={available,carried,taken:0},budget=Math.min(available,rules.carriedCap-carried);
  for(const ordinaryFirst of [false,true]){
   let s={...input};
   if(ordinaryFirst)s=transfer(s,rules.pineCap);
   for(let visit=0;visit<100;visit++)s=transfer(s,1);
   if(!ordinaryFirst)s=transfer(s,rules.pineCap);
   assert.equal(s.taken,budget);
   assert.equal(s.available+s.taken,available);
   assert.equal(s.carried-s.taken,carried);
   assert.ok(s.carried<=rules.carriedCap&&s.available>=0);
   orders++;
  }
  if(carried===rules.carriedCap){assert.equal(transfer(input,1).taken,0);zeroAtFull++;}
  cases++;
 }
}
const examples=[[6,0],[6,23],[6,24],[0,0]].map(([available,carried])=>({before:{available,carried},oneCandidateClaim:transfer({available,carried,taken:0},1)}));
const output={
 status:'Design analysis only; not an implemented reward, runtime test or save fixture.',
 sourceRules:{pinePoolCap:rules.pineCap,carriedCap:rules.carriedCap,refillMs:rules.pineMs},
 method:'Enumerate every integer available/carried tuple; 100 hypothetical one-pine outing claims and one ordinary batch claim, in both orders, with no time elapsed. Both actions consume the same abstract personal pool. No clock, save, authority, server, concurrency, migration or inventory sink is modeled.',
 results:{tuples:cases,orderCases:orders,claimsPerOrder:100,capacityBlockedTuples:zeroAtFull,conservationAssertionsPassed:true},
 examples,
 conclusion:'Sharing the existing pool prevents extra entitlement in this model, but gives no material payoff when the bag is full or the pool empty. It cannot alone solve the audited busy/full-player gap.',
 excluded:'Independent outing pools, refill settlement, pending claims, item use during an outing, latency, transactions and human enjoyment are not validated. Do not interpret this study as authorization to register a reward.'
};
const destination=process.argv[2]??'test-results/outing-budget-study.json';
mkdirSync(dirname(destination),{recursive:true});writeFileSync(destination,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output.results));
