import './style.css';
import {canStand,clearSegment,routeTo,type Point} from '../../src/game/world.ts';
import {DUNGEON,LANDING_RETURN,LOWER_START,START,type Floor,type Marker} from './plan.ts';

const canvas=document.querySelector<HTMLCanvasElement>('#world')!;
const ink=canvas.getContext('2d')!;
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.querySelector<T>('#'+id)!;
const interact=$<HTMLButtonElement>('interact');
const keys=new Set<string>(),found=new Set<string>();
const painted=new Map<string,HTMLCanvasElement>();
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const palette={safe:'#9d9574',work:'#aa9167',water:'#5a7b74',danger:'#886b59'};
let floor:Floor='upper',feet={...START},path:Point[]=[],selected:Marker|undefined;
let lift=false,exited=false,place='Lamplit landing',scale=1,width=0,height=0,tile=30,left=0,top=0;
const input:Record<string,[number,number]>={
 arrowleft:[-1,0],arrowright:[1,0],arrowup:[0,-1],arrowdown:[0,1],a:[-1,0],d:[1,0],w:[0,-1],s:[0,1],
};
const note=(message:string)=>{$('status').textContent=message;};
function arrive(next:Floor,point:Point,message:string){
 floor=next;feet={...point};path=[];keys.clear();
 $('floor').textContent=floor==='upper'?'Upper works':'Lower works';
 note(message);updateContext();draw();canvas.focus({preventScroll:true});
}
function restart(){
 lift=false;exited=false;found.clear();
 arrive('upper',START,'Tap the floor or use arrow keys. Follow the lamps down.');
}
function updateContext(){
 const level=DUNGEON[floor],x=feet.x+.5,y=feet.y+.5;
 const room=level.spaces.find(({bounds:[left,top,w,h]})=>x>=left&&x<=left+w&&y>=top&&y<=top+h);
 const name=exited?'Willow meadow':room?.name??'Connecting passage';
 if(place!==name){$('place').textContent=name;place=name;}
 const near=exited?undefined:level.markers.find(marker=>distance(marker.point,feet)<=1.45);
 if(near?.id===selected?.id)return;
 selected=near;
 interact.disabled=!near;
 interact.textContent=near?(near.kind==='chest'?'Open ':near.kind==='door'?'Use ':'Inspect ')+near.name:'Nothing nearby';
}
function use(){
 if(!selected)return;
 const {id,name,kind}=selected;
 switch(id){
  case 'exit':
   exited=true;path=[];keys.clear();note('Back at Willow meadow. Restart the walk to try another route.');break;
  case 'stairs-down':arrive('lower',LOWER_START,'Follow the spillway toward the Collector, or look for the kiln.');return;
  case 'stairs-up':arrive('upper',{x:48.6,y:9.7},'Back at the sluice bend. The inspection stripe leads to the exit.');return;
  case 'lift-top':
   if(lift){arrive('lower',{x:9.4,y:27},'The freight lift cuts out the long route.');return;}
   note('The freight lift latch opens from below.');break;
  case 'lift-bottom':
   lift=true;arrive('upper',LANDING_RETURN,'The freight lift is open. You can use it again from either level.');return;
  default:
   if(kind==='chest'){
    const wasFound=found.has(id);found.add(id);
    note(wasFound?'You already found this chest.':name+' found. The reward is a placeholder.');
   }else note(id==='collector'?'Boss arena. Leave room to escape the rush and pressure burst.':name+' habitat. This marker shows where a weaker encounter can go.');
 }
 updateContext();canvas.focus({preventScroll:true});
}
interact.onclick=use;
$<HTMLButtonElement>('restart').onclick=restart;
canvas.addEventListener('keydown',event=>{
 const key=event.key.toLowerCase();
 if(key==='e'){event.preventDefault();if(!event.repeat)use();}
 if(input[key]){event.preventDefault();keys.add(key);path=[];}
});
canvas.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
canvas.addEventListener('blur',()=>keys.clear());
canvas.addEventListener('click',event=>{
 if(exited)return;
 const bounds=canvas.getBoundingClientRect();
 const target={x:(event.clientX-bounds.left+left)/tile-.5,y:(event.clientY-bounds.top+top)/tile-.5};
 const next=routeTo('pumpworks',feet,target,DUNGEON[floor].world);
 if(next.length){path=next;keys.clear();canvas.focus({preventScroll:true});}
});
new ResizeObserver(()=>{
 const rect=canvas.getBoundingClientRect();
 width=rect.width;height=rect.height;scale=Math.min(devicePixelRatio,2);
 tile=width<550?22:30;
 canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
 draw();
}).observe(canvas);

