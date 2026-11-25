import {HIDDEN_VALLEY_ROOM} from '../game/hidden-valley-room.ts';
import {MOSSBANK_ROOM} from '../game/mossbank-room.ts';
import type {Point,Stop} from '../game/world.ts';
import type {MapResident} from './town-map.ts';
import './mossbank-map.css';

const labels:Record<string,string>={
 'mossbank-return':'Road',
 'mossbank-mill':'Mill',
 'mossbank-windrow':'Alder',
 'mossbank-flume':'Flume',
 'mossbank-nursery':'Beds',
 'mossbank-hidden-valley':'Valley',
 'valley-mossbank-road':'Road',
 'valley-overlook':'View',
 'valley-grafting-house':'Grafts',
 'valley-cider-court':'Press',
 'valley-terrace-lane':'Lane',
};

function positionAt(element:HTMLElement,point:Point,meters:{width:number;height:number}){
 element.style.setProperty('--map-x',100*(point.x+.5)/meters.width+'%');
 element.style.setProperty('--map-y',100*(point.y+.5)/meters.height+'%');
}

/** Pins use the same confirmed destinations as the Places list. */
export function regionalMap(
 room:'mossbank'|'hidden-valley',position:Point,stops:Stop[],walk:(stop:Stop)=>void,
 peers?:readonly MapResident[]|null,wave?:()=>Promise<void>,
){
 const valley=room==='hidden-valley',name=valley?'Hidden Valley':'Mossbank';
 const geometry=valley?HIDDEN_VALLEY_ROOM:MOSSBANK_ROOM;
 const details=document.createElement('details');
 details.className='places-group mossbank-map';
 const summary=document.createElement('summary');
 summary.textContent=name+' map';
 details.append(summary);
 const waveButton=wave?document.createElement('button'):undefined;
 const updateResidents=(next:readonly MapResident[]|null|undefined)=>{
  peers=next;
  if(!waveButton)return;
  const hasNeighbor=next?.some(peer=>peer.room===room)??false;
  if(!hasNeighbor&&document.activeElement===waveButton)summary.focus();
  waveButton.hidden=!hasNeighbor;
 };

 details.addEventListener('toggle',()=>{
  if(!details.open||details.childElementCount>1)return;
  const figure=document.createElement('figure');
  const sketch=document.createElement('nav');
  sketch.className='mossbank-map-sketch';
  sketch.setAttribute('aria-label',name+' map destinations');
  sketch.style.aspectRatio=geometry.width+' / '+geometry.height;
  const floor=document.createElement('img');
  floor.src='/art/'+room+'/ground.svg';
  floor.alt='';
  floor.width=geometry.width*32;
  floor.height=geometry.height*32;
  sketch.append(floor);

  for(const stop of stops){
   const label=labels[stop.id];
   if(!label)continue;
   const pin=document.createElement('button');
   pin.type='button';
   pin.className='mossbank-map-pin';
   pin.textContent=label;
   pin.setAttribute('aria-label','Walk to '+stop.name);
   pin.dataset.mapDestination=stop.id;
   positionAt(pin,stop.point,geometry);
   pin.onclick=()=>walk(stop);
   sketch.append(pin);
  }
  const here=document.createElement('span');
  here.className='mossbank-map-player';
  here.setAttribute('aria-hidden','true');
  positionAt(here,position,geometry);
  if(stops.some(stop=>labels[stop.id]&&Math.hypot(stop.point.x-position.x,stop.point.y-position.y)<4.6)){
   here.dataset.nearPin='';
  }
  sketch.append(here);
  const caption=document.createElement('figcaption');
  caption.textContent='▲ You';
  figure.append(sketch,caption);
  details.append(figure);
  if(wave&&waveButton){
   const status=document.createElement('p');
   status.className='town-wave-status';
   status.role='status';
   waveButton.type='button';
   waveButton.className='destination town-wave-action';
   waveButton.textContent='Wave to Mossbank';
   waveButton.onclick=async()=>{
    waveButton.disabled=true;
    status.textContent='Sending your wave…';
    try{await wave();}
    catch(error){if(details.isConnected)status.textContent=error instanceof Error?error.message:'The wave could not be confirmed.';}
    finally{waveButton.disabled=false;}
   };
   details.append(waveButton,status);
   updateResidents(peers);
  }
 });
 return {element:details,updateResidents};
}
