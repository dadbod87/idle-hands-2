/** Isolated historical fixture, earned through pure commands; never use on practice/production data. */
import{applyWorkshop,createWorkshop,RECIPES,type WorkshopCommand,type WorkshopState}from'../src/game/workshop.ts';
import type{Pool}from'pg';import{TownStore,type TownPosition}from'../server/store.ts';
export const NEIGHBOR_FIXTURES=Array.from({length:25},(_,i)=>({id:'neighbor-'+String(i+1).padStart(2,'0'),name:['Avery','Morgan','Robin','Ellis','Rowan','Sage','Alex','Taylor','Remy','Jules','Cameron','Finley','Casey','Jordan','Drew','Marin','Blair','Kit','Quinn','Reese','Skyler','Wren','Parker','Ash','Lane'][i]+' · test neighbor'}));
export const NEIGHBOR_ROSTER=[...NEIGHBOR_FIXTURES,{id:'town-visitor',name:'Visitor'}];
type WithoutEnvelope<T>=T extends unknown?Omit<T,'id'|'expectedRevision'>:never;
export function earnedHomeWorkshop(kits:number,observedAt:number){
 if(![12,36].includes(kits))throw new Error('Fixture supports exact starter/expanded housing costs only.');
 let time=observedAt-30*24*3600_000,state=createWorkshop(time),commands=0;
 const run=(command:WithoutEnvelope<WorkshopCommand>)=>{const r=applyWorkshop(state,{...command,id:'historical-home-'+(++commands),expectedRevision:state.revision}as WorkshopCommand,time);if(!r.ok)throw new Error('Illegal historical fixture: '+r.message);state=r.state;};
 const gather=(resource:'scrap'|'timber'|'supplies')=>{if(!state.nodes[resource].stock)time+=4*3600_000;run({kind:'gather',resource});};
 for(const resource of ['scrap','timber','supplies']as const)gather(resource);
 run({kind:'craft',recipe:'planter'});time=state.job!.readyAt;run({kind:'claim'});run({kind:'place',slot:'north-west',prop:'planter'});
 for(let i=0;i<kits;i++){for(const resource of ['scrap','timber','supplies']as const)if(state.inventory[resource]<RECIPES['bridge-kit'].cost[resource])gather(resource);run({kind:'craft',recipe:'bridge-kit'});time=state.job!.readyAt;run({kind:'claim'});}
 run({kind:'remove',slot:'north-west'});if(time>observedAt)throw new Error('Historical fixture exceeded its declared clock.');if(state.bridgeKits!==kits||state.owned.planter!==1)throw new Error('Historical craft conservation failed.');return{state,commands,startedAt:observedAt-30*24*3600_000,completedAt:time,observationAt:observedAt};
}
export async function populateNeighborhoodFixture(pool:Pool,store:{ensurePlayer:(id:string,name?:string)=>Promise<unknown>;execute:(id:string,raw:unknown,position:TownPosition)=>Promise<{ok:boolean;message:string;revision:number;snapshot:{plot:{id:string;level:1|2}|null;workshop:{bridgeKits:number}}}>},url:string,now:number){
 const parsed=new URL(url);if(!['postgres:','postgresql:'].includes(parsed.protocol)||parsed.search||parsed.hash||!['127.0.0.1','localhost'].includes(parsed.hostname)||!['/ih2_test','/ih2_neighborhood_browser','/ih2_neighborhood_tour'].includes(parsed.pathname))throw new Error('Neighborhood fixture refuses nonlocal or practice databases.');
 if((await pool.query('select current_database() as name')).rows[0].name!==parsed.pathname.slice(1))throw new Error('Fixture pool does not match its guarded database.');
 if(Number((await pool.query('select count(*) n from ih2.players')).rows[0].n)||Number((await pool.query('select count(*) n from ih2.plots')).rows[0].n))throw new Error('Historical neighborhood requires an empty disposable schema.');
 const place:TownPosition={room:'square',position:{x:30,y:29}},proof:Array<Record<string,unknown>>=[];
 for(const [i,resident]of NEIGHBOR_FIXTURES.entries()){
  await store.ensurePlayer(resident.id,resident.name);const expanded=i%3===2,earned=earnedHomeWorkshop(expanded?36:12,now);await pool.query('update ih2.players set workshop=$2 where id=$1',[resident.id,earned.state]);
  let result=await store.execute(resident.id,{kind:'claim-plot',id:'historical-claim',expectedRevision:earned.state.revision},place);if(!result.ok)throw new Error(result.message);const id=result.snapshot.plot!.id;if(id!==String(i+1))throw new Error('Fixture addresses must be deterministic.');
  if(expanded){result=await store.execute(resident.id,{kind:'upgrade-plot',plotId:id,id:'historical-upgrade',expectedRevision:result.revision},place);if(!result.ok)throw new Error(result.message);}
  result=await store.execute(resident.id,{kind:'edit-plot',plotId:id,action:'place',slot:'north-west',prop:'planter',id:'historical-decorate',expectedRevision:result.revision},place);if(!result.ok)throw new Error(result.message);
  proof.push({id:resident.id,plotId:id,level:result.snapshot.plot!.level,pureCommands:earned.commands,housingKitsEarned:expanded?36:12,housingKitsRemaining:result.snapshot.workshop.bridgeKits,plantersOwned:1,plantersPlaced:1,fixtureCompletedAt:earned.completedAt});
 }
 await store.ensurePlayer('town-visitor','Visitor');return{classification:'Dedicated fictional historical neighborhood; ordinary pure gather/craft/claim/place commands, explicit past clock/proximity and validated SQL state fixture then real store housing commands. Not fresh progression or real accounts.',owners:proof,ordinaryGuestZero:true};
}
