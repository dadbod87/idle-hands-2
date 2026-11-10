import Phaser from 'phaser';
import { Session } from './game/session.ts';
import { worlds, type Stop } from './game/world.ts';
import { WorldScene } from './phaser/WorldScene.ts';
import './ui/style.css';
import {questStep} from './game/workshop.ts';
import {climateFixture} from './game/town-climate.ts';
import {dialogueFor,type DialogueContext} from './game/town-people.ts';
import {TownClient,TownUI} from './ui/town.ts';
import {WorkshopUI} from './ui/workshop.ts';
import { renderStudy, renderVarietyStudy, guideContents } from './art/study.ts';
if(new URLSearchParams(location.search).has('variety-study')) { renderVarietyStudy(); } else if(new URLSearchParams(location.search).has('art-study')) { renderStudy(); } else {

const townMode=new URLSearchParams(window.location.search).has('town');
const saveKey = 'ih2:pilot-position:v1';
let stored: unknown;
try { stored = townMode?null:JSON.parse(localStorage.getItem(saveKey) ?? 'null'); } catch { stored = null; }
const session = new Session(townMode?null:stored);
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<main class="shell ${townMode?'town-mode':''}">
 <header><div class="brand-mark" aria-hidden="true">II</div><div class="brand"><p class="eyebrow">THE PATRON GROUP · A NEW CHAPTER</p><h1>Idle Hands <span>2</span></h1></div><div class="pilot-tag">NEIGHBORHOOD STUDY<span>Local workshop · saved here</span></div>${townMode?'<button id="resident" type="button" aria-label="Choose practice resident">Resident</button>':''}<button id="field-guide" aria-label="Open field guide" title="Town field guide"><svg viewBox="0 0 24 24" width="23" height="23" aria-hidden="true"><path d="M3 4q5-2 9 1 4-3 9-1v16q-5-2-9 1-4-3-9-1ZM12 5v16" fill="none" stroke="currentColor" stroke-width="2"/></svg></button></header>
 <section class="world-wrap" aria-label="Neighborhood playfield"><div id="world"></div><div class="location-tag" id="location">Town square<span>Under new mismanagement.</span></div><p class="world-note" id="instructions">Tap the floor to walk.<span>WASD / arrows · E to interact</span></p><p class="boot" id="boot" role="status">Opening the town. Finding the keys.</p></section>
 <footer><div class="context"><span class="eyebrow">FIELD NOTES</span><p id="feedback" role="status" aria-live="polite">Tap the three material depots below you. Your first planter starts here.</p></div><nav aria-label="Game controls"><button id="places"><span aria-hidden="true">⌖</span> Places</button><button id="bag">Bag & journal</button><button id="interact" class="primary" disabled>Nothing nearby</button></nav></footer>
</main>
<dialog id="panel" aria-labelledby="panel-title"><form method="dialog"><header class="dialog-head"><div><p class="eyebrow">TOWN INFORMATION SERVICES</p><h2 id="panel-title">Places to go</h2></div><button aria-label="Close panel" value="close">×</button></header><div id="panel-body"></div></form></dialog>`;
const panel = document.querySelector<HTMLDialogElement>('#panel')!;
const title = document.querySelector<HTMLElement>('#panel-title')!;
const body = document.querySelector<HTMLDivElement>('#panel-body')!;
const feedback = document.querySelector<HTMLElement>('#feedback')!;
const interactButton = document.querySelector<HTMLButtonElement>('#interact')!;
const location = document.querySelector<HTMLElement>('#location')!;
const scene = new WorldScene(session);
let skyOffset=0;scene.skyNow=()=>Date.now()+skyOffset;scene.skyFixture=climateFixture(new URLSearchParams(window.location.search));
const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'world', backgroundColor: '#a3b090',
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, pixelArt: false }, audio: { noAudio: true },
  fps: { target: 60 }, scene: [scene]
});
scene.onWalkFailure=()=>feedback.textContent='That spot cannot be reached. Try a clear patch of ground or tap a named prop.';
const worldContainer=document.querySelector<HTMLElement>('#world')!;
const updateTextMode=()=>app.querySelector('.shell')?.classList.toggle('large-text',parseFloat(getComputedStyle(document.documentElement).fontSize)>20);
updateTextMode();
const worldResize=new ResizeObserver(entries=>{updateTextMode();const {width,height}=entries[0].contentRect;if(game.isBooted&&width>0&&height>0&&(Math.abs(game.scale.width-width)>.5||Math.abs(game.scale.height-height)>.5))game.scale.setParentSize(width,height);});
worldResize.observe(worldContainer);
let ready = false;
let lastContext = '';
function save() { if(townMode)return; try { localStorage.setItem(saveKey, JSON.stringify(session.save())); } catch { feedback.textContent = 'Position could not be saved in this browser. The pilot remains playable.'; } }
function focusWorld() { document.querySelector('canvas')?.focus(); }
function closePanel() { workshop.closed(); if (session.locked) session.lock(false); panel.close(); focusWorld(); }
panel.addEventListener('submit', event => { event.preventDefault(); closePanel(); });
panel.addEventListener('close', () => { workshop.closed(); if (session.locked) session.lock(false); focusWorld(); });
panel.addEventListener('cancel', () => { session.lock(false); });
function openPanel(heading: string) { session.lock(true); title.textContent = heading; body.replaceChildren(); panel.showModal(); }
function paragraph(text: string) { const p = document.createElement('p'); p.textContent = text; return p; }
let townUI:TownUI|undefined;
let residentId='',serverInstance='',needResync=true,lastSent='',lastMove=0,moveBackoff=0;
let movement:Promise<void>|null=null;
const town=townMode?new TownClient({
 onSnapshot:snapshot=>{skyOffset=snapshot.serverTime-Date.now();if(residentId!==snapshot.playerId||needResync||(snapshot.serverInstance&&snapshot.serverInstance!==serverInstance)){scene.residents=[];session.enter(snapshot.position.room,snapshot.position.position);residentId=snapshot.playerId;lastContext='';serverInstance=snapshot.serverInstance??serverInstance;needResync=false;lastSent=JSON.stringify(snapshot.position);if(!panel.open)session.lock(false);}scene.residentId=snapshot.playerId;scene.bridgeRestored=snapshot.bridge.restored;scene.refreshDecorations();townUI?.refresh();const residentButton=document.querySelector('#resident');if(residentButton)residentButton.textContent=snapshot.name;const tag=document.querySelector('.pilot-tag span');if(tag)tag.textContent=snapshot.name+' · practice town';},
 onPresence:presence=>{scene.residents=Array.isArray(presence)?presence:[];},
 onConnection:message=>{feedback.textContent=message;if(message.includes('interrupted')){needResync=true;session.lock(true);}},
 beforeCommand:()=>flushMovement(true)
}):null;
async function flushMovement(force=false):Promise<void>{
 if(!town?.snapshot)return;if(movement){await movement;if(!force)return;}
 if(!force&&(Date.now()-lastMove<150||Date.now()<moveBackoff))return;
 const value={room:session.room,position:{...session.position}},hash=JSON.stringify(value);if(hash===lastSent)return;
 lastMove=Date.now();
 const action=town.movement(value).then(()=>{lastSent=hash;moveBackoff=0;}).catch(async error=>{moveBackoff=Date.now()+2000;needResync=true;session.lock(true);feedback.textContent='Movement could not be confirmed. Reconnecting to the local town…';try{const snapshot=await town.load();session.enter(snapshot.position.room,snapshot.position.position);lastSent=JSON.stringify(snapshot.position);}catch{/* SSE reconnect reloads the authoritative position. */}if(force)throw error;}).finally(()=>movement=null);
 movement=action;await action;
}
const remoteWorkshop=town?.workshopAdapter();
const workshop=new WorkshopUI({open:openPanel,body,feedback:message=>feedback.textContent=message,inside:()=>session.room==='workshop',changed:()=>scene.refreshDecorations()},remoteWorkshop);
if(town){townUI=new TownUI({open:openPanel,body,feedback:message=>feedback.textContent=message,changed:()=>scene.refreshDecorations()},town);document.querySelector('#resident')!.addEventListener('click',()=>void townUI!.showLogin(()=>closePanel()));}
scene.decorations=()=>workshop.state.placements;
document.querySelector('#bag')!.addEventListener('click',()=>workshop.showInventory());
document.querySelector('#field-guide')!.addEventListener('click',()=>{
  openPanel('Town field guide');body.innerHTML=guideContents(session.room==='workshop',townMode);if(scene.skyFixture){const live=document.createElement('a');live.className='destination live-clock';live.href=townMode?'/?town=1':'/';live.textContent='Return to the live town clock';body.prepend(live);}const objective=questStep(workshop.state);const note=paragraph(objective.title+' — '+objective.detail);note.className='quest-card';body.prepend(note);const climate=scene.climateState();if(climate){const clock=paragraph('Town time · '+String(Math.floor(climate.minute/60)).padStart(2,'0')+':'+String(climate.minute%60).padStart(2,'0')+' · '+climate.label+(climate.fixture?' · Lighting study':''));clock.id='guide-sky';body.prepend(clock);}
  body.querySelector('#guide-workshop')!.addEventListener('click',()=>{closePanel();const stop=worlds[session.room].stops.find(s=>s.id==='workshop'||s.id==='bench');if(stop)session.walk(stop.point);feedback.textContent=session.room==='square'?'Walking to your workshop.':'Your bench is right here.';});
});
document.querySelector('#places')!.addEventListener('click', () => {
  openPanel('Places to go');
  body.append(paragraph('Pick a stop. Your employee will walk there; you can inspect it when you arrive.'));
  for (const stop of worlds[session.room].stops) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'destination';
    button.textContent = stop.name + ' →'; button.dataset.destination = stop.id;
    button.addEventListener('click', () => { closePanel(); session.lock(false); session.walk(stop.point); feedback.textContent = `Walking to ${stop.name}.`; });
    body.append(button);
  }
});
function activate(stop: Stop) {
  const job=workshop.state.job,objective=questStep(workshop.state);
  const dialogue=dialogueFor(stop.id,{room:session.room,questStage:objective.id as DialogueContext['questStage'],job:job?.recipe??'none',jobReady:!!job&&job.readyAt<=(remoteWorkshop?.now()??Date.now()),bridgeRestored:scene.bridgeRestored,shared:townMode,phase:scene.climateState()?.phase??'day'});
  if(dialogue){
    openPanel(dialogue.title);for(const line of dialogue.lines)body.append(paragraph(line));
    if(dialogue.action){const action=dialogue.action,button=document.createElement('button');button.type='button';button.className='destination';button.dataset.npcAction=action.destination;button.textContent=action.label;button.addEventListener('click',()=>{if(action.destination==='journal'){workshop.showInventory();return;}closePanel();const target=worlds[session.room].stops.find(s=>s.id===action.destination||(action.destination==='workshop'&&s.id==='bench'));if(target){session.walk(target.point);feedback.textContent='Walking to '+target.name+'.';}});body.append(button);}
    return;
  }
  if(town&&stop.id==='bridge'){townUI!.showBridge();return;}
  if(town&&stop.id==='plot'){townUI!.showPlots();return;}
  if(['scrap','timber','supplies'].includes(stop.id)){workshop.showResource(stop.id as 'scrap'|'timber'|'supplies');return;}
  if(stop.id==='bench'){workshop.showBench();return;}
  if (stop.transition) {
    session.enter(stop.transition, stop.arrival); save(); focusWorld(); feedback.textContent = stop.transition === 'workshop' ? 'Your workshop. Tap the bench to make your first planter.' : (scene.bridgeRestored?'Back in the square. The bridge is repaired; the committee has finally earned its name.':'Back in the square. The committee has made no measurable progress.');
  } else {
    openPanel(stop.name); body.append(paragraph(stop.text));
    const note = paragraph(townMode?'Shared practice keeps your bridge donations and plot progress. The café and wider trail are still being prepared.':'This workshop is saved in this browser. Shared bridge donations and plot ownership use the separate shared-practice town.'); note.className = 'disclosure'; body.append(note);
  }
}
function interact() {
  if (session.locked) return;
  const stop = session.nearby();
  if (stop) activate(stop);
}
interactButton.addEventListener('click', interact);
document.addEventListener('keydown', e => {
  if (e.repeat || session.locked || !(e.key === 'e' || e.key === 'E' || e.key === 'Enter')) return;
  if (e.target instanceof HTMLElement && e.target.closest('button,input,dialog')) return;
  e.preventDefault(); interact();
});
scene.onFrame = () => {
  if(town&&!document.hidden)void flushMovement().catch(()=>{});
  if (!ready) {
    ready = true; document.querySelector('#boot')?.remove();
    const canvas = document.querySelector('canvas')!; canvas.tabIndex = 0; canvas.setAttribute('aria-label', 'Walkable neighborhood. Use Places for named destinations.'); canvas.setAttribute('aria-describedby', 'instructions'); focusWorld();
    if(town){session.lock(true);void town.load().then(()=>town.connect()).catch(()=>townUI!.showLogin(()=>closePanel()));}
  }
  const arrival = session.takeArrival();
  if (arrival) activate(arrival);
  const stop = session.nearby();
  const state = session.room + ':' + (stop?.id ?? '');
  if (state !== lastContext) {
    lastContext = state;
    location.innerHTML = session.room === 'square' ? 'Town square<span>Under new mismanagement.</span>' : 'Your workshop<span>Great things take time.</span>';
    if(town){const label=document.createElement('small');label.className='fixture-label';label.textContent='Practice town · '+(town.snapshot?.name??'choose a resident');location.append(label);}
    interactButton.textContent = stop ? (stop.transition ? `Enter ${stop.transition === 'workshop' ? 'workshop' : 'square'}` : 'Inspect') : 'Nothing nearby';
    interactButton.disabled = !stop;
    interactButton.setAttribute('aria-label', stop ? (stop.transition ? `Enter ${stop.transition === 'workshop' ? 'workshop' : 'town square'}` : `Inspect ${stop.name}`) : 'Nothing nearby');
  }
  const climate=scene.climateState();if(climate){let sky=document.querySelector<HTMLElement>('#town-sky');if(!sky){sky=document.createElement('small');sky.id='town-sky';sky.setAttribute('aria-label','Town time and weather');location.append(sky);}const hour=String(Math.floor(climate.minute/60)).padStart(2,'0'),minute=String(climate.minute%60).padStart(2,'0');const label=(climate.fixture?'Lighting study · ':'')+climate.label+' · '+hour+':'+minute;if(sky.textContent!==label)sky.textContent=label;if(panel.open){const guide=document.querySelector<HTMLElement>('#guide-sky');const clockLabel='Town time · '+hour+':'+minute+' · '+climate.label+(climate.fixture?' · Lighting study':'');if(guide&&guide.textContent!==clockLabel)guide.textContent=clockLabel;}}
};
window.addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => { if(document.hidden)save();else if(town){needResync=true;session.lock(true);void town.load().catch(()=>{});} });
window.addEventListener('pageshow',event=>{if(event.persisted&&town){needResync=true;session.lock(true);void town.load().catch(()=>{});}});
// Read-only diagnostics for reproducible pilot checks; never an economy/debug mutation API.
Object.defineProperty(window, '__pilot', { value: Object.freeze({
  snapshot: () => session.snapshot(),
  town:()=>town?.snapshot?JSON.parse(JSON.stringify(town.snapshot)):null,
  workshop:()=>workshop.snapshot(),
  metrics: () => {
    const samples = scene.frameSamples.slice().sort((a, b) => a - b);
    return { climate:scene.climateState(), ready, frameSamples: samples.length, p95FrameMs: samples[Math.floor(samples.length * .95)] ?? null, renderer: game.renderer?.type, phaser: Phaser.VERSION, visual:scene.visualState() };
  },
  screenPoint: (x: number, y: number) => { const c = scene.cameras.main; return { x: (x + .5) * 32 - c.scrollX, y: (y + .5) * 32 - c.scrollY }; }
}), writable: false });

}
