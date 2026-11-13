import{test}from'node:test';import assert from'node:assert/strict';
import{housingPurchase}from'../src/game/housing-view.ts';import{PLOT_CLAIM_KITS,PLOT_UPGRADE_KITS}from'../src/game/town-rules.ts';
test('housing display uses canonical separate kit prices at exact thresholds without changing stock',()=>{
 for(const kind of['claim','expand']as const){const cost=kind==='claim'?PLOT_CLAIM_KITS:PLOT_UPGRADE_KITS;for(const held of[0,cost-1,cost,cost+1]){const state={bridgeKits:held},before=structuredClone(state),v=housingPurchase(state.bridgeKits,kind,1);assert.equal(v.cost,cost);assert.equal(v.missing,Math.max(0,cost-held));assert.equal(v.canAfford,held>=cost);assert.equal(v.stock,`Bridge kits · ${held} / ${cost}`);assert.match(v.reason,held>=cost?/Ready/:new RegExp(`Need ${cost-held} more`));assert.match(v.reason,kind==='claim'?/6 furnishing nooks/:/2 workroom nooks; keeps your furniture/);assert.deepEqual(state,before);}}
});
test('expanded housing never presents further purchasable expansion even when stock exceeds price',()=>{
 for(const held of[0,23,24,99]){const v=housingPurchase(held,'expand',2);assert.equal(v.canAfford,false);assert.equal(v.reason,'Already expanded · all 8 furnishing nooks are available.');}assert.equal(housingPurchase(12,'claim').canAfford,true);
});
