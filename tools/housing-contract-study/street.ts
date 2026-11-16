import {HOUSING_V1_PLANS as HOUSING_PLANS} from '../../src/design/housing-catalog-v1.ts';
import {PARCELS,addressForPlot} from '../../src/game/neighborhood.ts';
import {housingFootprintFor,residentialFrame,yardAnchors,housingBlocks} from '../../src/design/housing-contract.ts';
const canvas=document.querySelector<HTMLCanvasElement>('#street')!,ctx=canvas.getContext('2d')!,plans=document.querySelector<HTMLSelectElement>('#street-plan')!,parcels=document.querySelector<HTMLSelectElement>('#street-parcel')!;
for(const p of HOUSING_PLANS)plans.add(new Option(p.name,p.id));for(const p of PARCELS)parcels.add(new Option(addressForPlot(String(p.slot)).label,String(p.slot)));
function draw(){
 const w=innerWidth,h=Math.max(300,innerHeight-document.querySelector('header')!.offsetHeight-110);canvas.width=w;canvas.height=h;
 const frame=residentialFrame(w,h,1),parcel=PARCELS[Number(parcels.value)-1],target=HOUSING_PLANS.find(p=>p.id===plans.value)!;
 const camera={x:Math.max(frame.x,Math.min(parcel.front.x*32-w/2,frame.x+frame.width-w)),y:Math.max(frame.y,Math.min(parcel.front.y*32-h*.68,frame.y+frame.height-h))};
 ctx.fillStyle='#adbf92';ctx.fillRect(0,0,w,h);ctx.save();ctx.translate(-camera.x,-camera.y);
 // Cosmetic surround: bounded grass marks, a public perimeter walk, no invented parcels.
 for(let y=Math.floor((camera.y-80)/110)*110;y<camera.y+h+80;y+=110)for(let x=Math.floor((camera.x-100)/130)*130;x<camera.x+w+100;x+=130){const phase=Math.abs(Math.floor(x*13+y*7))%3;ctx.fillStyle=phase===0?'#a2b889':'#b6c69b';ctx.beginPath();ctx.ellipse(x+(phase*17),y,22+phase*8,10+phase*3,0,0,Math.PI*2);ctx.fill();}
 ctx.strokeStyle='#d9c9a4';ctx.lineWidth=34;ctx.strokeRect(40,30,1968,1945);ctx.beginPath();ctx.moveTo(31.5*32,0);ctx.lineTo(31.5*32,2020);ctx.stroke();
 for(const y of [15.5,28.5,41.5,54.5]){ctx.beginPath();ctx.moveTo(40,y*32);ctx.lineTo(2010,y*32);ctx.stroke();}
 for(const p of PARCELS){
  const selected=p.slot===parcel.slot,plan=selected?target:HOUSING_PLANS[(p.slot-1)%HOUSING_PLANS.length],b=housingFootprintFor(String(p.slot),plan.id);
  ctx.fillStyle=selected?'#d7e7b7':'#c8d8ac';ctx.fillRect(p.lot.x*32,p.lot.y*32,8*32,10*32);ctx.strokeStyle=selected?'#8a592c':'#93aa81';ctx.lineWidth=selected?3:1;ctx.strokeRect(p.lot.x*32,p.lot.y*32,256,320);
  ctx.fillStyle=plan.wall;ctx.fillRect(b.x*32,b.y*32,b.width*32,b.height*32);ctx.strokeStyle='#40574c';ctx.lineWidth=2;ctx.strokeRect(b.x*32,b.y*32,b.width*32,b.height*32);ctx.fillStyle=plan.roof;ctx.fillRect(b.x*32,b.y*32,b.width*32,18);
  // Stable visible doorway and approach, independent of family.
  ctx.fillStyle='#405b4d';ctx.fillRect(p.foot.x*32-17,p.foot.y*32-15,34,15);ctx.strokeStyle='#b48840';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(p.foot.x*32,p.foot.y*32);ctx.lineTo(p.front.x*32,(p.front.y+1)*32);ctx.stroke();
  ctx.fillStyle='#f9efce';ctx.beginPath();ctx.arc(p.front.x*32,p.front.y*32,7,0,Math.PI*2);ctx.fill();
  for(const a of yardAnchors(plan.id)){ctx.fillStyle='#60875e';ctx.beginPath();ctx.arc((p.lot.x+a.x)*32,(p.lot.y+a.y)*32,7,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#293d36';ctx.font='12px Georgia';ctx.textAlign='center';ctx.fillText(p.number+' '+p.street,p.front.x*32,(p.front.y+1)*32+17);
 }
 ctx.restore();document.querySelector('#street-caption')!.textContent=addressForPlot(String(parcel.slot)).label+' · '+target.name+' · same doorway · '+target.indoorNooks+' kept indoor nooks';
 Object.assign(window,{__housingStreetStudy:{snapshot:()=>({frame,camera,viewport:{width:w,height:h},parcels:PARCELS.length,selected:parcel.slot,plan:target.id,footprint:housingFootprintFor(String(parcel.slot),target.id),doorClear:!housingBlocks(String(parcel.slot),target.id,parcel.front),yard:yardAnchors(target.id),classification:'Schematic framing/ground-footprint candidate, not registered art/collision/ownership.'})}});
}
plans.onchange=draw;parcels.onchange=draw;addEventListener('resize',draw);draw();
