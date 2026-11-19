import {newOrchard,type OrchardRead} from '../game/orchard.ts';
import type {SharedOrchardPort} from './orchard.ts';
import type {TownClient,TownSnapshot} from './town-client.ts';

const emptyPantry = newOrchard();

function read(snapshot:TownSnapshot|null):OrchardRead {
 if(!snapshot || snapshot.orchard===undefined)return {status:'unavailable'};
 if(snapshot.orchard==='unavailable')return {status:'unreadable'};
 const raw=JSON.stringify([snapshot.playerId,snapshot.serverInstance??'',snapshot.workshop.revision]);
 return {status:'ready',raw,state:snapshot.orchard??emptyPantry};
}

export function sharedOrchard(town:TownClient,locationConfirmed:()=>boolean):SharedOrchardPort {
 const canWrite=()=>!town.isSaving&&!town.retryAvailable&&locationConfirmed();
 return {
  read:()=>read(town.snapshot),
  state:()=>{
   const pantry=town.snapshot?.orchard;
   if(pantry===undefined||pantry==='unavailable')return null;
   return pantry??emptyPantry;
  },
  now:town.serverNow,
  canWrite,
  retryAvailable:()=>town.orchardRetryAvailable,
  async save(baseline,action,present){
   const current=read(town.snapshot);
   if(current.status!=='ready')return {status:current.status};
   if(!present()||!locationConfirmed())return {status:'changed'};
   if(action && (baseline!==current.raw||!canWrite()))return {status:'changed'};
   const result=await town.orchardCommand(action,present);
   if(!result.ok)return {status:'refused',message:result.message};
   const updated=read(result.snapshot);
   if(updated.status!=='ready'||updated.raw===null)return {status:'unreadable'};
   return {status:'saved',raw:updated.raw,state:updated.state,message:result.message,fresh:!!action&&!result.replayed};
  },
 };
}
