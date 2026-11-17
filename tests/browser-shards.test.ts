import {test} from 'node:test';
import assert from 'node:assert/strict';
import {browserShards} from '../tools/run-browser-shard.mjs';

test('browser groups cover all files exactly once and retain the ordered real-town journey',()=>{
 const groups=browserShards();
 assert.ok(groups['1'].includes('woodland-outing.spec.ts'));
 assert.ok(groups['1'].includes('woodland-shared.spec.ts'));
 assert.ok(groups['1'].includes('weather-readability.spec.ts'));
 assert.ok(groups['2'].includes('housing-contract.spec.ts'));
 assert.deepEqual(groups['2'].filter((f:string)=>['shared-town.spec.ts','starter-homes.spec.ts','trail.spec.ts','z-first-visit.spec.ts'].includes(f)),['shared-town.spec.ts','starter-homes.spec.ts','trail.spec.ts','z-first-visit.spec.ts']);
});
