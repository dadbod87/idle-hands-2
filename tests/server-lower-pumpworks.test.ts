import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {realpathSync} from 'node:fs';
import {test} from 'node:test';
import {setTimeout as delay} from 'node:timers/promises';
import {database, migrate} from '../server/db.ts';
import {createTownServer} from '../server/http.ts';
import {TownStore, type TownPosition} from '../server/live-store.ts';
import {DEPTHS_HATCH, LANDING_BENCH, LOWER_ROOMS, LOWER_START, START, LOWER_WORLDS} from '../src/game/lower-pumpworks-room.ts';
import {LOWER_ENEMIES, LOWER_LOOT, PRESSURE_RADIUS, TOOL_LOOT, distance, type LowerInput, type LowerReply, type LowerView} from '../src/game/lower-pumpworks.ts';
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
  async function waitFor(id:string,predicate:(value:LowerView)=>boolean){
    let current=await view(id);
    for(let tries=0;tries<65&&!predicate(current);tries++){
      now+=100;
      current=await view(id);
    }
    assert.ok(predicate(current),'Expected an observable phase in the real dungeon server');
    return current;
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
    const liftTop=portal(upper,'depths-lift-top');
    await walk(hazel,liftTop.point);
    assert.equal((await move(hazel,{room:lower,position:liftTop.arrival!})).status,200);
    const kiln=portal(lower,'depths-kiln-chest');
    await walk(hazel,kiln.point);
    assert.equal((await view(hazel)).enemy,null,'The kiln route bypasses the boss');
    assert.equal((await act(hazel,{kind:'kiln-chest',id:replyId.id})).ok,false,'A request ID cannot claim another chest');
    assert.equal((await act(hazel,{kind:'kiln-chest',id:randomUUID()})).ok,true);
    assert.equal((await store.snapshot(hazel)).workshop.inventory.timber,1);

    const boss=LOWER_ENEMIES.collector;
    const bossChest=portal(lower,'depths-collector-chest');
    await walk(hazel,bossChest.point);
    const prize={kind:'collector-reward',id:randomUUID()} as const;
    assert.match((await act(hazel,prize)).message,/guarding/);
    assert.equal((await store.snapshot(hazel)).collectorGaugeOwned,undefined);
    let sawPressure=false;
    for(let openingIndex=0;openingIndex<4;openingIndex++){
      const windup=await waitFor(hazel,value=>value.enemy?.phase==='windup');
      const attack=windup.enemy!.warning!;
      if(attack.kind==='pressure'){
        sawPressure=true;
        const away={x:attack.from.x>42?attack.from.x-3.55:attack.from.x+3.55,y:attack.from.y};
        assert.ok(distance(away,attack.from)>PRESSURE_RADIUS);
        await walk(hazel,away);
      }else{
        now=Math.max(now,windup.enemy!.until-1000);
        const braced=await act(hazel,{kind:'combat',action:'brace',id:randomUUID(),encounter:windup.encounter!,turn:windup.turn});
        assert.equal(braced.ok,true,braced.message);
      }
      now=Math.max(now,windup.enemy!.until+1);
      const opening=await waitFor(hazel,value=>value.enemy?.phase==='opening');
      await walk(hazel,opening.enemy!.position);
      const counter=await act(hazel,strike(await view(hazel)));
      assert.equal(counter.ok,true,counter.message);
      if(openingIndex===0){
        now+=475;
        const second=await act(hazel,strike(await view(hazel)));
        assert.equal(second.ok,false,'Only one Collector counter is credited per opening');
        assert.equal(second.view.enemy?.health,boss.health-4);
      }
    }
    assert.equal(sawPressure,true);
    assert.equal((await view(hazel)).progress.collectorCleared,true);
    assert.equal((await view(birch)).progress.collectorCleared,false);
    await walk(hazel,bossChest.point);
    const beforePrize=(await store.snapshot(hazel)).workshop;
    const full={...beforePrize,inventory:{scrap:STORAGE_LIMIT,timber:0,supplies:0}};
    await pool.query('update ih2.players set workshop=$2 where id=$1',[hazel,full]);
    const fullPrize=await act(hazel,prize);
    assert.equal(fullPrize.ok,false);
    assert.match(fullPrize.message,/Free 5 material spaces/);
    assert.equal(fullPrize.view.progress.collectorClaim,null);
    assert.equal((await store.snapshot(hazel)).collectorGaugeOwned,undefined);
    assert.equal((await store.snapshot(hazel)).workshop.inventory.scrap,STORAGE_LIMIT);
    await pool.query('update ih2.players set workshop=$2 where id=$1',[hazel,beforePrize]);
    // Force the claim write to fail after the stock update. Both writes must roll back.
    await pool.query(`create function ih2.depths_qa_fail_receipt() returns trigger language plpgsql as
      $$begin raise exception 'isolated dungeon receipt failure';end$$;
      create trigger depths_qa_fail_receipt before update on ih2.lower_pumpworks_outings
      for each row when (new.progress->>'collectorClaim' is not null)
      execute function ih2.depths_qa_fail_receipt()`);
    try{
      const failed=await send(hazel,'depths',prize);
      assert.equal(failed.status,500);
      await failed.text();
      assert.deepEqual((await store.snapshot(hazel)).workshop,beforePrize);
      assert.equal((await view(hazel)).progress.collectorClaim,null);
    }finally{
      await pool.query('drop trigger depths_qa_fail_receipt on ih2.lower_pumpworks_outings; drop function ih2.depths_qa_fail_receipt()');
    }
    const award=await act(hazel,prize);
    assert.equal(award.ok,true,award.message);
    assert.equal((await act(hazel,prize)).replayed,true);
    const afterPrize=await store.snapshot(hazel);
    assert.equal(afterPrize.collectorGaugeOwned,true);
    assert.equal(afterPrize.workshop.inventory.scrap,beforePrize.inventory.scrap+LOWER_LOOT['collector-reward'].stock.scrap);
    assert.equal(afterPrize.workshop.inventory.supplies,beforePrize.inventory.supplies+LOWER_LOOT['collector-reward'].stock.supplies);
    assert.equal((await store.snapshot(birch)).collectorGaugeOwned,undefined);

    await walk(birch,stair.point);
    assert.equal((await move(birch,{room:lower,position:LOWER_START})).status,200);
    await walk(birch,bossChest.point);
    assert.equal((await act(birch,{kind:'rest',id:randomUUID()})).ok,false,'The resting action requires the landing bench');
    let knockedOut=await view(birch);
    for(let attempt=0;attempt<360&&knockedOut.room!==upper;attempt++){
      now+=125;
      knockedOut=await view(birch);
    }
    assert.equal(knockedOut.room,upper,JSON.stringify(knockedOut));
    assert.ok((knockedOut.returnTo&&distance(knockedOut.returnTo,START)<.01)||birchFrames.some(frame=>frame.room===upper&&frame.returnTo!==null));
    assert.equal(knockedOut.progress.health,8);
    assert.equal(knockedOut.progress.collectorCleared,false);
    assert.deepEqual((await store.snapshot(birch)).position,{room:upper,position:START});
    positions.set(birch,{room:upper,position:START});
    await walk(birch,LANDING_BENCH.point);
    assert.match((await act(birch,{kind:'rest',id:randomUUID()})).message,/already full/);
    assert.equal((await store.snapshot(birch)).workshop.inventory.scrap,STORAGE_LIMIT);

    assert.ok(hazelFrames.length>0&&hazelFrames.every(frame=>frame.playerId===hazel));
    assert.ok(birchFrames.length>0&&birchFrames.every(frame=>frame.playerId===birch));

    for(const stream of streams)stream.abort();
    await delay(150);
    const quiet=app.metrics.depthsUpdates;
    await delay(130);
    assert.equal(app.metrics.depthsUpdates,quiet,'Disconnected residents get no background fight updates');
    await app.close();app=launch();base='http://127.0.0.1:'+await app.listen();
    await connect(hazel);
    const reloaded=await view(hazel);
    assert.equal(reloaded.progress.toolClaim,replyId.id);
    assert.equal(reloaded.progress.miteCleared,true);
    assert.equal(reloaded.progress.liftOpen,true);
    assert.equal((await act(hazel,replyId)).replayed,true);
    assert.equal(reloaded.progress.collectorClaim,prize.id);
    assert.equal((await act(hazel,prize)).replayed,true);
    assert.equal((await store.snapshot(hazel)).workshop.inventory.scrap,TOOL_LOOT.scrap+LOWER_LOOT['collector-reward'].stock.scrap);
    assert.equal(app.metrics.depthsErrors,0);

    const plotId=(await pool.query('insert into ih2.plots(owner_id,level,placements) values($1,1,$2) returning id::text',
      [hazel,(await store.snapshot(hazel)).workshop.placements])).rows[0].id;
    const inside:TownPosition={room:'home',homePlotId:plotId,position:{x:9,y:11}};
    const hang={kind:'display-home-keepsake',plotId,keepsake:'collector-gauge'};
    await store.savePosition(hazel,inside);
    const owner=await store.snapshot(hazel);
    const hung=await store.execute(hazel,{...hang,id:'hang-gauge',expectedRevision:owner.workshop.revision},inside);
    assert.equal(hung.ok,true,hung.message);
    assert.equal((await store.snapshot(birch)).plots.find(plot=>plot.id===plotId)?.wallDisplay,undefined);
    await store.savePosition(birch,inside);
    const visitor=await store.snapshot(birch);
    assert.equal(visitor.plots.find(plot=>plot.id===plotId)?.wallDisplay,'collector-gauge');
    assert.equal(visitor.collectorGaugeOwned,undefined);
    const cannotRemove=await store.execute(birch,{...hang,keepsake:null,id:'guest-cannot-remove',expectedRevision:visitor.workshop.revision},inside);
    assert.equal(cannotRemove.ok,false);
    assert.equal((await store.snapshot(birch)).plots.find(plot=>plot.id===plotId)?.wallDisplay,'collector-gauge');
  }finally{
    for(const stream of streams)stream.abort();
    await app.close();
    await pool.end();
  }
});
