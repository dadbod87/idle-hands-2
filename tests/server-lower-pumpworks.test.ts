import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {realpathSync} from 'node:fs';
import {test} from 'node:test';
import {database, migrate} from '../server/db.ts';
import {createTownServer} from '../server/http.ts';
import {TownStore, type TownPosition} from '../server/live-store.ts';
import {DEPTHS_HATCH, LOWER_ROOMS, LOWER_START, START, LOWER_WORLDS} from '../src/game/lower-pumpworks-room.ts';
import {TOOL_LOOT, type LowerInput, type LowerReply, type LowerView} from '../src/game/lower-pumpworks.ts';
import {freshPumpworks} from '../src/game/pumpworks.ts';
import {TOWN_SCHEMA} from '../src/game/protocol-version.ts';
import {STORAGE_LIMIT} from '../src/game/live-workshop.ts';
import {routeTo, worlds, type Point} from '../src/game/world.ts';

const target=process.env.IH2_TEST_DATABASE_URL;
const nativeData=process.env.IH2_GLASSHOUSE_TEMP_DATA;
if(target){
  const url=new URL(target);
  const ci=process.env.CI==='true'&&url.port==='5432'&&/^[a-f0-9]{12,64}$/.test(process.env.IH2_PG_CONTAINER??'');
  const local=url.port==='55434'&&process.env.IH2_PG_CONTAINER==='idle-hands-2-cafe-candidate-pg';
  const native=url.port==='56371'&&nativeData&&/^\/(?:private\/)?tmp\/ih2-new-db\.[a-zA-Z0-9]+\/data$/.test(nativeData);
  assert.ok(url.hostname==='127.0.0.1'&&url.pathname==='/ih2_test'&&!url.search&&!url.hash&&(ci||local||native),
    'Dungeon checks require the dedicated disposable town database.');
}

