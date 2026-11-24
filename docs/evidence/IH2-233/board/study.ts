import { applyWorkshop, createWorkshop } from '../../../../src/game/live-workshop.ts';
import {
 GLASSHOUSE_RULES, GLASSHOUSE_TASKS, GLASSHOUSE_PLANTS,
 glasshouseView, newGlasshouse, reviewGlasshouse, glasshouseTour, type GlasshouseReview,
} from '../../../../src/design/glasshouse-restoration.ts';
import {
 migrateGlasshousePine, postGlasshouseWork,
} from '../../../../src/design/glasshouse-pine.ts';

const names = {
 entrance: 'Clear the entrance',
 frame: 'Brace the frame',
 chart: 'Hand in a planting chart',
};
const tasks = {
 entrance: 'Borrow gloves. Everyone can help.',
 frame: 'Two pine bundles. Review the cost before giving.',
 chart: 'Three Inkwood observations. You keep the originals.',
};
const plantNames = {
 'committee-fern':'Committee fern',
 'very-patient-sundew':'Very patient sundew',
};
let now = 1_000_000;
let project = newGlasshouse();

function residentAccount(withPine: boolean) {
 let state = createWorkshop(now);
 if (withPine) {
  for (const carpentryAction of [
   {action:'learn-saw'}, {action:'equip-saw',equipped:true}, {action:'gather-pine',station:'crooked'},
  ]) {
   const result = applyWorkshop(state,{kind:'carpentry',carpentryAction,id:crypto.randomUUID(),expectedRevision:state.revision},now);
   if (!result.ok) throw new Error('The fictional starting role could not be prepared.');
   state=result.state;
  }
 }
 const account = migrateGlasshousePine(state.carpentry);
 if(!account)throw new Error('The fictional pine record could not be prepared.');
 return account;
}

const residents = [
 {name:'Aster',trailStamps:0,account:residentAccount(false)},
 {name:'Bea',trailStamps:0,account:residentAccount(true)},
 {name:'Casey',trailStamps:3,account:residentAccount(false)},
 {name:'Devon',trailStamps:0,account:residentAccount(true)},
];
const visits = new Map<string,GlasshouseReview>();
const plants = new Map<string,string>();
const roles = document.querySelector<HTMLSelectElement>('#resident')!;
const supplies = document.querySelector<HTMLElement>('#supplies')!;
const jobs = document.querySelector<HTMLElement>('#jobs')!;
const review = document.querySelector<HTMLElement>('#review')!;
const terms = document.querySelector<HTMLElement>('#review-terms')!;
const confirm = document.querySelector<HTMLButtonElement>('#confirm')!;
const advance = document.querySelector<HTMLButtonElement>('#advance')!;
const tour = document.querySelector<HTMLFormElement>('#tour')!;
const keep = tour.querySelector<HTMLButtonElement>('button')!;
const receipt = document.querySelector<HTMLElement>('#receipt')!;
const phase = document.querySelector<HTMLElement>('#phase')!;
const note = document.querySelector<HTMLElement>('#phase-note')!;

for (const [index, person] of residents.entries()) roles.add(new Option(person.name,String(index)));
const resident = () => residents[Number(roles.value)];
function facts() {
 const person=resident();
 return {resident:person.name,atGlasshouse:true,trailStamps:person.trailStamps,pine:person.account.pine.carried};
}
function say(text:string){
 receipt.textContent=text;
 if(text)receipt.focus();
}

