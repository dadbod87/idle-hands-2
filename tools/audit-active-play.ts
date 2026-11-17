import {writeFileSync,mkdirSync} from 'node:fs';
import {createWorkshop,applyWorkshop,settleWorkshop,isCurrentWorkshop,type WorkshopState} from '../src/game/live-workshop.ts';
import {serveLocalCafeCandidate} from '../src/game/cafe-candidate.ts';
import {SURVEYS,SURVEY_IDS} from '../src/game/fieldwork.ts';
import {STAKE_STUDIES,STAKE_IDS} from '../src/game/garden.ts';
import {activityNotes} from '../src/game/activity-notebook.ts';
const out=process.argv[2]??'test-results/active-play-audit';mkdirSync(out,{recursive:true});
const hour=3600000,now=Date.now();let at=now-8*24*hour,s=createWorkshop(at),serial=0;
const tryAct=(a:Record<string,unknown>)=>{const r=applyWorkshop(s,{...a,id:'audit-'+(++serial),expectedRevision:s.revision},at);if(r.ok)s=r.state;return r;};
const act=(a:Record<string,unknown>)=>{const r=tryAct(a);if(!r.ok)throw Error(JSON.stringify(a)+': '+r.message);};
const garden=(a:Record<string,unknown>,required=true)=>required?act({kind:'garden',gardenAction:a}):tryAct({kind:'garden',gardenAction:a});
const pine=(a:Record<string,unknown>,required=true)=>required?act({kind:'carpentry',carpentryAction:a}):tryAct({kind:'carpentry',carpentryAction:a});
for(const resource of ['scrap','timber','supplies'])act({kind:'gather',resource});
act({kind:'craft',recipe:'planter'});at+=5000;act({kind:'claim'});act({kind:'place',prop:'planter',slot:'north-west'});
pine({action:'learn-saw'});pine({action:'equip-saw',equipped:true});pine({action:'gather-pine',station:'crooked'});
act({kind:'commission',commissionAction:{action:'accept'}});
for(const recipient of ['clerk','caretaker','carpentry-desk'])act({kind:'commission',commissionAction:{action:'handover',parcel:recipient,recipient}});
act({kind:'commission',commissionAction:{action:'complete'}});
for(const station of SURVEY_IDS)act({kind:'survey',station,choice:SURVEYS[station].answer});
garden({action:'accept-errand'});
for(const station of STAKE_IDS)garden({action:'inspect-stake',station,choice:STAKE_STUDIES[station].answer});
garden({action:'assemble-marker'});
for(const marker of ['sunburst','leaf-fan','little-pennant'])garden({action:'make-marker',marker});
for(let i=0;i<48;i++){
 for(let bed=0;bed<3;bed++)garden({action:'harvest',bed},false);
 if(s.commission.madeCount===0)tryAct({kind:'commission',commissionAction:{action:'make',motif:'leaf'}});
 const cafe=serveLocalCafeCandidate(s,{expectedRevision:s.revision,presentation:'slices'},at);if(cafe.ok)s=cafe.state;
 for(let bed=0;bed<3;bed++)if(!s.garden.beds[bed])garden({action:'plant',bed,crop:bed===2?'marigold':'radish'});
 for(const resource of ['scrap','timber','supplies'])tryAct({kind:'gather',resource});
 pine({action:'gather-pine',station:'crooked'},false);
 at+=4*hour;
}
at=now;s=settleWorkshop(s,at);const established=structuredClone(s);
garden({action:'submit-request'});pine({action:'deliver-hamper'});pine({action:'start-easel'});act({kind:'craft',recipe:'bridge-kit'});
// Fill any newly freed capacity from already earned personal pools, then inspect once.
for(const resource of ['scrap','timber','supplies'])tryAct({kind:'gather',resource});
pine({action:'gather-pine',station:'crooked'},false);
for(let bed=0;bed<3;bed++){garden({action:'harvest',bed},false);if(!s.garden.beds[bed])garden({action:'plant',bed,crop:bed===2?'marigold':'radish'});garden({action:'observe',bed},false);}
const busy=structuredClone(s);
const attempts:Record<string,unknown>[]=[...['scrap','timber','supplies'].map(resource=>({kind:'gather',resource})),{kind:'craft',recipe:'bridge-kit'},{kind:'claim'},...SURVEY_IDS.map(station=>({kind:'survey',station,choice:SURVEYS[station].answer})),...['learn-saw','gather-pine','start-easel','claim-easel','deliver-hamper','record-easel'].map(action=>({kind:'carpentry',carpentryAction:action==='gather-pine'?{action,station:'crooked'}:{action}})),...Array.from({length:3},(_,bed)=>({kind:'garden',gardenAction:{action:'harvest',bed}})),...Array.from({length:3},(_,bed)=>({kind:'garden',gardenAction:{action:'observe',bed}})),{kind:'garden',gardenAction:{action:'submit-request'}},{kind:'garden',gardenAction:{action:'assemble-marker'}},{kind:'commission',commissionAction:{action:'accept'}},{kind:'commission',commissionAction:{action:'make',motif:'leaf'}}];
// Translate the entire synthetic history one day earlier, then settle at the
// actual observation time. Do not load a future clock into a current browser.
const historical=(v:unknown):any=>typeof v==='number'&&v>1_000_000_000_000?v-24*hour:Array.isArray(v)?v.map(historical):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,n])=>[k,historical(n)])):v;
const profiles={fresh:createWorkshop(now),established,busy,returning:settleWorkshop(historical(busy),now)};
const report={source:'161be1e83f1e11e37a3e6136829fc2587bfdf040',disclosure:'Synthetic browser-only fixtures built through legal current pure commands at advanced historical timestamps; no grants, real accounts, API/DB writes or real waiting. Each eligibility probe is independent against an unchanged snapshot; it is not a sequence or a human enjoyment result.',profiles:Object.fromEntries(Object.entries(profiles).map(([name,state])=>{if(!isCurrentWorkshop(state))throw Error(name+' invalid');const clock=state.observedAt;return[name,{valid:true,notes:activityNotes(state,clock),held:{materials:state.inventory,pine:state.carpentry.pine.carried,produce:state.garden.produce},completed:{sketches:state.sketches.length,markers:state.garden.markers.length,letterbox:state.commission.madeCount,tastings:state.cafe.totalServes},actions:attempts.map((a,i)=>{const r=applyWorkshop(state,{...a,id:'probe-'+i,expectedRevision:state.revision},clock);return{action:a,ok:r.ok,message:r.message};}),markerAttempts:[...state.garden.markers.filter(m=>m!=='almost-straight').map(marker=>({action:'make-marker',marker})),{action:'assemble-marker'}].map(gardenAction=>{const r=applyWorkshop(state,{kind:'garden',gardenAction,id:'marker-probe-'+gardenAction.action+('marker' in gardenAction?gardenAction.marker:''),expectedRevision:state.revision},clock);return{action:gardenAction,ok:r.ok,message:r.message};}),cafe:((r)=>({ok:r.ok,message:r.message}))(serveLocalCafeCandidate(state,{expectedRevision:state.revision,presentation:'slices'},clock))}];}))};
for(const [name,state]of Object.entries(profiles))writeFileSync(out+'/'+name+'.json',JSON.stringify(state,null,2));
writeFileSync(out+'/eligibility.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(Object.fromEntries(Object.entries(report.profiles).map(([k,v])=>[k,{notes:v.notes.map(n=>n.phase),allowed:v.actions.filter(a=>a.ok).map(a=>a.action),cafe:v.cafe,held:v.held,completed:v.completed}]))));
