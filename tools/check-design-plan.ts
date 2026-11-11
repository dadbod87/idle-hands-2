import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {RESOURCE_IDS,PROP_IDS,RECIPES,createWorkshop} from '../src/game/workshop.ts';
import {TRAIL_PENNANT_AWARD} from '../src/game/town-rules.ts';
import {worlds} from '../src/game/world.ts';

// Audits a non-executable design catalog. This never imports it into game state.
export const DESIGN_PHASES=['starter-home','first-woodland','food-combat','regional-cities'] as const;
type Obj=Record<string,any>;
export function checkDesignPlan(catalog:Obj,regionPlan:Obj,repoRoot=process.cwd()):string[]{
 const errors:string[]=[];
 const require=(ok:unknown,message:string)=>{if(!ok)errors.push(message);};
 const file=(name:unknown)=>typeof name==='string'&&!name.startsWith('/')&&!name.split('/').includes('..')&&existsSync(resolve(repoRoot,name));
 if(!catalog||!regionPlan)return['Catalog and region plan are required.'];
 require(catalog.schema_version===1&&catalog.status==='CANDIDATE-DESIGN-ONLY'&&catalog.not_executable_economy===true,'Catalog must remain explicitly candidate and non-executable.');
 require(regionPlan.designOnly===true&&regionPlan.status==='candidate','Region map must remain a design-only candidate.');
 const entries:Obj[]=Array.isArray(catalog.entries)?catalog.entries:[];
 const regions:Obj[]=Array.isArray(regionPlan.regions)?regionPlan.regions:[];
 require(entries.length>0&&catalog.count===entries.length,'Catalog count must match its nonempty entries.');
 const ids=new Set<string>(),regionIds=new Set<string>();
 const byId=new Map<string,Obj>();const regionById=new Map<string,Obj>();
 for(const region of regions){require(typeof region.id==='string'&&!regionIds.has(region.id),`Duplicate or invalid region: ${region.id}`);regionIds.add(region.id);regionById.set(region.id,region);require(DESIGN_PHASES.includes(region.phase),`Unknown phase for region ${region.id}`);}
 require(regionIds.has('ledgerwick'),'A starter town is required.');
 require(Object.keys(catalog.candidate_regions??{}).length===regionIds.size,'Catalog and map region counts differ.');
 for(const [id,value]of Object.entries(catalog.candidate_regions??{}) as [string,Obj][]){require(regionIds.has(id)&&value.runtime_region===false,`Region ${id} is unknown or falsely runtime-enabled.`);}
 for(const entry of entries){require(typeof entry.id==='string'&&/^[a-z][a-z0-9-]*:[a-z0-9-]+$/.test(entry.id)&&!ids.has(entry.id),`Duplicate or invalid content ID: ${entry.id}`);ids.add(entry.id);byId.set(entry.id,entry);}
 const phaseOf=(phase:string)=>DESIGN_PHASES.indexOf(phase as typeof DESIGN_PHASES[number]);
 for(const entry of entries){
  const name=entry.id,phase=phaseOf(entry.phase);require(phase>=0,`Unknown phase for ${name}`);
  require(entry.catalog_status==='candidate',`${name} must remain a candidate.`);
  require(Array.isArray(entry.region_ids)&&entry.region_ids.length>0,`${name} needs explicit first-availability regions.`);
  for(const id of entry.region_ids??[]){require(regionIds.has(id),`${name} references unknown region ${id}`);require(phaseOf(regionById.get(id)?.phase??'')<=phase,`${name} first availability requires later region ${id}`);}
  const ref=(id:string,where:string)=>{require(ids.has(id),`${name} ${where} references missing ${id}`);if(ids.has(id))require(phaseOf(byId.get(id)!.phase)<=phase,`${name} ${where} requires later-phase ${id}`);};
  for(const source of entry.source??[])if(source.content_id)ref(source.content_id,'source');
  const recipe=entry.recipe;
  if(recipe){
   require(Array.isArray(recipe.inputs)&&recipe.inputs.length&&Array.isArray(recipe.outputs)&&recipe.outputs.length,`${name} recipe needs inputs and outputs.`);
   const used=new Set<string>();
   for(const [side,rows]of [['input',recipe.inputs],['output',recipe.outputs]] as [string,Obj[]][]){for(const row of rows??[]){ref(row.content_id,side);require(!used.has(side+row.content_id),`${name} duplicates ${side} ${row.content_id}`);used.add(side+row.content_id);require(row.amount===null||(Number.isSafeInteger(row.amount)&&row.amount>0),`${name} ${side} amount must be positive or explicitly unresolved.`);}}
   require(recipe.duration_ms===null||(Number.isSafeInteger(recipe.duration_ms)&&recipe.duration_ms>0),`${name} duration must be positive or explicitly unresolved.`);
   if(recipe.duration_ms===null||(recipe.inputs??[]).some((row:Obj)=>row.amount===null))require(recipe.tuning_status==='candidate-unpriced-unbalanced',`${name} unresolved recipe cannot be labelled balanced/executable.`);
  }
  require(entry.art?.final_item_family_complete===false,`${name} falsely claims a complete final art family.`);
  require(Array.isArray(entry.art?.requirements)&&entry.art.requirements.length>0,`${name} needs an explicit art contract.`);
  for(const art of entry.art?.requirements??[])require(typeof art.view==='string'&&Array.isArray(art.states)&&art.states.length>0&&typeof art.status==='string',`${name} has an incomplete art state/view requirement.`);
  for(const evidence of entry.art?.existing_evidence??[])require(file(evidence.file)&&!!evidence.scope,`${name} has missing or unscoped existing art evidence.`);
  const runtime=entry.implementation?.runtime_ref;
  require(['not-implemented','existing-definition'].includes(entry.implementation?.status),`${name} has unknown implementation status.`);
  require((entry.implementation?.status==='existing-definition')===!!runtime,`${name} runtime reference/status disagree.`);
  if(runtime){
   require(file(runtime.file),`${name} runtime file is missing.`);
   const valid=runtime.kind==='room'?runtime.id in worlds:runtime.kind==='resource'?RESOURCE_IDS.includes(runtime.id):runtime.kind==='prop'?PROP_IDS.includes(runtime.id):runtime.kind==='recipe'?runtime.id in RECIPES:runtime.kind==='inventory-counter'?runtime.id in createWorkshop(0):runtime.kind==='stop'?Object.values(worlds).some(world=>world.stops.some(stop=>stop.id===runtime.id)):(runtime.kind==='shared-project'&&runtime.id==='bridge')||(runtime.kind==='quest-award'&&runtime.id===TRAIL_PENNANT_AWARD);
   require(valid,`${name} claims an unknown runtime definition ${runtime.id}`);
   if(runtime.kind==='recipe'&&runtime.id in RECIPES){const actual=RECIPES[runtime.id as keyof typeof RECIPES];require(recipe?.duration_ms===actual.durationMs,`${name} changes an existing normal production duration.`);const expected=Object.entries(actual.cost).map(([id,amount])=>({content_id:`material:${id}`,amount}));require(JSON.stringify(recipe?.inputs)===JSON.stringify(expected),`${name} changes existing recipe material costs.`);}
  }
 }
 for(const [phase,definition]of Object.entries(catalog.phases??{}) as [string,Obj][]){require(phaseOf(phase)>=0,`Unknown catalog phase ${phase}`);for(const id of definition.region_ids??[])require(regionIds.has(id),`Phase ${phase} references unknown region ${id}`);}
 const routes:Obj[]=Array.isArray(regionPlan.routes)?regionPlan.routes:[];const routeIds=new Set<string>();
 for(const route of routes){require(!!route.id&&!routeIds.has(route.id),`Duplicate route ${route.id}`);routeIds.add(route.id);require(regionIds.has(route.from)&&regionIds.has(route.to),`Route ${route.id} has an unknown endpoint.`);require(route.luckRequired===false,`Route ${route.id} must not require luck for access.`);}
 // Every safe settlement needs a route that never requires entering combat.
 const reached=new Set(['ledgerwick']);let changed=true;
 while(changed){changed=false;for(const route of routes){if(route.combatRequired||route.luckRequired)continue;if(reached.has(route.from)&&!reached.has(route.to)){reached.add(route.to);changed=true;}}}
 for(const region of regions)if(region.risk?.startsWith('Safe'))require(reached.has(region.id),`Safe settlement ${region.id} lacks a noncombat route.`);
 return errors;
}
export function loadDesignPlan(repoRoot=process.cwd()){const root=resolve(repoRoot,'docs/idle-hands-2/design');return{catalog:JSON.parse(readFileSync(resolve(root,'CONTENT_CATALOG.json'),'utf8')),regions:JSON.parse(readFileSync(resolve(root,'REGION_PLAN.json'),'utf8'))};}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){const {catalog,regions}=loadDesignPlan();const errors=checkDesignPlan(catalog,regions);if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`PASS: ${catalog.entries.length} candidate entries, ${regions.regions.length} regions, runtime anchors, recipe phases and safe routes. No runtime feature acceptance implied.`);}