function paint() {
 const current=glasshouseView(project,now)!;
 const person=resident();
 const pending=visits.get(person.name);
 supplies.textContent=person.account.pine.carried+' pine · '+person.trailStamps+' observations';
 jobs.hidden=current.phase!=='overgrown';
 phase.textContent=current.phase==='open'?'The Glasshouse is open':current.phase==='under-repair'?'The crew is fitting the panes':'Three jobs for the Glasshouse';
 note.textContent=current.phase==='open'
  ?'First tour for anyone, including people who arrived after the work.'
  :current.phase==='under-repair'
   ?'The trial schedule is twelve real hours from the final job.'
   :'The committee has found both the keys and something to do.';
 for(const [task,row] of rows){
  const done=current[task];
  row.section.dataset.done=String(done);
  row.heading.textContent=names[task]+(done?' · recorded':'');
  row.button.hidden=done;
  row.button.disabled=task==='frame'&&person.account.pine.carried<GLASSHOUSE_RULES.pine||task==='chart'&&person.trailStamps<3;
  row.detail.textContent=done?'The town has recorded this job.':
   row.button.disabled?(task==='frame'?'This resident needs two pine bundles.':'This resident needs three observations.'):tasks[task];
 }
 advance.hidden=current.phase!=='under-repair';
 review.hidden=!pending;
 terms.textContent=pending?names[pending.task]+' · '+(pending.pine
  ?'Give '+pending.pine+' pine. Keep '+(person.account.pine.carried-pending.pine)+' of '+person.account.pine.carried+'.'
  :'Free.'):'';
 const previousPlant=plants.get(person.name);
 tour.hidden=current.phase!=='open'||!!previousPlant;
 if(previousPlant&&current.phase==='open')note.textContent='This resident already kept '+previousPlant.toLowerCase()+'.';
}

const rows=new Map<typeof GLASSHOUSE_TASKS[number],{
 section:HTMLElement;heading:HTMLHeadingElement;detail:HTMLParagraphElement;button:HTMLButtonElement;
}>();
for(const task of GLASSHOUSE_TASKS){
 const section=document.createElement('article'),copy=document.createElement('div');
 const heading=document.createElement('h3'),detail=document.createElement('p'),button=document.createElement('button');
 section.className='job';
 button.type='button';
 button.textContent='Review · '+names[task];
 button.onclick=()=>{
  const person=resident();
  const outcome=reviewGlasshouse(project,facts(),task,now,crypto.randomUUID());
  if(!outcome.ok){say('This job is unavailable. Nothing spent.');return;}
  visits.set(person.name,outcome.review);
  paint();
  confirm.focus();
 };
 copy.append(heading,detail);
 section.append(copy,button);
 jobs.append(section);
 rows.set(task,{section,heading,detail,button});
}

roles.onchange=()=>{
 tour.reset();
 keep.disabled=true;
 say('');
 paint();
};
confirm.onclick=()=>{
 const person=resident(),pending=visits.get(person.name);
 if(!pending)return;
 const result=postGlasshouseWork(project,person.account,facts(),pending.id,pending,++now);
 visits.delete(person.name);
 if(!result.ok){
  paint();
  say(result.reason==='already'?'Someone already did that job. Nothing spent.':'The review could not be confirmed. Nothing spent.');
  return;
 }
 project=result.project;
 person.account=result.account;
 paint();
 say(names[pending.task]+' recorded.'+(result.debit?' Two pine used.':''));
};
document.querySelector<HTMLButtonElement>('#cancel')!.onclick=()=>{
 const name=resident().name, pending=visits.get(name);
 visits.delete(name);
 paint();
 if(pending&&!rows.get(pending.task)!.button.hidden)rows.get(pending.task)!.button.focus();
 else roles.focus();
};
advance.onclick=()=>{
 if(project.opensAt===null)return;
 now=project.opensAt+1;
 visits.clear();
 paint();
 say('The panes are in. The first tour is available.');
};
tour.onchange=()=>{keep.disabled=!tour.querySelector(':checked');};
tour.onsubmit=event=>{
 event.preventDefault();
 const value=new FormData(tour).get('plant');
 const chosen=GLASSHOUSE_PLANTS.find(plant=>plant===value);
 const name=resident().name;
 if(!chosen||!glasshouseTour(project,facts(),plants.has(name),chosen,now))return;
 plants.set(name,plantNames[chosen]);
 tour.reset();
 keep.disabled=true;
 paint();
 say(plantNames[chosen]+' kept in this preview.');
};
paint();
