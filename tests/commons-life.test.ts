import {test} from 'node:test';import assert from 'node:assert/strict';
import {commonsSignLayout,commonsShoreContour,commonsFrame,commonsWingPose,COMMONS_WINGS,COMMONS_MEADOWS,brushContour,commonsEdgeMarks} from '../src/art/commons-life.ts';
import {placesView} from '../src/game/places-view.ts';import {worlds} from '../src/game/world.ts';import {createWorkshop} from '../src/game/live-workshop.ts';
test('phone pond composition reveals real water while keeping the complete actor inside safe margins',()=>{
 for(const [width,height]of [[316,386],[356,586],[840,124]]){
  const position={x:69,y:67.1},before={...position},f=commonsFrame(position,width,height),cx=(position.x+.5)*32-f.x,cy=(position.y+.5)*32-f.y;
  const intersection={width:Math.max(0,Math.min(cx+width/2,63*32)-Math.max(cx-width/2,52*32)),height:Math.max(0,Math.min(cy+height/2,68*32)-Math.max(cy-height/2,60*32))};
  assert.ok(intersection.width>=48&&intersection.height>=60,JSON.stringify({width,height,intersection}));
  const actor={x:width/2+f.x,y:height/2+f.y};assert.ok(actor.x-29>=16&&actor.x+29<=width-16);assert.ok(actor.y-65>=0&&actor.y+8<=height-16);assert.deepEqual(position,before);
 }
 const sign=commonsSignLayout('commons-pond','Founders’ pond',{x:69,y:68});assert.equal(sign.hit.height,44);assert.equal(sign.board.width,88);assert.ok(sign.title.includes('\n'));
 assert.deepEqual(commonsFrame({x:24,y:25},316,386),{x:0,y:0,weight:0});assert.equal(commonsFrame({x:69,y:68},2524,1237).x,0);
 const weights=[74.9,74,73,72,71,70,69].map(x=>commonsFrame({x,y:68},316,386).weight);assert.ok(weights.every((w,i)=>i===0||w>=weights[i-1]));
});
test('ambient composition is deterministic, bounded, world-anchored and stops its wing poses under reduced motion',()=>{
 for(const ms of [0,1000,90000,1e9]){
  const poses=commonsWingPose(ms,true);assert.equal(poses.length,6);for(const [i,p]of poses.entries()){assert.ok(Math.abs(p.x-COMMONS_WINGS[i].x*32)<=20);assert.ok(Math.abs(p.y-COMMONS_WINGS[i].y*32)<=11);assert.ok(p.wing>=2&&p.wing<=5);}
  assert.deepEqual(commonsWingPose(ms,false),commonsWingPose(0,false));
 }
 for(const inset of [0,9]){const points=commonsShoreContour(52*32,60*32,11*32,8*32,inset);assert.equal(points.length,48);assert.ok(points.every(p=>p.x>=52*32+inset&&p.x<=63*32-inset&&p.y>=60*32+inset&&p.y<=68*32-inset));}
 assert.deepEqual(commonsEdgeMarks(),commonsEdgeMarks());assert.ok(commonsEdgeMarks().every(p=>p.x>=48||p.y>=48));
 for(const [i,p]of COMMONS_MEADOWS.entries()){const points=brushContour(p.x*32,p.y*32,p.rx*32,p.ry*32,i);assert.equal(points.length,36);assert.ok(points.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)&&v.x>=0&&v.y>=0&&v.x<=4096&&v.y<=3072));}
});
test('scenic browsing has its own concise group while all32existing destinations and useful-now routes remain intact',()=>{
 const s=createWorkshop(1000),before=structuredClone(s),v=placesView('square',worlds.square.stops,s,{id:'gather'},1000);
 assert.deepEqual(v.primary.map(p=>p.id),['scrap','timber','supplies']);const scenic=v.groups.find(g=>g.id==='walks')!;assert.equal(scenic.stops.length,6);assert.ok(scenic.stops.every(s=>s.id.startsWith('commons-')));assert.ok(v.groups.filter(g=>g.id!=='walks').every(g=>!g.stops.some(s=>s.id.startsWith('commons-'))));
 const legacy=['commons-riverwalk','commons-green','commons-orchard','commons-pond','commons-west','commons-meadow','residential-gate','scrap','timber','supplies','workshop','cafe','home-front','plot','survey-oak','survey-birch','survey-fruit','clerk','caretaker','courier','trail-gate','bridge','allotment','garden-registry','garden-field','stake-forked','stake-striped','carpentry-desk','pine-crooked','pine-forked','pine-sheltered','stake-notched'];
 const added=['outing-desk','outing-crossing','outing-detour','outing-post'],listed=[...v.primary,...v.groups.flatMap(g=>g.stops)].map(s=>s.id);
 assert.deepEqual(worlds.square.stops.filter(p=>!added.includes(p.id)).map(p=>p.id),legacy,'All32prior destination identities/order stay intact.');
 assert.equal(new Set(listed).size,36);assert.deepEqual([...new Set(listed)].sort(),[...legacy,...added].sort(),'Every old and new destination is visible exactly once.');assert.equal(listed.length,36);assert.deepEqual(s,before);
});
