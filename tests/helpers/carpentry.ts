import{createWorkshop,applyWorkshop,type WorkshopState}from'../../src/game/workshop.ts';
export function prepared(now=Date.now(),start=true):WorkshopState{
 let at=now-20*3600000,s=createWorkshop(at),serial=0;const act=(a:Record<string,unknown>)=>{const r=applyWorkshop(s,{...a,id:'pine-fixture-'+(++serial),expectedRevision:s.revision},at);if(!r.ok)throw new Error(r.message);s=r.state;};
 for(const resource of ['scrap','timber','supplies'])act({kind:'gather',resource});act({kind:'craft',recipe:'planter'});at+=5000;act({kind:'claim'});act({kind:'place',prop:'planter',slot:'north-west'});act({kind:'craft',recipe:'bridge-kit'});
 for(const action of [{action:'learn-saw'},{action:'equip-saw',equipped:true},{action:'gather-pine',station:'crooked'}])act({kind:'carpentry',carpentryAction:action});
 for(const[bed,crop]of [[0,'radish'],[1,'radish'],[2,'marigold']]as const)act({kind:'garden',gardenAction:{action:'plant',bed,crop}});at+=4*3600000;for(let bed=0;bed<3;bed++)act({kind:'garden',gardenAction:{action:'harvest',bed}});act({kind:'garden',gardenAction:{action:'plant',bed:2,crop:'marigold'}});if(start)act({kind:'carpentry',carpentryAction:{action:'start-easel'}});return s;
}
