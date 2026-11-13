/** Dated accepted-source audit, not a catalog migration or runtime alias table. */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export function cafeBaselineAudit(){
 const catalog=JSON.parse(readFileSync('docs/idle-hands-2/design/CONTENT_CATALOG.json','utf8'));
 const baseline=JSON.parse(readFileSync('docs/evidence/IH2-099/baseline-runtime.json','utf8'));
 const related:Record<string,{evidence:string;scope:string}>={
  'wood:pine':{evidence:'src/game/carpentry.ts',scope:'A bounded personal fallen-pine pool and carried bundles exist. This is not a general forest/species inventory or a catalog-ID migration.'},
  'equipment:hand-tool':{evidence:'src/game/carpentry.ts',scope:'The bound hand saw is explicitly self-equipped. General hand-tool slots, public equipment and tiers remain future.'},
  'home:garden-bed':{evidence:'src/game/garden.ts',scope:'Three private rented beds exist without a house prerequisite. House-plot outdoor construction/decorating is not implemented.'},
 };
 const cautions:Record<string,string>={
  'fruit:orchard':'Decorative fruit trees and observations are not harvested fruit inventory.',
  'equipment:axe':'Preparing fallen pine with a hand saw is not axe chopping.',
  'recipe:pine-crate':'A donated crate and a pine easel do not implement the pine-crate recipe.',
  'recipe:birch-stool':'A donated stool and decorative birch trees do not implement birch lumber or a crafted birch stool.',
  'food:herb-soup':'A soup-styled tasting illustration in099does not implement edible herb soup.',
  'recipe:herb-soup':'Inputs/duration remain null and non-executable.099does not price or implement this recipe.',
 };
 const rows=catalog.entries.map((e:any)=>({id:e.id,catalogDeclaration:e.implementation.status,accepted090:e.implementation.runtime_ref?'bounded-existing-definition':related[e.id]?'related-bounded-slice':'future-only',evidence:e.implementation.runtime_ref?.file??related[e.id]?.evidence??null,scope:related[e.id]?.scope??cautions[e.id]??(e.implementation.runtime_ref?'Existing durable definition only; not an entire candidate phase, complete art/animation family or a new recipe.':'No executable accepted090definition. Candidate values and asset gaps remain unresolved.')}));
 const sources=['src/game/workshop.ts','src/game/garden.ts','src/game/carpentry.ts','src/game/commission.ts','src/game/world.ts','src/game/home-layout.ts','src/game/neighborhood.ts','docs/idle-hands-2/design/CONTENT_CATALOG.json'];
 const fingerprints:Record<string,string>={};for(const p of sources)fingerprints[p]=createHash('sha256').update(readFileSync(p)).digest('hex');
 return{classification:'DATED_SOURCE_AUDIT_NOT_RUNTIME_MAPPING',acceptedMain:baseline.acceptedMain,acceptedBaselineFiles:Object.keys(baseline.runtime).length,acceptedArtFiles:Object.keys(baseline.art).length,acceptedSvgFiles:Object.keys(baseline.art).filter(p=>p.endsWith('.svg')).length,candidateCatalogEntries:rows.length,counts:Object.fromEntries(['bounded-existing-definition','related-bounded-slice','future-only'].map(k=>[k,rows.filter((r:any)=>r.accepted090===k).length])),fingerprints,rows,
  outside48:[{scope:'Accepted runtime outside the old catalog',evidence:['src/game/garden.ts','src/game/carpentry.ts','src/game/commission.ts'],includes:['Two actual crops, radish and marigold; neither aliases candidate kitchen herbs.','Pine handsaw lesson/pool, kept easel, hamper and noticeboard; not pine crates or generic woodworking mastery.','Pip addressed commission and once-only letterbox with3free motifs; not human mail/chat.']},{scope:'Accepted presentation/property after the old audit',evidence:['src/game/neighborhood.ts','src/game/home-layout.ts','src/ui/bag.ts','src/ui/workshop.ts'],includes:['Addressed expandable24-site neighborhoods, physical owner/visitor doors, six starter/eight expanded nooks.','Separate bag/journal, confirmed collection receipts, illustrated material depots, day/night/world-anchored rain and three residential families.']}],
  pendingPresentation:'091–098are locally reviewed source candidates, not accepted by this audit. Their clear Pine/garden/housing facts, scoped delayed replies, garden art/framing and stable toolbar do not add food, crops, rules or a café service.',
  caveat:'No content IDs are renamed and no dated catalog declaration/null price is silently changed. Evidence references denote bounded accepted slices; verify future source and actual devices separately.'};
}
