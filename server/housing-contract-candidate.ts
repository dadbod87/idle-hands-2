/** Dedicated isolated contract store; never registered in current HTTP or migrations. */
import {createHash,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import type {Pool,PoolClient} from 'pg';
import {z} from 'zod';
import {localDatabaseUrl} from './db.ts';
import {housingAccountSchema,legacyHousingAccount,quoteSchema,makeHousingQuote,startHousingBuild,finishHousingBuild,arrangeHousing,publicHousing,arrangeHousingSchema,HOUSING_CATALOG_VERSION,type HousingAccount,type HousingOutcome,type Occupant,type HousingQuote} from '../src/design/housing-contract.ts';
const names=['ih2_housing_test','ih2_housing_restore'];
const identity=z.string().regex(/^[a-zA-Z0-9:_-]{1,80}$/);
const rev=z.number().int().min(0).max(1_000_000);
const base={version:z.literal(1),catalogVersion:z.literal(HOUSING_CATALOG_VERSION),id:z.uuid(),expectedRevision:rev};
export const housingCommandSchema=z.discriminatedUnion('kind',[
 z.object({...base,kind:z.literal('confirm'),quoteId:z.uuid()}).strict(),
 z.object({...base,kind:z.literal('finish'),buildId:z.uuid()}).strict(),
 z.object({...base,kind:z.literal('arrange'),arrangement:arrangeHousingSchema}).strict()
]);
function canonical(v:unknown):string{return Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>JSON.stringify(k)+':'+canonical(x)).join(',')+'}':JSON.stringify(v);}
const hash=(v:unknown)=>createHash('sha256').update(canonical(v)).digest('hex');
export type HousingReceipt={ok:boolean;message:string;revision:number;bagReturns:HousingOutcome['bagReturns']};
export class HousingContractCandidate{
 readonly pool:Pool;private now:()=>number;
 constructor(pool:Pool,options:{now?:()=>number}={}){
  const o=pool.options;if(o.connectionString)HousingContractCandidate.databaseUrl(o.connectionString);
  if(Number(o.port)===55432)throw Error('Housing candidate refuses the protected practice cluster.');
  if(o.host!==undefined&&!['127.0.0.1','localhost'].includes(o.host)||o.database!==undefined&&!names.includes(o.database)||!o.connectionString&&(!o.host||!o.database)||o.stream)throw Error('Housing candidate requires its dedicated loopback test/restore database.');
  this.pool=pool;this.now=options.now??Date.now;
 }
 static databaseUrl(value:string){localDatabaseUrl(value);if(new URL(value).port==='55432')throw Error('Housing candidate refuses the protected practice cluster.');if(!names.includes(new URL(value).pathname.slice(1)))throw Error('Housing candidate refuses protected databases.');return value;}
 private async guard(c:PoolClient){if(!names.includes((await c.query('select current_database() as name')).rows[0].name))throw Error('Housing candidate refuses this database.');}
 private time(){return z.number().int().min(0).max(Number.MAX_SAFE_INTEGER-86_400_000).parse(this.now());}
 async install(){const c=await this.pool.connect();try{await this.guard(c);await c.query('begin');await c.query(await readFile(new URL('./candidates/housing-contract.sql',import.meta.url),'utf8'));await c.query('commit');}catch(e){await c.query('rollback');throw e;}finally{c.release();}}
 /** Explicit trusted fixture/bootstrap only. Copies strict existing rights; never creates stock. */
 async importAccount(input:HousingAccount){const a=housingAccountSchema.parse(input);if(a.build)throw Error('Bootstrap accepts existing rights only, never a free paid build.');const c=await this.pool.connect();try{await this.guard(c);await c.query('insert into ih2_housing_candidate.accounts(owner_id,account) values($1,$2)',[a.ownerId,a]);}finally{c.release();}}
 /** Snapshot-copy current town rows in one transaction; never update old roots/plots. */
 async importLegacyTown(){const c=await this.pool.connect();try{await this.guard(c);await c.query('begin isolation level serializable');const rows=(await c.query('select p.id,p.workshop,h.id::text as plot_id,h.level,h.placements,h.workroom_placements from ih2.players p left join ih2.plots h on h.owner_id=p.id order by p.id')).rows;for(const row of rows){const a=legacyHousingAccount(row.id,row.workshop,row.plot_id?{plotId:row.plot_id,layout:{level:row.level,placements:row.placements,workroomPlacements:row.workroom_placements}}:null);await c.query('insert into ih2_housing_candidate.accounts(owner_id,account) values($1,$2)',[a.ownerId,a]);}await c.query('commit');return rows.length;}catch(e){await c.query('rollback');throw e;}finally{c.release();}}
 private async read(c:PoolClient,id:string,lock=false){
  const r=(await c.query('select account from ih2_housing_candidate.accounts where owner_id=$1'+(lock?' for update':''),[id])).rows[0];if(!r)throw Error('Unknown isolated housing identity.');
  const a=housingAccountSchema.parse(r.account),open=(await c.query('select record from ih2_housing_candidate.builds where owner_id=$1 and finished_at is null',[id])).rows;
  if(a.build?(open.length!==1||canonical(open[0].record)!==canonical(a.build)):open.length!==0)throw Error('Paid construction history could not be confirmed. Preserve it read-only.');return a;
 }
 async snapshot(id:string){identity.parse(id);const c=await this.pool.connect();try{await this.guard(c);await c.query('begin isolation level repeatable read read only');const a=await this.read(c,id);await c.query('commit');return a;}catch(e){await c.query('rollback');throw e;}finally{c.release();}}
 /** Batch public appearance with existing permanent trophy flags; no N+1 or new award ledger. */
 async publicStreet(){const c=await this.pool.connect();try{
  await this.guard(c);await c.query('begin isolation level repeatable read read only');const now=this.time();
  const rows=(await c.query("select a.account,b.record as open_build,exists(select 1 from ih2.quest_awards q where q.player_id=a.owner_id and q.quest_id='trail-pennant-v1') as pennant_owned from ih2_housing_candidate.accounts a left join ih2_housing_candidate.builds b on b.owner_id=a.owner_id and b.finished_at is null order by a.owner_id")).rows;
  const homes=rows.map(row=>{const a=housingAccountSchema.parse(row.account);if(a.build?(!row.open_build||canonical(row.open_build)!==canonical(a.build)):!!row.open_build)throw Error('Paid construction history could not be confirmed. Preserve it read-only.');return publicHousing(a,now,{pennantOwned:row.pennant_owned});}).filter(v=>v!==null);
  await c.query('commit');return homes;
 }catch(e){await c.query('rollback');throw e;}finally{c.release();}}

