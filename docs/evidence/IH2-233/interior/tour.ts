import {GLASSHOUSE_ENTRY,GLASSHOUSE_ROOM} from '../../../../src/design/glasshouse-room.ts';
import {routeTo,type Point,type Stop} from '../../../../src/game/world.ts';

const inside=document.querySelector<HTMLElement>('#inside')!;
const outside=document.querySelector<HTMLElement>('#outside')!;
const note=document.querySelector<HTMLParagraphElement>('#stop-note')!;
const resident=document.querySelector<HTMLImageElement>('#resident')!;
const destinations=document.querySelector<HTMLElement>('.destinations')!;
const room=document.querySelector<HTMLElement>('.room')!;
const exit=document.querySelector<HTMLButtonElement>('#exit')!;
const enter=document.querySelector<HTMLButtonElement>('#return')!;
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
const quiet='Choose a stop. Your resident walks there.';
const buttons=new Map<string,HTMLButtonElement>();
let position={...GLASSHOUSE_ENTRY};
let frame=0;
let glint:HTMLElement|undefined;

function draw(point:Point){
 position=point;
 resident.style.left=`${point.x/GLASSHOUSE_ROOM.width*100}%`;
 resident.style.top=`${point.y/GLASSHOUSE_ROOM.height*100}%`;
}
function notice(text:string){if(note.textContent!==text)note.textContent=text;}
function finish(stop:Stop){
 frame=0;
 if(stop.id==='glasshouse-exit'){
  inside.hidden=true;
  outside.hidden=false;
  enter.focus({preventScroll:true});
  return;
 }
 buttons.get(stop.id)?.setAttribute('aria-current','location');
 notice(stop.text);
 if(reduceMotion.matches||!['fern-table','sundew-table'].includes(stop.id))return;
 const dot=document.createElement('span');
 dot.className='glint';
 dot.style.left=`${(stop.id==='fern-table'?5.25:13.2)/GLASSHOUSE_ROOM.width*100}%`;
 dot.style.top='34%';
 room.append(dot);
 glint=dot;
 void dot.animate([{opacity:0},{opacity:.8,offset:.4},{opacity:0,transform:'translateY(-9px)'}],650)
  .finished.then(()=>dot.remove());
}
function visit(stop:Stop){
 const path=routeTo('workshop',position,stop.point,GLASSHOUSE_ROOM);
 if(!path.length){notice('That table is out of reach from here.');return;}
 cancelAnimationFrame(frame);
 glint?.remove();
 for(const button of buttons.values())button.removeAttribute('aria-current');
 if(reduceMotion.matches){draw(stop.point);finish(stop);return;}
 notice('Walking to '+stop.name.toLowerCase()+'…');
 let from=position,target=path.shift()!,started=performance.now();
 const speed=12;
 function walk(now:number){
  const distance=Math.hypot(target.x-from.x,target.y-from.y);
  const progress=distance?Math.min(1,(now-started)*speed/1000/distance):1;
  draw({x:from.x+(target.x-from.x)*progress,y:from.y+(target.y-from.y)*progress});
  if(progress===1){
   const next=path.shift();
   if(!next){finish(stop);return;}
   from=target;target=next;started=now;
  }
  frame=requestAnimationFrame(walk);
 }
 frame=requestAnimationFrame(walk);
}
for(const stop of GLASSHOUSE_ROOM.stops){
 const button=stop.id==='glasshouse-exit'?exit:document.createElement('button');
 if(button!==exit){
  const mark=document.createElement('span');
  mark.className='arrival-mark';
  mark.textContent='✓';
  mark.setAttribute('aria-hidden','true');
  button.type='button';
  button.append(mark,stop.name);
  destinations.append(button);
 }
 buttons.set(stop.id,button);
 button.addEventListener('click',()=>visit(stop));
}
enter.addEventListener('click',()=>{
 outside.hidden=true;
 inside.hidden=false;
 draw(GLASSHOUSE_ENTRY);
 for(const button of buttons.values())button.removeAttribute('aria-current');
 notice(quiet);
 note.focus({preventScroll:true});
});
draw(GLASSHOUSE_ENTRY);
