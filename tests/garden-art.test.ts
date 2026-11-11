import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {gardenActionFrame,GARDEN_ACTIONS,GARDEN_BEDS} from '../src/art/garden.ts';
import {FACINGS,ART} from '../src/art/kit.ts';
import {canStand,routeTo,worlds} from '../src/game/world.ts';
import {Session} from '../src/game/session.ts';
test('original runtime garden art reproduces exactly with all identities, stages and compatible foot anchors',()=>{
 const path='public/art/garden/catalog.json',catalog=JSON.parse(readFileSync(path,'utf8'));assert.equal(catalog.assets.length,31);
 const paths=[path,...catalog.assets.map((a:{id:string})=>'public/art/garden/'+a.id+'.svg')];const before=paths.map(p=>createHash('sha256').update(readFileSync(p)).digest('hex'));
 const child=spawnSync('python3',['tools/create-garden-art.py'],{encoding:'utf8'});assert.equal(child.status,0,child.stderr);assert.deepEqual(paths.map(p=>createHash('sha256').update(readFileSync(p)).digest('hex')),before);
 const rows=catalog.assets as Array<{id:string;kind:string;width:number;height:number;foot?:{x:number;y:number};frameCount?:number}>;
 assert.equal(rows.filter(a=>a.kind==='crop').length,8);assert.equal(rows.filter(a=>a.kind==='marker').length,4);assert.equal(rows.filter(a=>a.kind==='errand').length,3);
 for(const a of rows){const svg=readFileSync('public/art/garden/'+a.id+'.svg','utf8');assert.doesNotMatch(svg,/<script|<image|<foreignObject|(?:href|src)=/i);if(a.kind==='action-sheet'){assert.equal(a.width,1536);assert.equal(a.height,80);assert.equal(a.frameCount,24);assert.deepEqual(a.foot,{x:32,y:72});assert.equal(a.foot.y/a.height,ART.actorAnchor.y);}if(a.kind==='crop'||a.kind==='bed')assert.deepEqual(a.foot,{x:48,y:96});}
});
test('sow, inspect and harvest cover four directions, bounded time and a single reduced-motion still',()=>{
 const frames=new Set<number>();for(const facing of FACINGS)for(const action of GARDEN_ACTIONS){const first=gardenActionFrame(facing,action,0,false),last=gardenActionFrame(facing,action,100000,false);assert.equal(last,first+1);assert.equal(gardenActionFrame(facing,action,100000,true),first);frames.add(first);frames.add(last);}assert.equal(frames.size,24);assert.deepEqual([...frames],[...Array(24).keys()]);
});
test('allotment arrival, exits and every new station have legal routes without changing old door arrivals',()=>{
 assert.deepEqual(worlds.workshop.stops.find(s=>s.id==='door')!.arrival,{x:19.5,y:22.3});assert.deepEqual(worlds.garden.stops.find(s=>s.id==='garden-exit')!.arrival,{x:17,y:36.3});
 for(const room of ['garden','square'] as const){const origin=room==='garden'?{x:9,y:14}:{x:24,y:25};for(const stop of worlds[room].stops.filter(s=>s.id.startsWith('garden-')||s.id.startsWith('stake-')||s.id==='allotment')){assert.ok(canStand(room,stop.point),stop.id);assert.ok(routeTo(room,origin,stop.point).length,stop.id);}}
 assert.equal(GARDEN_BEDS.length,3);assert.ok(GARDEN_BEDS.every(p=>p.x>32&&p.x<17*32&&p.y<17*32));
});
test('named approach latches the intended arrival outside its artwork hit box, once, and manual steering cancels it',()=>{
 const s=new Session();assert.equal(s.approach('allotment'),true);for(let n=0;n<300&&s.path.length;n++)s.tick(50);const gate=s.takeArrival();assert.equal(gate?.id,'allotment');assert.equal(s.takeArrival(),undefined);s.enter(gate!.transition!,gate!.arrival);assert.equal(s.room,'garden');assert.deepEqual(s.position,{x:9,y:14});assert.equal(s.approach('garden-beds'),true);for(let n=0;n<100&&s.path.length;n++)s.tick(50);assert.equal(s.takeArrival()?.id,'garden-beds');assert.equal(s.approach('garden-exit'),true);s.tick(50,{x:1,y:0});assert.equal(s.takeArrival(),undefined);assert.equal(s.approach('unknown'),false);s.lock(true);assert.equal(s.approach('garden-beds'),false);
});