 async quote(id:string,raw:unknown){identity.parse(id);const c=await this.pool.connect();try{
  await this.guard(c);await c.query('begin');const a=await this.read(c,id,true);const q=makeHousingQuote(a,raw,this.time(),randomUUID());
  if(!a.home&&(await c.query('select owner_id from ih2_housing_candidate.accounts where plot_id=$1',[q.plotId])).rowCount)throw Error('That parcel is already owned or being built.');
  await c.query('insert into ih2_housing_candidate.quotes values($1,$2,$3)',[q.id,id,q]);await c.query('commit');return q;
 }catch(e){await c.query('rollback');throw e;}finally{c.release();}}
 /** Server identity comes from caller, not request. Occupants are supplied by a trusted
  * future movement authority; these local contract tables have no HTTP/player client.
  * Integration must hold its room/presence lock while executing completion. */
 async command(id:string,raw:unknown,occupants:readonly Occupant[]=[]):Promise<HousingReceipt&{replayed:boolean;account:HousingAccount}>{
  identity.parse(id);const parsed=housingCommandSchema.safeParse(raw);if(!parsed.success){const a=await this.snapshot(id);return{ok:false,message:'Unsupported housing request. Nothing changed.',revision:a.workshop.revision,bagReturns:[],replayed:false,account:a};}
  const cmd=parsed.data,c=await this.pool.connect();try{
   await this.guard(c);await c.query('begin');await c.query("set local lock_timeout='3s'");const a=await this.read(c,id,true),now=this.time();
   const fail=(message:string):HousingReceipt=>({ok:false,message,revision:a.workshop.revision,bagReturns:[]});
   const prior=(await c.query('select payload_hash,result from ih2_housing_candidate.receipts where owner_id=$1 and id=$2',[id,cmd.id])).rows[0];
   if(prior){const same=prior.payload_hash===hash(cmd),result=same?prior.result:fail('That request ID already belongs to another action.');await c.query('commit');return{...result,replayed:same,account:a};}
   let outcome:HousingOutcome={ok:false,account:a,message:'Your belongings changed. Review before confirming again.',bagReturns:[]};
   if(cmd.expectedRevision===a.workshop.revision){
    if(cmd.kind==='confirm'){
     const row=(await c.query('select quote from ih2_housing_candidate.quotes where id=$1 and owner_id=$2',[cmd.quoteId,id])).rows[0];
     if(!row)outcome.message='That reviewed quote is not yours or is unavailable.';
     else{
      const q=quoteSchema.parse(row.quote);
      // Lock only this parcel after this owner. No owner-to-owner lock cycle.
      await c.query("select pg_advisory_xact_lock(hashtextextended('ih2-housing:' || $1,0))",[q.plotId]);
      const occupied=(await c.query('select owner_id from ih2_housing_candidate.accounts where plot_id=$1 and owner_id<>$2',[q.plotId,id])).rowCount;
      if(occupied)outcome.message='Someone else has taken that parcel. Nothing was spent; choose another address.';
      else outcome=startHousingBuild(a,q,now,randomUUID());
     }
    }else if(cmd.kind==='finish'){
     if(a.build?.id!==cmd.buildId)outcome.message='That construction is no longer awaiting completion.';
     else outcome=finishHousingBuild(a,now,occupants);
    }else{
     if(cmd.arrangement.expectedRevision!==cmd.expectedRevision)outcome.message='The arrangement revision does not match.';
     else outcome=arrangeHousing(a,cmd.arrangement,now);
    }
   }
   const result:HousingReceipt={ok:outcome.ok,message:outcome.message,revision:outcome.account.workshop.revision,bagReturns:outcome.bagReturns};
   if(outcome.ok){
    await c.query('update ih2_housing_candidate.accounts set account=$2 where owner_id=$1',[id,outcome.account]);
    if(cmd.kind==='confirm'){const b=outcome.account.build!;await c.query('insert into ih2_housing_candidate.builds(id,owner_id,quote_id,record) values($1,$2,$3,$4)',[b.id,id,b.quoteId,b]);}
    if(cmd.kind==='finish')await c.query('update ih2_housing_candidate.builds set finished_at=$2 where id=$1',[cmd.buildId,now]);
   }
   await c.query('insert into ih2_housing_candidate.receipts values($1,$2,$3,$4)',[id,cmd.id,hash(cmd),result]);await c.query('commit');return{...result,replayed:false,account:outcome.account};
  }catch(e){await c.query('rollback');throw e;}finally{c.release();}
 }
}
