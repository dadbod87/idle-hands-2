import {database,migrate} from '../server/db.ts';
import {createTownServer} from '../server/http.ts';
import {browserEnvironmentTarget} from './browser-target.ts';
import {ORCHARD_STOPS,newOrchard} from '../src/game/orchard.ts';
import {PUMPWORKS_DOOR} from '../src/game/pumpworks-room.ts';
const url=browserEnvironmentTarget();
const pool=database(url);await pool.query('drop schema if exists ih2 cascade; drop schema if exists ih2_meta cascade');await migrate(pool);
const orchardResidents=[{id:'orchard-sorrel',name:'Sorrel'},{id:'orchard-flint',name:'Flint'}];
const parcelResidents=[{id:'parcel-fern',name:'Fern'},{id:'parcel-cedar',name:'Cedar'}];
const fieldResidents=[{id:'field-tamsin',name:'Tamsin'},{id:'field-milo',name:'Milo'}];
const app=createTownServer({pool,secret:'isolated-browser-fixture-signing-key-040',port:4197,fixtureResidents:[...fieldResidents,...orchardResidents,...parcelResidents,{id:'outing-walker',name:'Wren'},{id:'craft-maker',name:'Ivy'},{id:'receipt-maker',name:'Mira'},{id:'receipt-other',name:'Sol'},{id:'aster',name:'Aster'},{id:'bea',name:'Bea'},{id:'casey',name:'Casey'},{id:'drew',name:'Drew'},{id:'pine-maker',name:'Ember'},{id:'pine-visitor',name:'Finch'},{id:'clarity-gardener',name:'Rowan'},{id:'post-maker',name:'Jules'},{id:'post-visitor',name:'Kit'},{id:'box-owner',name:'Robin'},{id:'box-visitor',name:'Vale'},{id:'workroom-owner',name:'Lark'},{id:'workroom-visitor',name:'Moss'}]});
for(const[id,name]of [['aster','Aster'],['bea','Bea'],['casey','Casey']]){const snapshot=await app.store.ensurePlayer(id,name);const state=snapshot.workshop;state.bridgeKits=48;state.owned.planter=2;await pool.query('update ih2.players set workshop=$2 where id=$1',[id,state]);}
for(const {id,name} of orchardResidents){
 await app.store.ensurePlayer(id,name);
 await pool.query('update ih2.players set position=$2 where id=$1',[id,{room:'square',position:ORCHARD_STOPS[0].point}]);
}
for(const {id,name} of parcelResidents){
 await app.store.ensurePlayer(id,name);
 const pantry=id==='parcel-fern'?{...newOrchard(),picked:2,packed:1,snacks:1}:null;
 await pool.query('update ih2.players set position=$2,orchard=$3 where id=$1',[id,{room:'square',position:{x:30,y:22}},pantry]);
}
for(const {id,name} of fieldResidents){
 await app.store.ensurePlayer(id,name);
 await app.store.savePosition(id,{room:'square',position:PUMPWORKS_DOOR.point});
}
await app.listen();console.log('Browser-only synthetic fixtures ready: Aster/Bea/Casey start with48 bridge kits and2 planters; Drew is created on login with ordinary zero-progress defaults. Not a live economy.');
for(const signal of ['SIGTERM','SIGINT'] as const)process.once(signal,()=>{void app.close().then(()=>pool.end()).then(()=>process.exit(0));});
