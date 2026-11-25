import {MOSSBANK_ROOM} from '../game/mossbank-room.ts';
import type {Point,Stop} from '../game/world.ts';
import './mossbank-map.css';

const labels:Record<string,string>={
 'mossbank-return':'Road',
 'mossbank-mill':'Mill',
 'mossbank-windrow':'Alder',
 'mossbank-flume':'Flume',
 'mossbank-nursery':'Beds',
};

function positionAt(element:HTMLElement,point:Point){
 element.style.setProperty('--map-x',100*(point.x+.5)/MOSSBANK_ROOM.width+'%');
 element.style.setProperty('--map-y',100*(point.y+.5)/MOSSBANK_ROOM.height+'%');
}

/** Pins use the same confirmed destinations as the Places list. */
export function mossbankMap(position:Point,stops:Stop[],walk:(stop:Stop)=>void){
 const details=document.createElement('details');
 details.className='places-group mossbank-map';
 const summary=document.createElement('summary');
 summary.textContent='Mossbank map';
 details.append(summary);

 details.addEventListener('toggle',()=>{
  if(!details.open||details.childElementCount>1)return;
  const figure=document.createElement('figure');
  const sketch=document.createElement('nav');
  sketch.className='mossbank-map-sketch';
  sketch.setAttribute('aria-label','Mossbank map destinations');
  const floor=document.createElement('img');
  floor.src='/art/mossbank/ground.svg';
  floor.alt='';
  floor.width=1536;
  floor.height=1120;
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
   positionAt(pin,stop.point);
   pin.onclick=()=>walk(stop);
   sketch.append(pin);
  }
  const here=document.createElement('span');
  here.className='mossbank-map-player';
  here.setAttribute('aria-hidden','true');
  positionAt(here,position);
  sketch.append(here);
  const caption=document.createElement('figcaption');
  caption.textContent='▲ You';
  figure.append(sketch,caption);
  details.append(figure);
 });
 return details;
}
