/** Isolated projection fixture, not a fresh-player playthrough or stock grant. */
import assert from 'node:assert/strict';
import type {Pool} from 'pg';
import {earnedHousingFixture} from '../../tools/earned-housing-fixture.ts';
import {earnedHomeWorkshop} from '../../tools/neighborhood-home-fixture.ts';
import {loadWorkshop} from '../../src/game/live-workshop.ts';
import {liveHousingAccount} from '../../src/game/live-housing.ts';
import {emptyWorkroom} from '../../src/game/live-home-layout.ts';
import {emptyYard,makeHousingQuote,startHousingBuild,HOUSING_CATALOG_VERSION} from '../../src/design/housing-contract.ts';
import {createOuting,applyOuting,type OutingIntent,type OutingStation} from '../../src/game/outing.ts';
import {CAFE_RULES} from '../../src/game/cafe-candidate.ts';
import {seasonKey} from '../../server/live-store.ts';

const uuid=(n:number)=>'12100000-0000-4000-8000-'+String(n).padStart(12,'0');
export const SNAPSHOT_OWNER='neighbor-26';
export const PRIVATE_PEER_RUN='PRIVATE_PEER_RUN_121';
export async function richSnapshotFixture(pool:Pool,url:string,now:number){
 const u=new URL(url);assert.equal(u.pathname,'/ih2_test');assert.notEqual(u.port,'55432');
 assert.equal((await pool.query('select current_database() name')).rows[0].name,'ih2_test');
 const owner=SNAPSHOT_OWNER,rich=structuredClone(earnedHousingFixture().workshop);
 rich.commission.published=true;assert.equal(loadWorkshop(rich,now).recovered,false);
 const placements={...rich.placements,'north-west':'planter','north-middle':'stool','north-east':'rug','south-west':'lamp','south-middle':'crate','south-east':'shelf'};
 const workroom={...emptyWorkroom(),'workroom-north':'teapot','workroom-south':'easel'};
 const yard={...emptyYard(),'front-left':'letterbox'};
 await pool.query('update ih2.plots set placements=$2,workroom_placements=$3,yard=$4 where owner_id=$1',[owner,placements,workroom,yard]);
 const plot=(await pool.query('select id::text,level,placements,workroom_placements,plan_id,yard from ih2.plots where owner_id=$1',[owner])).rows[0];
 const account=liveHousingAccount(owner,rich,{id:plot.id,level:plot.level,placements:plot.placements,workroomPlacements:plot.workroom_placements,planId:plot.plan_id,yard:plot.yard},null);
 const request={version:1 as const,catalogVersion:HOUSING_CATALOG_VERSION,target:'porch-house-2',plotId:'26',expectedRevision:rich.revision};
 const earlier=makeHousingQuote(account,{...request,target:'pocket-cottage-2'},now,uuid(1));
 const quote=makeHousingQuote(account,request,now,uuid(2));
 const paid=startHousingBuild(account,quote,now,uuid(3));assert.ok(paid.ok,paid.message);
 await pool.query('update ih2.players set workshop=$2 where id=$1',[owner,paid.account.workshop]);
 for(const q of [earlier,quote])await pool.query('insert into ih2.housing_quotes(id,owner_id,quote) values($1,$2,$3)',[q.id,owner,q]);
 await pool.query('insert into ih2.housing_builds(id,owner_id,plot_id,build) values($1,$2,$3,$4)',[paid.account.build!.id,owner,'26',paid.account.build]);

 let outing=createOuting();
 const act=(intent:OutingIntent,station:OutingStation,id?:string)=>{const r=applyOuting(outing,intent,now,station,id);assert.ok(r.ok,r.message);outing=r.state;};
 act({action:'start',tool:'brace'},'outing-desk','recorded-private-run');
 for(const [action,station]of [['cross','outing-crossing'],['align','outing-post'],['pin','outing-post'],['secure','outing-post'],['finish','outing-desk']]as const){
  act(action==='align'?{action,runId:'recorded-private-run',direction:'west'}:{action,runId:'recorded-private-run'},station);
 }
 act({action:'start',tool:'rope'},'outing-desk','pending-private-run');
 act({action:'cross',runId:'pending-private-run'},'outing-crossing');
 act({action:'align',runId:'pending-private-run',direction:'west'},'outing-post');
 await pool.query('insert into ih2.outings(player_id,state) values($1,$2)',[owner,outing]);

 // Explicit component fixtures cover consent versus placed appearance independently.
 for(const [id,published,placed]of [['neighbor-02',false,false],['neighbor-03',true,false],['neighbor-04',false,true]]as const){
  const peer=structuredClone(rich);peer.commission.published=published;
  await pool.query('update ih2.players set workshop=$2 where id=$1',[id,peer]);
  if(placed)await pool.query("update ih2.plots set placements=jsonb_set(placements,'{north-middle}','\"letterbox\"'::jsonb) where owner_id=$1",[id]);
 }
 const privatePeer=applyOuting(createOuting(),{action:'start',tool:'brace'},now,'outing-desk',PRIVATE_PEER_RUN);assert.ok(privatePeer.ok);
 await pool.query('insert into ih2.outings(player_id,state) values($1,$2)',['neighbor-02',privatePeer.state]);
 const peerQuote={...quote,id:uuid(4),ownerId:'neighbor-02',plotId:'2'};
 await pool.query('insert into ih2.housing_quotes(id,owner_id,quote) values($1,$2,$3)',[peerQuote.id,'neighbor-02',peerQuote]);

 // Another owner reserves a new address. Inventory comes from the existing pure
 // historical earning helper; real housing quote/debit rules issue its build.
 const newcomer='snapshot-builder',earned=loadWorkshop(earnedHomeWorkshop(12,now).state,now).state;
 await pool.query('insert into ih2.players(id,name,workshop,position) values($1,$2,$3,$4)',[newcomer,'New builder · fixture',earned,{room:'square',position:{x:24,y:25}}]);
 const fresh=liveHousingAccount(newcomer,earned,null,null);
 const freshQuote=makeHousingQuote(fresh,{version:1,catalogVersion:HOUSING_CATALOG_VERSION,target:'pocket-cottage-1',plotId:'27',expectedRevision:earned.revision},now,uuid(5));
 const freshPaid=startHousingBuild(fresh,freshQuote,now,uuid(6));assert.ok(freshPaid.ok,freshPaid.message);
 await pool.query('update ih2.players set workshop=$2 where id=$1',[newcomer,freshPaid.account.workshop]);
 await pool.query('insert into ih2.housing_quotes(id,owner_id,quote) values($1,$2,$3)',[freshQuote.id,newcomer,freshQuote]);
 await pool.query('insert into ih2.housing_builds(id,owner_id,plot_id,build) values($1,$2,$3,$4)',[freshPaid.account.build!.id,newcomer,'27',freshPaid.account.build]);

 await pool.query("update ih2.bridge set contributed=target,phase='open',started_at=$1::bigint-21600000,ready_at=$1,opened_at=$1,grandfathered=false where id=1",[now]);
 await pool.query("insert into ih2.project_events(id,kind,effective_at,recorded_at) values('bridge-opened-v2','opened',$1,$1)",[now]);
 await pool.query("update ih2.noticeboard set credits=6,phase='open',started_at=$1::bigint-86400000,ready_at=$1,opened_at=$1 where id=1",[now]);
 await pool.query('update ih2.garden_welcome set credits=6 where id=1');
 // Keep the café's monotone trigger and fixed-deadline checks enabled.
 for(let n=1;n<=CAFE_RULES.publicGoal;n++)await pool.query('update ih2.cafe_project set credits=$1,observed_at=$2,funded_at=$3,ready_at=$4,opened_at=$4 where id=1',[n,now,n===CAFE_RULES.publicGoal?now-CAFE_RULES.openingMs:null,n===CAFE_RULES.publicGoal?now:null]);
 await pool.query("update ih2.maintenance_lessons set started_at=$2::bigint-60000,ready_at=$2,completed=true,redeemed=true,route='upkeep',legacy_satisfied=false where player_id=$1",[owner,now]);
 for(const q of ['orientation-v1','bridge-contributor-v1','maintenance-v1','trail-pennant-v1'])await pool.query('insert into ih2.quest_awards(player_id,quest_id,awarded_at) values($1,$2,$3) on conflict do nothing',[owner,q,new Date(now)]);
 for(const id of ['trailhead','old-sign','lookout'])await pool.query('insert into ih2.trail_stamps(player_id,landmark_id,command_id,stamped_at) values($1,$2,$3,$4)',[owner,id,'snapshot-fixture-'+id,now]);
 const key=seasonKey(now);
 for(const [id,points]of [[owner,11],['neighbor-02',11],['town-visitor',7]]as const)await pool.query('insert into ih2.season_scores(player_id,season_key,points) values($1,$2,$3)',[id,key,points]);
 await pool.query('insert into ih2.season_scores(player_id,season_key,points) values($1,$2,999)',[owner,'2026-10-30']);
 return{owner,quote,paid:paid.account,outing,newcomer,newBuild:freshPaid.account.build!,privatePeerQuoteId:peerQuote.id,disclosure:'Isolated merged projection fixtures:26historically earned homes, earned seven-day private component saves, explicit public project clocks/awards/score rows and two pure-rule paid builds. Not a fresh-player journey or real accounts. Café/history constraints stay enabled.'};
}