function walk(dt:number){
 if(exited)return;
 const goal=path[0],world=DUNGEON[floor].world;
 let dx=0,dy=0;
 if(goal){dx=goal.x-feet.x;dy=goal.y-feet.y;}
 else for(const key of keys){dx+=input[key][0];dy+=input[key][1];}
 const length=Math.hypot(dx,dy);
 if(length<.001){if(goal)path.shift();return;}
 const factor=Math.min(1,dt*5/length);
 const next={x:feet.x+dx*factor,y:feet.y+dy*factor};
 if(clearSegment('pumpworks',feet,next,world)){feet=next;if(goal&&factor===1)path.shift();}
 else if(!goal){
  const horizontal={x:next.x,y:feet.y},vertical={x:feet.x,y:next.y};
  if(clearSegment('pumpworks',feet,horizontal,world))feet=horizontal;
  if(clearSegment('pumpworks',feet,vertical,world))feet=vertical;
 }else path=[];
 updateContext();
}

function mapArt(){
 const key=floor+':'+tile,existing=painted.get(key);
 if(existing)return existing;
 const level=DUNGEON[floor],art=document.createElement('canvas');
 art.width=level.world.width*tile;art.height=level.world.height*tile;
 const brush=art.getContext('2d')!;
 for(const {bounds:[x,y,w,h],kind} of level.spaces){
  brush.fillStyle='#151f1e';brush.fillRect(x*tile-4,y*tile-4,w*tile+8,h*tile+8);
  brush.fillStyle=palette[kind];brush.fillRect(x*tile,y*tile,w*tile,h*tile);
 }
 for(const [x,y,w,h] of level.passages){brush.fillStyle='#857c63';brush.fillRect(x*tile,y*tile,w*tile,h*tile);}
 for(let y=0;y<level.world.height;y++)for(let x=0;x<level.world.width;x++){
  if(!canStand('pumpworks',{x,y},level.world))continue;
  brush.fillStyle=(x+y)%2===0?'#f7e9af18':'#231e1412';brush.fillRect(x*tile,y*tile,tile,tile);
  if((x*7+y*13)%11===0){brush.fillStyle='#322e214f';brush.fillRect((x+.2)*tile,(y+.3)*tile,.32*tile,2);}
 }
 const stripes=floor==='upper'?[[6.5,28.5],[12.5,28.5],[12.5,10.5],[49.5,10.5],[49.5,8.5]]
  :[[18.5,29.5],[18.5,14.5],[35.5,14.5]];
 brush.save();
 brush.strokeStyle='#f4d68e';brush.lineWidth=3;brush.setLineDash([9,6]);brush.beginPath();
 for(const [x,y] of stripes)brush.lineTo(x*tile,y*tile);
 brush.stroke();brush.restore();
 for(const [x,y] of (floor==='upper'?[[8,26],[12,19],[12,11],[24,9],[39,9],[49,10]]:[[18,33],[19,27],[18,21],[18,14],[30,13]]) as Array<[number,number]>){
  const cx=(x+.5)*tile,cy=(y+.5)*tile;
  const light=brush.createRadialGradient(cx,cy,2,cx,cy,tile*.78);
  light.addColorStop(0,'#ffe0a479');light.addColorStop(1,'#ffdb9c00');
  brush.fillStyle=light;brush.fillRect(cx-tile,cy-tile,tile*2,tile*2);
 }
 painted.set(key,art);
 return art;
}

