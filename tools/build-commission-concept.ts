import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {quoteImpact} from './commission-plan.ts';
import {PLACEMENT_SLOTS} from '../src/game/workshop.ts';
import {TOWN_PEOPLE} from '../src/game/town-people.ts';
import {worlds} from '../src/game/world.ts';

const find=(id:string)=>worlds.square.stops.find(s=>s.id===id)!;
const data={
 classification:'IH2-069 standalone fictional interaction study. No game API, persistence or authority.',
 people:[
  {id:'clerk',art:'marlow',name:TOWN_PEOPLE.find(p=>p.id==='clerk')!.name,role:'Town clerk',point:find('clerk').point,parcel:'Marlow · A permit for a form.',reply:'A permit for a form. At last, a form with a future.'},
  {id:'caretaker',art:'jun',name:TOWN_PEOPLE.find(p=>p.id==='caretaker')!.name,role:'Grounds caretaker',point:find('caretaker').point,parcel:'Jun · A progress report on grass.',reply:'The grass is growing. Management has asked it to be more specific.'},
  {id:'carpentry-desk',art:'nella',name:'Nella',role:'Pine workshop',point:find('carpentry-desk').point,parcel:'Nella · A tree’s application for annual leave.',reply:'Annual leave for a tree. I have approved the branching arrangement.'}
 ],
 captions:{
  'clerk-caretaker-carpentry-desk':'Administration, vegetation, fabrication. An unusually complete department.',
  'clerk-carpentry-desk-caretaker':'Approved, assembled, then planted. The route has requested an exception.',
  'caretaker-clerk-carpentry-desk':'The grass got the memo first. It is trying to remain grounded.',
  'caretaker-carpentry-desk-clerk':'Fieldwork before paperwork. Please whisper this part.',
  'carpentry-desk-clerk-caretaker':'Measure twice. File once. Water eventually.',
  'carpentry-desk-caretaker-clerk':'Work first. Forms last. Marlow has requested a meeting.'
 },
 variants:[{id:'leaf',name:'Leaf route'},{id:'sun',name:'Sun route'},{id:'moth',name:'Night post'}],
 cases:[
  {name:'Untouched starter pine + first radish',quote:quoteImpact({pine:6,radish:1,marigold:0})},
  {name:'Four pine planned for an easel',quote:quoteImpact({pine:4,radish:1,marigold:1})},
  {name:'Ingredients planned for a hamper',quote:quoteImpact({pine:2,radish:2,marigold:1})},
  {name:'Only one welcome-request radish',quote:quoteImpact({pine:2,radish:1,marigold:1})},
  {name:'Empty carried supplies',quote:quoteImpact({pine:0,radish:0,marigold:0})},
  {name:'Full pine and produce',quote:quoteImpact({pine:24,radish:12,marigold:12})}
 ],
 slots:PLACEMENT_SLOTS,
 goalNames:{easel:'an easel',hamper:'a hamper',welcomeRequest:'a welcome-bed request'}
};
const path='docs/evidence/IH2-069/concept/index.html';
const template=readFileSync('tools/templates/commission-concept.html','utf8');
if(template.split('__STUDY_DATA__').length!==2)throw Error('One study data placeholder is required.');
const output=template.replace('__STUDY_DATA__',JSON.stringify(data).replaceAll('<','\\u003c'));
if(process.argv.includes('--check')){if(readFileSync(path,'utf8')!==output)throw Error('Stale commission concept.');console.log('PASS fictional concept matches template/current stock probes.');}
else{mkdirSync('docs/evidence/IH2-069/concept',{recursive:true});writeFileSync(path,output);console.log('Built standalone fictional concept; no runtime files or accounts changed.');}
