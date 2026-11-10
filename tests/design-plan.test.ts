import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkDesignPlan,loadDesignPlan} from '../tools/check-design-plan.ts';
const original=loadDesignPlan();
const fixture=()=>structuredClone(original);
test('design catalog preserves runtime rules, candidate status, regional access and art gaps',()=>{assert.deepEqual(checkDesignPlan(original.catalog,original.regions),[]);});
test('missing content references and later-phase ingredients cannot masquerade as usable recipes',()=>{
 const missing=fixture();missing.catalog.entries.find((e:any)=>e.id==='recipe:pine-crate').recipe.inputs[0].content_id='wood:nonexistent';assert.ok(checkDesignPlan(missing.catalog,missing.regions).some(e=>e.includes('references missing')));
 const later=fixture();later.catalog.entries.find((e:any)=>e.id==='recipe:pine-crate').recipe.inputs[0].content_id='decor:quay-lantern';assert.ok(checkDesignPlan(later.catalog,later.regions).some(e=>e.includes('later-phase')));
});
test('design-only evidence cannot silently claim shipped art or retune the existing economy',()=>{
 const claimed=fixture();claimed.catalog.entries[0].art.final_item_family_complete=true;assert.ok(checkDesignPlan(claimed.catalog,claimed.regions).some(e=>e.includes('falsely claims')));
 const retuned=fixture();retuned.catalog.entries.find((e:any)=>e.id==='recipe:bridge-kit').recipe.duration_ms=5000;assert.ok(checkDesignPlan(retuned.catalog,retuned.regions).some(e=>e.includes('existing normal production duration')));
});
test('safe housing cities cannot become dependent on a combat or lucky-access route',()=>{
 const blocked=fixture();blocked.regions.routes.find((r:any)=>r.to==='mossbank').combatRequired=true;assert.ok(checkDesignPlan(blocked.catalog,blocked.regions).some(e=>e.includes('lacks a noncombat route')));
 const lucky=fixture();lucky.regions.routes[0].luckRequired=true;assert.ok(checkDesignPlan(lucky.catalog,lucky.regions).some(e=>e.includes('must not require luck')));
});
