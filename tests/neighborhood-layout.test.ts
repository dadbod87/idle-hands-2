import{test}from'node:test';import{readFileSync}from'node:fs';import assert from'node:assert/strict';import{PARCELS,TOWN_GATE,addressForPlot,plotAtAddress,candidateCanStand,routeToParcel,routeLength}from'../tools/neighborhood-layout.ts';
test('candidate residential block has24 distinct intact homes, door-front arrivals and walkable public routes',()=>{
 const art=JSON.parse(readFileSync('public/art/homes/catalog.json','utf8'));for(const id of['home-starter-exterior','home-expanded-exterior']){const a=art.assets.find((x:any)=>x.id===id);assert.equal(a.width,208);assert.equal(a.height,248);assert.deepEqual(a.foot,{x:104,y:240});}
 assert.equal(PARCELS.length,24);const used=new Set();
 for(const p of PARCELS){assert.equal(used.has(p.slot),false);used.add(p.slot);assert.equal(p.building.width*32,208);assert.equal(p.building.height*32,240);assert.ok(candidateCanStand(p.front));const route=routeToParcel(p.slot);assert.deepEqual(route[0],TOWN_GATE);assert.deepEqual(route.at(-1),p.front);
  for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],length=Math.hypot(b.x-a.x,b.y-a.y);for(let j=0;j<=Math.ceil(length*10);j++){const t=j/Math.max(1,Math.ceil(length*10));assert.ok(candidateCanStand({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}),'public route blocked for'+p.slot);}}
  assert.ok(routeLength(route)/5<20,'candidate unobstructed walk must stay below20seconds at accepted5tiles/sec');
 }
});
test('address identity remains stable across large IDs, sort order and additional blocks without a finite housing cap',()=>{
 for(const id of['1','24','25','48','49','999999999999999999']){const a=addressForPlot(id);assert.equal(plotAtAddress(a.block,a.slot),id);assert.deepEqual(addressForPlot(id),a);}
 assert.equal(addressForPlot('24').block,'1');assert.equal(addressForPlot('25').block,'2');assert.equal(addressForPlot('25').slot,1);
 const addresses=Array.from({length:10000},(_,i)=>addressForPlot(String(i+1)).label);assert.equal(new Set(addresses).size,addresses.length);
 for(const id of['0','01','-1','1.5','1e3','1000000000000000000',''])assert.throws(()=>addressForPlot(id));
 for(const[block,slot]of[['0',1],['1',0],['1',25],['1',1.5]]as const)assert.throws(()=>plotAtAddress(block,slot));
});
