import{test}from'node:test';import assert from'node:assert/strict';
import{Session}from'../src/game/session.ts';import{canStand,clearSegment,routeTo,type Point}from'../src/game/world.ts';import{PARCELS}from'../src/game/neighborhood.ts';
function traverse(from:Point,to:Point,label:string){
 assert.ok(canStand('neighborhood',from),label+' start');assert.ok(canStand('neighborhood',to),label+' end');const route=routeTo('neighborhood',from,to);assert.ok(route.length,label+' route');let prior=from;for(const point of route){assert.ok(clearSegment('neighborhood',prior,point),label+' safe segment');prior=point;}
 const s=new Session();s.enter('neighborhood',from);assert.ok(s.walk(to));assert.deepEqual(s.position,from,label+' planning never snaps position');let frames=0;while(s.path.length&&frames<600){s.tick(50);assert.ok(canStand('neighborhood',s.position),label+' actual feet stay outside walls');frames++;}assert.equal(s.path.length,0,label+' completes under30simulation seconds');assert.ok(Math.hypot(s.position.x-to.x,s.position.y-to.y)<.00001,label+' exact destination');return frames*50;
}
test('every ordered residential door pair is traversable with the unchanged continuous body and speed',()=>{
 let count=0;for(const a of PARCELS)for(const b of PARCELS)if(a.slot!==b.slot){traverse(a.front,b.front,a.slot+'→'+b.slot);count++;}assert.equal(count,552);
});
test('continuous endpoints whose rounded grid centre is inside a wall join safe nodes without snapping or cutting corners',()=>{
 for(const p of PARCELS){const outsideRoof={x:p.front.x,y:p.building.y-.75},other=PARCELS[(p.slot+10)%24].front;assert.ok(canStand('neighborhood',outsideRoof));assert.equal(canStand('neighborhood',{x:Math.round(outsideRoof.x),y:Math.round(outsideRoof.y)}),false);traverse(outsideRoof,other,'fractional roof departure'+p.slot);traverse(other,outsideRoof,'fractional roof arrival'+p.slot);}
 assert.deepEqual(routeTo('neighborhood',PARCELS[0].front,{x:PARCELS[0].front.x,y:8}),[]);assert.deepEqual(routeTo('neighborhood',{x:NaN,y:1},PARCELS[0].front),[]);
});
