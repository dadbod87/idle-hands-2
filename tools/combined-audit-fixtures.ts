import assert from 'node:assert/strict';
import {runCoupledNeighborhood} from './coupled-neighborhood-model.ts';
import {neighborhoodFixture} from './neighborhood-fixtures.ts';
import {applyWorkshop,isCurrentWorkshop,type WorkshopState,type WorkshopCommand} from '../src/game/workshop.ts';
import {RECIPIENT_IDS} from '../src/game/commission.ts';
import {GARDEN_DAY as DAY,GARDEN_HOUR as HOUR} from '../src/game/garden.ts';
export type LocalAuditCase='fresh'|'returning'|'both-busy'|'saturated';
export function combinedAuditFixture(kind:LocalAuditCase,end:number):{state:WorkshopState|null;disclosure:string}{
 if(kind==='fresh')return {state:null,disclosure:'Empty isolated context; ordinary donated furnishings and bound starter seeds only. No state/time/position/stock/API fixture.'};
 let state:WorkshopState;
 if(kind==='saturated'){
  state=neighborhoodFixture('saturated',end-3*DAY);let seq=0;
  const act=(action:Record<string,unknown>,now:number)=>{const r=applyWorkshop(state,{...action,id:'audit-cap-'+(++seq),expectedRevision:state.revision}as WorkshopCommand,now);assert.equal(r.ok,true,r.message);state=r.state;};
  for(const a of [{action:'learn-saw'},{action:'equip-saw',equipped:true},{action:'gather-pine',station:'crooked'}])act({kind:'carpentry',carpentryAction:a},end-3*DAY);
  for(let day=2;day>=0;day--)act({kind:'carpentry',carpentryAction:{action:'gather-pine',station:'crooked'}},end-day*DAY);
  act({kind:'commission',commissionAction:{action:'accept'}},end);for(const parcel of RECIPIENT_IDS)act({kind:'commission',commissionAction:{action:'handover',parcel,recipient:parcel}},end);act({kind:'commission',commissionAction:{action:'complete'}},end);
  assert.deepEqual(state.garden.produce,{radish:12,marigold:12});assert.equal(state.carpentry.pine.carried,24);
 }else{
  const age=kind==='returning'?14*HOUR:60000;
  state=runCoupledNeighborhood({schedule:'regular',policy:'easel-first',box:'box-first',days:1,startAt:end-21*HOUR-5000-age}).finalState;
  assert.ok(state.job&&state.carpentry.job);
  if(kind==='returning')assert.ok(state.job.readyAt<end&&state.carpentry.job.readyAt<end);
  else assert.ok(state.job.readyAt>end&&state.carpentry.job.readyAt>end);
 }
 assert.equal(isCurrentWorkshop(state),true);
 return {state,disclosure:kind==='saturated'?'Disposable elapsed local save: actual pure-command52hgarden history plus three24hpine returns/full12+12produce/24pine, finite errands and free route card. No physicalbox grant. Default square arrival position is separately injected. Not actual waits or SQL authority.':'Disposable elapsed save generated entirely by current pure commands within a regular visit schedule, then '+(kind==='returning'?'14habsence makes both held jobs/crops ready.':'60sage leaves both ordinary/easel jobs and crops running.')+' Same default square arrival is injected. Not actual waits, travel history or SQL authority.'};
}
