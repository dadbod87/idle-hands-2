import {test} from 'node:test';import assert from 'node:assert/strict';
import {create,apply,variants} from './model.mjs';
function walk(v,actions){let s=create(v);for(const a of actions){const before=JSON.stringify(s),r=apply(s,a);assert.equal(JSON.stringify(s),before);assert.equal(r.ok,true,r.message);s=r.state;}return s;}
const travel=to=>({kind:'travel',to});
for(const v of [0,1]){
 test('variant '+v+' has a tool-free solo detour and safe return',()=>{const route=v===0?['shed','creek','bend','lookout']:['shed','ridge','lookout'];const s=walk(v,[...route.map(travel),{kind:'sign'},...route.slice(0,-1).reverse().map(travel),travel('gate'),{kind:'finish'}]);assert.equal(s.sign,true);assert.equal(s.finished,true);assert.equal(s.cleared,false);assert.equal(s.tool,null);assert.equal(apply(s,{kind:'finish'}).ok,false);});
 test('variant '+v+' can repair its blocked route with one borrowed tool',()=>{const endpoint=variants[v].blocked[0],route=v===0?['lookout']:['bend','lookout'];const s=walk(v,[travel('shed'),{kind:'borrow',tool:variants[v].tool},travel(endpoint),{kind:'align',value:v===0?35:70},{kind:'clear'},...route.map(travel),{kind:'sign'}]);assert.equal(s.cleared,true);assert.equal(s.sign,true);});
 test('variant '+v+' refuses blocked crossing, remote repair and invalid tool without mutation',()=>{let s=walk(v,[travel('shed'),travel(variants[v].blocked[0])]);for(const a of [travel(variants[v].blocked[1]),{kind:'clear'},{kind:'borrow',tool:'rope'},{kind:'sign'},travel('gate'),{kind:'unknown'}]){const r=apply(s,a);assert.equal(r.ok,false);assert.equal(r.state,s);}assert.equal(apply(create(v),{kind:'borrow',tool:'axe'}).ok,false);});
}
test('player can leave unfinished without a tool or a loss state',()=>{const s=walk(0,[{kind:'finish'}]);assert.equal(s.sign,false);assert.equal(s.finished,true);assert.equal(s.tool,null);assert.equal(create(1).history.length,0);});

for(const v of [0,1])test('spatial repair '+v+': alignment prerequisite, bounds, broad tolerance and safe exit',()=>{
 const at=variants[v].blocked[0],target=v===0?35:70;let s=walk(v,[travel('shed'),{kind:'borrow',tool:variants[v].tool},travel(at)]);
 assert.equal(apply(s,{kind:'clear'}).ok,false);
 for(const value of [-5,105,NaN,Infinity,34.5,undefined]){const r=apply(s,{kind:'align',value});assert.equal(r.ok,false);assert.equal(r.state,s);}
 for(const offset of [-10,10]){const r=apply(s,{kind:'align',value:target+offset});assert.equal(r.ok,true);assert.equal(apply(r.state,{kind:'clear'}).ok,true);}
 const away=apply(s,{kind:'align',value:target-15});assert.equal(apply(away.state,{kind:'clear'}).ok,false);
 s=walk(v,[travel('shed'),{kind:'borrow',tool:variants[v].tool},travel(at),{kind:'align',value:target},travel('shed'),travel('gate'),{kind:'finish'}]);assert.equal(s.cleared,false);assert.equal(s.tool,null);
 assert.equal(apply(create(v),{kind:'align',value:target}).ok,false);
});
