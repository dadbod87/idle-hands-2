import type {Pool} from 'pg';
import {RESOURCE_IDS, STORAGE_LIMIT, isCurrentWorkshop, loadWorkshop} from '../src/game/live-workshop.ts';
import {freshLowerProgress, lowerProgressSchema, TOOL_LOOT, type LowerProgress} from '../src/game/lower-pumpworks.ts';
import type {TownPosition} from './live-store.ts';

export class LowerWorksStore {
  private readonly pool:Pool;
  constructor(pool:Pool){this.pool=pool;}
  async load(playerId:string):Promise<LowerProgress>{
    const result=await this.pool.query('select progress from ih2.lower_pumpworks_outings where player_id=$1',[playerId]);
    return result.rowCount?lowerProgressSchema.parse(result.rows[0].progress):freshLowerProgress();
  }
  async advance(playerId:string, before:LowerProgress, patch:Partial<LowerProgress>, options:{
    position?:TownPosition;
    claimTools?:{at:number};
  }={}){
    const next=lowerProgressSchema.parse({...before,...patch,revision:before.revision+1});
    const client=await this.pool.connect();
    try{
      await client.query('begin');
      // Town commands also lock the player first. Stock and a claim commit together.
      if(options.claimTools){
        const row=(await client.query('select workshop from ih2.players where id=$1 for update',[playerId])).rows[0];
        if(!row)throw new Error('Missing resident for the Stores claim.');
        const loaded=loadWorkshop(row.workshop,options.claimTools.at);
        if(loaded.recovered)throw new Error('Workshop stock could not be verified.');
        const state=loaded.state;
        const free=STORAGE_LIMIT-RESOURCE_IDS.reduce((total,id)=>total+state.inventory[id],0);
        if(free<TOOL_LOOT.scrap || state.revision>=1_000_000){
          await client.query('rollback');
          return null;
        }
        state.inventory.scrap+=TOOL_LOOT.scrap;
        state.revision++;
        state.lastMessage='Stores chest · 2 Scrap added to Bag.';
        if(!isCurrentWorkshop(state))throw new Error('The Stores award failed workshop validation.');
        await client.query('update ih2.players set workshop=$2,updated_at=now() where id=$1',[playerId,state]);
      }
      if(options.position){
        const moved=await client.query('update ih2.players set position=$2,updated_at=now() where id=$1',[playerId,options.position]);
        if(moved.rowCount!==1)throw new Error('Missing resident checkpoint.');
      }
      const result=before.revision===0
        ? await client.query('insert into ih2.lower_pumpworks_outings(player_id,progress) values($1,$2) on conflict do nothing',[playerId,next])
        : await client.query("update ih2.lower_pumpworks_outings set progress=$2 where player_id=$1 and (progress->>'revision')::int=$3",[playerId,next,before.revision]);
      if(result.rowCount!==1)throw new Error('The saved dungeon progress changed. Retry with the current view.');
      await client.query('commit');
      return next;
    }catch(error){
      await client.query('rollback');
      throw error;
    }finally{
      client.release();
    }
  }
}
