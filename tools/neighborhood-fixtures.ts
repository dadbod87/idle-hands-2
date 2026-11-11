import {createWorkshop,applyWorkshop,type WorkshopState} from '../src/game/workshop.ts';
import {STAKE_IDS,STAKE_STUDIES} from '../src/game/garden.ts';
import {SURVEY_IDS,SURVEYS} from '../src/game/fieldwork.ts';

/** Disposable browser-only elapsed fixtures. Never load these into a shared or real account. */
export function neighborhoodFixture(kind:'returning'|'saturated',end:number):WorkshopState{
 let now=end-(kind==='returning'?14:52)*3600000-(kind==='saturated'?5000:0),state=createWorkshop(now),sequence=0;
 const act=(command:Record<string,unknown>)=>{const r=applyWorkshop(state,{...command,id:'depth-fixture-'+(++sequence),expectedRevision:state.revision} as Parameters<typeof applyWorkshop>[1],now);if(!r.ok)throw new Error('Fixture command declined: '+r.message);state=r.state;};
 const garden=(gardenAction:Record<string,unknown>)=>act({kind:'garden',gardenAction});
 for(const resource of ['scrap','timber','supplies'])act({kind:'gather',resource});
 act({kind:'craft',recipe:'planter'});now+=5000;act({kind:'claim'});act({kind:'place',prop:'planter',slot:'north-east'});act({kind:'craft',recipe:'bridge-kit'});
 for(const [bed,crop]of ['radish','radish','marigold'].entries())garden({action:'plant',bed,crop});
 if(kind==='returning')return state;
 const started=now;
 for(let visit=1;visit<=12;visit++){
  now=started+visit*4*3600000;
  for(let bed=0;bed<3;bed++){const b=state.garden.beds[bed];if(b&&b.readyAt<=now&&state.garden.produce[b.crop]<12)garden({action:'harvest',bed});}
  for(let bed=0;bed<3;bed++)if(!state.garden.beds[bed]){const crop=state.garden.seeds.marigold?'marigold':state.garden.seeds.radish?'radish':null;if(crop)garden({action:'plant',bed,crop});}
 }
 now=end;
 for(const resource of ['scrap','timber','supplies'])act({kind:'gather',resource});
 for(const marker of ['sunburst','leaf-fan','little-pennant'])garden({action:'make-marker',marker});
 garden({action:'accept-errand'});for(const station of STAKE_IDS)garden({action:'inspect-stake',station,choice:STAKE_STUDIES[station].answer});garden({action:'assemble-marker'});
 for(const station of SURVEY_IDS)act({kind:'survey',station,choice:SURVEYS[station].answer});
 garden({action:'submit-request'});
 for(const crop of ['radish','marigold'] as const){const bed=state.garden.beds.findIndex(b=>b?.crop===crop&&b.readyAt<=now);if(bed<0)throw new Error('Missing ready fixture crop');garden({action:'harvest',bed});}
 for(let bed=0;bed<3;bed++)if(!state.garden.beds[bed]){const crop=state.garden.seeds.marigold?'marigold':state.garden.seeds.radish?'radish':null;if(crop)garden({action:'plant',bed,crop});}
 return state;
}