test('Lower Pumpworks verifies room, contact, ownership, inventory capacity and a recoverable lift', {skip:!target,timeout:50000},async()=>{
  const pool=database(target);
  let now=Date.UTC(2026,10,25,22),transportAt=1;
  const residents=[{id:'lower-hazel',name:'Hazel'},{id:'lower-birch',name:'Birch'}];
  const launch=()=>createTownServer({pool,secret:'isolated-lower-pumpworks-fixture-key',now:()=>now,transportNow:()=>transportAt,port:0,fixtureResidents:residents});
  let app=launch(),base='';
  const store=new TownStore(pool,{now:()=>now});
  const streams:AbortController[]=[];
  const cookies=new Map<string,string>();
  const positions=new Map<string,TownPosition>();
  const hazel=residents[0]!.id,birch=residents[1]!.id;

  async function send(id:string,path:string,data?:unknown){
    transportAt+=155;
    return fetch(base+'/api/town/'+path,{method:data===undefined?'GET':'POST',headers:{
      'X-IH2-Schema':TOWN_SCHEMA,Cookie:cookies.get(id)??'',
      ...(data===undefined?{}:{Origin:base,'Content-Type':'application/json'}),
    },body:data===undefined?undefined:JSON.stringify(data)});
  }
  async function connect(id:string){
    const logged=await send(id,'login',{fixtureId:id});
    assert.equal(logged.status,200);
    cookies.set(id,logged.headers.get('set-cookie')!.split(';')[0]!);
    const stream=new AbortController();
    streams.push(stream);
    const response=await fetch(base+'/api/town/events?schema='+TOWN_SCHEMA,{headers:{Cookie:cookies.get(id)!},signal:stream.signal});
    assert.equal(response.status,200);
    const inbox:LowerView[]=[];
    void (async()=>{
      const decoder=new TextDecoder();
      let pending='';
      for await(const chunk of response.body!){
        pending+=decoder.decode(chunk,{stream:true});
        let edge:number;
        while((edge=pending.indexOf('\n\n'))>=0){
          const frame=pending.slice(0,edge);
          pending=pending.slice(edge+2);
          if(frame.startsWith('event: depths\n'))inbox.push(JSON.parse(frame.split('\ndata: ')[1]!));
        }
      }
    })().catch(()=>{});
    return inbox;
  }
  async function view(id:string):Promise<LowerView>{
    const response=await send(id,'depths');
    assert.equal(response.status,200);
    return (await response.json()).view;
  }
  async function act(id:string,input:LowerInput):Promise<LowerReply>{
    const response=await send(id,'depths',input);
    assert.equal(response.status,200,await response.clone().text());
    return response.json();
  }
  async function move(id:string,next:TownPosition){
    now+=160;
    const response=await send(id,'movement',next);
    const body=await response.json();
    if(response.ok)positions.set(id,body.position);
    return {ok:response.ok,status:response.status,body};
  }
  async function walk(id:string,to:Point){
    const current=positions.get(id)!;
    const path=routeTo(current.room,current.position,to,worlds[current.room]);
    assert.ok(path.length,'Destination reachable by collision-safe paths');
    let from=current.position;
    for(const point of path){
      const steps=Math.max(1,Math.ceil(Math.hypot(point.x-from.x,point.y-from.y)/.74));
      for(let index=1;index<=steps;index++){
        const placed=await move(id,{room:current.room,position:{x:from.x+(point.x-from.x)*index/steps,y:from.y+(point.y-from.y)*index/steps}});
        assert.equal(placed.status,200,JSON.stringify(placed.body));
      }
      from=point;
    }
  }
  const portal=(room:typeof LOWER_ROOMS[number],id:string)=>LOWER_WORLDS[room].stops.find(stop=>stop.id===id)!;
  const claim=():LowerInput=>({kind:'tool-chest',id:randomUUID()});
  const strike=(active:LowerView):LowerInput=>({kind:'combat',id:randomUUID(),encounter:active.encounter!,turn:active.turn,action:'strike'});

  try{
    if(nativeData){
      const actual=(await pool.query('show data_directory')).rows[0].data_directory;
      assert.equal(realpathSync(actual),realpathSync(nativeData));
    }
    await migrate(pool);
    await pool.query('delete from ih2.players where id=any($1)',[residents.map(player=>player.id)]);
    for(const resident of residents){
      const initial=await store.ensurePlayer(resident.id,resident.name);
      await store.savePosition(resident.id,{room:'pumpworks',position:DEPTHS_HATCH.point});
      positions.set(resident.id,{room:'pumpworks',position:DEPTHS_HATCH.point});
      const state={...freshPumpworks(),rod:'equipped',oatcake:'packed',satchel:'carried'};
      await pool.query('insert into ih2.field_outings (player_id,state) values($1,$2)',[resident.id,state]);
      if(resident.id===birch){
        initial.workshop.inventory.scrap=STORAGE_LIMIT;
        await pool.query('update ih2.players set workshop=$2 where id=$1',[birch,initial.workshop]);
      }
    }
    base='http://127.0.0.1:'+await app.listen();
    const hazelFrames=await connect(hazel);
    const birchFrames=await connect(birch);
    const [upper,lower]=LOWER_ROOMS;
    await Promise.all([hazel,birch].map(async id=>assert.equal((await move(id,{room:upper,position:START})).status,200)));
    assert.equal((await act(hazel,claim())).ok,false,'Door-level presence alone cannot claim the chest');
    assert.equal((await move(hazel,{room:upper,position:{x:33,y:28}})).status,409,'Movement credit forbids a remote teleport');
    await walk(hazel,portal(upper,'depths-lift-top').point);
    assert.equal((await move(hazel,{room:lower,position:portal(upper,'depths-lift-top').arrival!})).status,409);

    await walk(hazel,{x:14,y:10});
    let active=await view(hazel);
    assert.ok(active.encounter,'The mite reacts to confirmed nearby movement');
    assert.strictEqual((await view(birch)).enemy,null);
    const wrong={...strike(active),encounter:randomUUID()} as LowerInput;
    assert.equal((await act(hazel,wrong)).ok,false);
    for(let attempt=0;attempt<42&&active.enemy?.phase!=='windup';attempt++){
      now+=110;
      active=await view(hazel);
    }
    assert.equal(active.enemy?.phase,'windup');
    now+=100;
    const ward=await act(hazel,{kind:'combat',action:'brace',id:randomUUID(),encounter:active.encounter!,turn:active.turn});
    assert.equal(ward.ok,true);
    now=active.enemy!.until+1;
    active=await view(hazel);
    assert.equal(active.progress.health,8);
    assert.equal(active.enemy?.phase,'opening');
    const proper=strike(active);
    const hit=await act(hazel,proper);
    assert.equal(hit.ok,true,hit.message);
    assert.equal(hit.view.enemy?.health,1);
    assert.equal((await act(hazel,proper)).replayed,true);
    now+=520;
    assert.equal((await act(hazel,strike(await view(hazel)))).view.progress.miteCleared,true);

    const chest=portal(upper,'depths-tool-chest');
    await walk(hazel,chest.point);
    const replyId=claim();
    const duplicate=await Promise.all([act(hazel,replyId),act(hazel,replyId)]);
    assert.ok(duplicate.every(result=>result.ok));
    assert.equal(duplicate.filter(result=>result.replayed).length,1);
    assert.equal((await store.snapshot(hazel)).workshop.inventory.scrap,TOOL_LOOT.scrap);
    assert.equal((await act(hazel,claim())).ok,false);

    await walk(birch,chest.point);
    assert.match((await act(birch,claim())).message,/Make room/);
    assert.equal((await view(birch)).progress.toolClaim,null);
    assert.equal((await store.snapshot(birch)).workshop.inventory.scrap,STORAGE_LIMIT);

    const stair=portal(upper,'depths-stairs-down');
    await walk(hazel,stair.point);
    assert.equal((await move(hazel,{room:lower,position:LOWER_START})).status,200);
    const freight=portal(lower,'depths-lift-bottom');
    await walk(hazel,freight.point);
    assert.equal((await move(hazel,{room:upper,position:freight.arrival!})).status,200);
    assert.equal((await view(hazel)).progress.liftOpen,true);
    assert.equal((await view(birch)).progress.liftOpen,false);
    assert.ok(hazelFrames.length>0&&hazelFrames.every(frame=>frame.playerId===hazel));
    assert.ok(birchFrames.length>0&&birchFrames.every(frame=>frame.playerId===birch));

    for(const stream of streams)stream.abort();
    await app.close();app=launch();base='http://127.0.0.1:'+await app.listen();
    await connect(hazel);
    const reloaded=await view(hazel);
    assert.equal(reloaded.progress.toolClaim,replyId.id);
    assert.equal(reloaded.progress.miteCleared,true);
    assert.equal(reloaded.progress.liftOpen,true);
    assert.equal((await act(hazel,replyId)).replayed,true);
    assert.equal((await store.snapshot(hazel)).workshop.inventory.scrap,TOOL_LOOT.scrap);
    assert.equal(app.metrics.depthsErrors,0);
  }finally{
    for(const stream of streams)stream.abort();
    await app.close();
    await pool.end();
  }
});