function draw(){
 if(!width||!height)return;
 const level=DUNGEON[floor];
 left=Math.max(0,Math.min(level.world.width*tile-width,(feet.x+.5)*tile-width*.5));
 top=Math.max(0,Math.min(level.world.height*tile-height,(feet.y+.5)*tile-height*.5));
 ink.setTransform(scale,0,0,scale,0,0);
 ink.fillStyle=exited?'#576b55':'#202d2b';ink.fillRect(0,0,width,height);
 if(exited){
  ink.fillStyle='#eee6c9';ink.font='bold 23px Georgia';ink.textAlign='center';ink.fillText('Willow meadow',width*.5,height*.5);return;
 }
 ink.translate(-left,-top);
 ink.drawImage(mapArt(),0,0);
 const markerInk={door:'#e6ce8e',chest:'#ecb75e',foe:'#bb7958',boss:'#cf776a'};
 for(const marker of level.markers){
  if(distance(marker.point,feet)>12)continue;
  const x=(marker.point.x+.5)*tile,y=(marker.point.y+.5)*tile;
  const open=found.has(marker.id);
  const fill=open?'#c5bda2':markerInk[marker.kind];
  if(marker.kind==='boss'){
   ink.fillStyle='#352e27';ink.fillRect(x-23,y-32,46,38);
   ink.fillStyle=fill;ink.fillRect(x-18,y-27,36,27);
   ink.fillStyle='#392d28';
   ink.fillRect(x-21,y-11,9,18);ink.fillRect(x+12,y-11,9,18);
   ink.fillRect(x-8,y-23,16,11);
   ink.fillStyle='#f7dc91';
   ink.fillRect(x-4,y-20,8,5);
   ink.strokeStyle='#d39a75';ink.lineWidth=3;
   ink.beginPath();ink.moveTo(x-12,y-29);ink.lineTo(x-12,y-39);ink.lineTo(x+5,y-39);ink.stroke();
  }else{
   ink.fillStyle='#29332a';ink.fillRect(x-14,y-11,28,22);
   ink.fillStyle=fill;ink.fillRect(x-12,y-9,24,18);
   if(marker.kind==='chest'){
    ink.fillStyle='#715139';ink.fillRect(x-12,y-2,24,3);ink.fillStyle='#fff1c0';ink.fillRect(x-2,y-3,4,6);
   }else if(marker.kind==='door'){
    ink.strokeStyle='#786046';ink.lineWidth=2;
    for(let rail=-5;rail<=5;rail+=5){ink.beginPath();ink.moveTo(x-8,y+rail);ink.lineTo(x+8,y+rail);ink.stroke();}
   }else{
    ink.fillStyle='#38453a';ink.fillRect(x-6,y-3,3,3);ink.fillRect(x+3,y-3,3,3);
   }
  }
  if(x>=left&&x<=left+width&&y>=top&&y<=top+height&&(marker===selected||distance(marker.point,feet)<7)){
   ink.font='bold 13px Georgia';ink.textAlign='center';
   const labelWidth=ink.measureText(marker.name).width+12;
   const labelX=Math.min(left+width-labelWidth/2-4,Math.max(left+labelWidth/2+4,x));
   const labelY=Math.min(top+height-23,Math.max(top+4,y+13));
   ink.fillStyle='#f1e5c7';ink.fillRect(labelX-labelWidth/2,labelY,labelWidth,19);
   ink.fillStyle='#303a30';ink.fillText(marker.name,labelX,labelY+14);
  }
 }
 const px=(feet.x+.5)*tile,py=(feet.y+.5)*tile;
 ink.fillStyle='#202d2b';ink.beginPath();ink.ellipse(px,py+4,9,5,0,0,Math.PI*2);ink.fill();
 ink.fillStyle='#f5d389';ink.strokeStyle='#304239';ink.lineWidth=2;
 ink.beginPath();ink.arc(px,py-2,7,0,Math.PI*2);ink.fill();ink.stroke();
}
let last=performance.now();
function frame(now:number){walk(Math.min(.041,(now-last)/1000));draw();last=now;requestAnimationFrame(frame);}
Object.assign(window,{__lowerPumpworksStudy:{snapshot:()=>({floor,feet:{...feet},walking:!!path.length,place,lift,exited,found:[...found],near:selected?.id??null}),screenPoint:(point:Point)=>({x:(point.x+.5)*tile-left,y:(point.y+.5)*tile-top})}});
requestAnimationFrame(frame);
