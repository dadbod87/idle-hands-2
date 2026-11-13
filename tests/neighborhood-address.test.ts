import{test}from'node:test';import assert from'node:assert/strict';import{frontForPlot,districtExists,PARCELS,addressForPlot}from'../src/game/neighborhood.ts';
test('physical door derivation preserves persistent plot identity and returns independent feet',()=>{
 const first=frontForPlot('1'),next=frontForPlot('25');assert.deepEqual(first.position,next.position);assert.equal(first.districtId,'1');assert.equal(next.districtId,'2');first.position.x=0;assert.equal(frontForPlot('1').position.x,PARCELS[0].front.x);assert.equal(addressForPlot('24').slot,24);
});
test('public neighborhood availability is determined by persistent IDs, not owner ordering',()=>{
 const plots=[{id:'49'},{id:'24'},{id:'25'}],copy=JSON.stringify(plots);assert.equal(districtExists('1',[]),true);assert.equal(districtExists('2',plots),true);assert.equal(districtExists('3',plots),true);assert.equal(districtExists('4',plots),false);for(const value of['0','01','-1','1.1','1e2',''])assert.equal(districtExists(value,plots),false);assert.equal(JSON.stringify(plots),copy);assert.equal(districtExists('3',[...plots].reverse()),true);
});
import{positionContextValid,exitForHome,TOWN_GATE,HOME_SITE_PREFIX}from'../src/game/neighborhood.ts';import{worlds,routeTo,canStand}from'../src/game/world.ts';import{Session}from'../src/game/session.ts';import{placesView}from'../src/game/places-view.ts';import{createWorkshop}from'../src/game/workshop.ts';
test('actual neighborhood collision, continuous routes and doorway intent reach all24site fronts',()=>{
 assert.equal(worlds.neighborhood.stops.length,26);for(const parcel of PARCELS){assert.equal(canStand('neighborhood',parcel.front),true);assert.ok(routeTo('neighborhood',TOWN_GATE,parcel.front).length);const s=new Session();s.enter('neighborhood',TOWN_GATE);assert.ok(s.approach(HOME_SITE_PREFIX+parcel.slot));let frames=0;while(s.snapshot().walking&&frames<1000){s.tick(50);frames++;}assert.ok(frames<400,'public gate route should take under20seconds at existing speed');assert.equal(s.takeArrival()?.id,HOME_SITE_PREFIX+parcel.slot);assert.deepEqual(s.position,parcel.front);}
});
test('home origin is optional for legacy entry, immutable for streets and returns exactly its own door',()=>{
 assert.deepEqual(exitForHome({homePlotId:'25',districtId:'2'}),{room:'neighborhood',districtId:'2',position:{...PARCELS[0].front}});assert.deepEqual(exitForHome({homePlotId:'1'}),{room:'square',districtId:undefined,position:{x:30,y:35.5}});
 for(const p of[{room:'home',homePlotId:'1',districtId:'2'},{room:'neighborhood'},{room:'square',districtId:'1'},{room:'neighborhood',districtId:'1',homePlotId:'1'}])assert.equal(positionContextValid(p),false);assert.throws(()=>exitForHome({homePlotId:'1',districtId:'2'}));assert.equal(positionContextValid({room:'home-expanded',homePlotId:'25',districtId:'2'}),true);
});
test('street menus retain each destination once with own door and at most three primary actions',()=>{
 const stops=worlds.neighborhood.stops,s=createWorkshop(0),view=placesView('neighborhood',stops,s,{id:'complete'},0,{districtId:'1',ownerPlotId:'3'}),all=[...view.primary,...view.groups.flatMap(g=>g.stops)];assert.equal(view.primary.length,3);assert.equal(view.groups.length,4);assert.equal(new Set(all.map(x=>x.id)).size,26);assert.equal(all.length,26);assert.ok(view.primary.some(x=>x.id==='home-site-3'));const other=placesView('neighborhood',stops,s,{id:'complete'},0,{districtId:'2',ownerPlotId:'3'});assert.equal(other.primary.length,2);assert.equal(other.groups.flatMap(g=>g.stops).length,24);
});
import{populateNeighborhoodFixture}from'../tools/neighborhood-home-fixture.ts';
test('historical population refuses protected or nonlocal destinations before touching a pool',async()=>{let queries=0;const pool={query:()=>{queries++;throw new Error('Must not reach pool');}};for(const url of['postgres://u:p@127.0.0.1:55432/ih2_preview','postgres://u:p@remote.invalid/ih2_test','postgres://u:p@127.0.0.1:55432/postgres'])await assert.rejects(()=>populateNeighborhoodFixture(pool as any,null as any,url,0),/refuses/);assert.equal(queries,0);});

import{canonicalHomePosition}from'../server/store.ts';
test('saved nonexistent street context fails closed instead of opening a phantom block',()=>{assert.throws(()=>canonicalHomePosition({room:'neighborhood',districtId:'3',position:{...TOWN_GATE}},[{id:'1'}]as any),/Unknown durable/);assert.deepEqual(canonicalHomePosition({room:'neighborhood',districtId:'1',position:{...TOWN_GATE}},[]),{room:'neighborhood',districtId:'1',position:{...TOWN_GATE}});});

import{NEIGHBORHOOD_TREES}from'../src/game/neighborhood.ts';
test('visible neighborhood trunks block feet while all public house routes stay usable',()=>{for(const[x,y]of NEIGHBORHOOD_TREES)assert.equal(canStand('neighborhood',{x:x-.5,y:y-.5}),false);for(const p of PARCELS)assert.ok(routeTo('neighborhood',TOWN_GATE,p.front).length);});

import{neighborhoodTourUrl}from'../tools/neighborhood-tour-config.ts';
test('persistent tour namespace refuses practice, remote and connection-option overrides',()=>{for(const value of['postgres://u:p@127.0.0.1:55432/ih2_preview','postgres://u:p@remote.invalid/ih2_neighborhood_tour','postgres://u:p@127.0.0.1:55432/ih2_neighborhood_tour?host=remote.invalid','postgres://u:p@127.0.0.1:55432/ih2_neighborhood_tour#other'])assert.throws(()=>neighborhoodTourUrl(value));assert.equal(neighborhoodTourUrl('postgres://u:p@127.0.0.1:55432/ih2_neighborhood_tour').pathname,'/ih2_neighborhood_tour');});
