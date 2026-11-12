import {CarpentryUI} from './ui/carpentry.ts';
import {carpentryActionLocations,PINE_STATIONS,createNoticeboard,settleNoticeboard,type NoticeboardState} from './game/carpentry.ts';
import {GardenUI} from './ui/garden.ts';
import {gardenActionLocations,STAKE_IDS,type StakeId} from './game/garden.ts';
import {surveyId,SURVEYS,type SurveyId} from './game/fieldwork.ts';
import Phaser from 'phaser';
import { Session } from './game/session.ts';
import { worlds,TRAIL_LANDMARK_IDS,type Stop } from './game/world.ts';
import { WorldScene } from './phaser/WorldScene.ts';
import './ui/style.css';
import {questStep} from './game/workshop.ts';
import {sharedObjective} from './game/shared-guidance.ts';
import {PLOT_CLAIM_KITS,PLOT_UPGRADE_KITS} from './game/town-rules.ts';
import {climateFixture} from './game/town-climate.ts';
import {dialogueFor,type DialogueContext} from './game/town-people.ts';
import {returnSummary,visitBaseline,parseVisit,type VisitBaseline} from './game/return-summary.ts';
import {TownClient,TownUI,type TownSnapshot} from './ui/town.ts';
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
  // SVG textures keep LINEAR smoothing; skip costly multisampling of their rectangular quads.
  render: { antialias: true, antialiasGL: false, pixelArt: false }, audio: { noAudio: true },
  fps: { target: 60 }, scene: [scene]
});
// Still worlds need gentle scenery, not sixty full canvas redraws a second.
// Input and active travel/actions restore the normal loop; authority/DOM clocks
// remain independent. Defer loop replacement until the current RAF completes.
let requestedFrameLimit=0,wakeRenderUntil=performance.now()+750;
function frameLimit(limit:number){if(requestedFrameLimit===limit)return;requestedFrameLimit=limit;queueMicrotask(()=>{if(game.isBooted&&game.loop.fpsLimit!==requestedFrameLimit)game.loop.setFPSLimit(requestedFrameLimit);});}
function wakeRender(){wakeRenderUntil=performance.now()+750;frameLimit(0);}
window.addEventListener('pointerdown',wakeRender,{capture:true,passive:true});
window.addEventListener('keydown',wakeRender,{capture:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)wakeRender();});
let renderedFrames=0;game.events.on(Phaser.Core.Events.POST_RENDER,()=>{renderedFrames++;if(menuRenderPaused&&menuFrameBudget>0&&--menuFrameBudget===0)pauseMenuRender();});
scene.onWalkFailure=()=>feedback.textContent='That spot cannot be reached. Try a clear patch of ground or tap a named prop.';
const worldContainer=document.querySelector<HTMLElement>('#world')!;
const updateTextMode=()=>app.querySelector('.shell')?.classList.toggle('large-text',parseFloat(getComputedStyle(document.documentElement).fontSize)>20);
updateTextMode();
const worldResize=new ResizeObserver(entries=>{
 updateTextMode();const {width,height}=entries[0].contentRect;
 if(game.isBooted&&width>0&&height>0){
  if(Math.abs(game.scale.width-width)>.5||Math.abs(game.scale.height-height)>.5)game.scale.setParentSize(width,height);
  // Phaser RESIZE may already have changed the canvas before this observer.
  // Its cleared target still needs repainting while the modal owns the pause.
  refreshMenuFrame(2);
 }
});
worldResize.observe(worldContainer);
let gardenUI:GardenUI|undefined;let carpentryUI:CarpentryUI|undefined;
let gardenWalk:{room:'square'|'garden'|'workshop';stopId:string;startedRoom:string;owner:string}|null=null;
let ready = false;
let lastContext = '';
let portalIntent=0;
let menuRenderPaused=false,menuFrameBudget=0;
function pauseMenuRender(){if(!ready||!panel.open)return;menuRenderPaused=true;scene.resetPresentationFrame(false);game.pause();}
function resumeMenuRender(){wakeRender();if(!menuRenderPaused)return;menuRenderPaused=false;menuFrameBudget=0;scene.resetPresentationFrame();game.resume();}
function refreshMenuFrame(frames=1){
  if(!menuRenderPaused||!panel.open||document.hidden)return;
  // Resize can recreate WebGL targets; allow its resize/update cycle plus complete
  // subsequent renders. Ordinary menu clock updates need only one frame.
  menuFrameBudget=Math.max(menuFrameBudget,frames);scene.resetPresentationFrame(false);game.resume();
}
// DOM clocks and authoritative requests keep running. Only the noninteractive
// backdrop redraws once a second while a modal covers the locked world.
window.setInterval(()=>refreshMenuFrame(),1000);
function save() { if(townMode)return; try { localStorage.setItem(saveKey, JSON.stringify(session.save())); } catch { feedback.textContent = 'Position could not be saved in this browser. The pilot remains playable.'; } }
function focusWorld() { document.querySelector('canvas')?.focus(); }
function unlockWorld(){if(session.locked&&!panel.open&&!transitionBusy&&!gardenUI?.isSaving&&!carpentryUI?.isSaving&&(!townMode||!!town?.snapshot&&!needResync&&!town.retryAvailable))session.lock(false);}
function closePanel() { gardenUI?.closed();carpentryUI?.closed();workshop.closed(); panel.close();resumeMenuRender();unlockWorld(); focusWorld(); }
panel.addEventListener('submit', event => { event.preventDefault(); closePanel(); });
panel.addEventListener('close', () => { gardenUI?.closed();carpentryUI?.closed();workshop.closed();resumeMenuRender();unlockWorld(); focusWorld(); });
panel.addEventListener('cancel', event => {event.preventDefault();closePanel();});
function openPanel(heading: string) { gardenWalk=null;gardenUI?.closed();carpentryUI?.closed();workshop.closed();body.classList.remove('garden-panel','carpentry-panel');body.removeAttribute('aria-busy');pendingHomePlotId=undefined;portalIntent++; session.lock(true); title.textContent = heading; body.replaceChildren(); panel.showModal();pauseMenuRender(); }
function paragraph(text: string) { const p = document.createElement('p'); p.textContent = text; return p; }
let townUI:TownUI|undefined;
let pendingHomePlotId:string|undefined;
let homePlotId:string|undefined,transitionBusy=false;
const contextKey=(room:string,plotId?:string)=>room+':'+(room.startsWith('home')?plotId??'':'');
function rememberVisit(){if(!town?.snapshot)return;try{localStorage.setItem('ih2:visit:'+town.snapshot.playerId,JSON.stringify(visitBaseline(town.snapshot)));}catch{/* Optional view hint only; progress is saved by the server. */}}
function previousVisit(id:string):VisitBaseline|null{try{return parseVisit(JSON.parse(localStorage.getItem('ih2:visit:'+id)??'null'),id);}catch{return null;}}
let residentId='',serverInstance='',needResync=true,lastSent='',lastMove=0,moveBackoff=0;
let movement:Promise<void>|null=null;
let walkedDistance=0,confirmedDistance=0,movementEpoch=0,confirmedContext=contextKey(session.room);
// Predict a short visible walk, then wait for confirmation without cancelling the route.
// Keep the existing server's two-tile burst limit and movement rate checks authoritative.
scene.movementBudget=()=>!townMode?Infinity:!town?.snapshot||town.retryAvailable||contextKey(session.room,homePlotId)!==confirmedContext?0:Math.max(0,1.5-(walkedDistance-confirmedDistance));
scene.onSteer=()=>{gardenWalk=null;pendingHomePlotId=undefined;};
scene.onMovement=distance=>{if(townMode)walkedDistance+=distance;};
function adoptTownPosition(snapshot:TownSnapshot){
 gardenWalk=null;
 portalIntent++;scene.residents=[];homePlotId=snapshot.position.homePlotId;session.enter(snapshot.position.room,snapshot.position.position);walkedDistance=0;confirmedDistance=0;confirmedContext=contextKey(snapshot.position.room,homePlotId);movementEpoch++;residentId=snapshot.playerId;lastContext='';serverInstance=snapshot.serverInstance??serverInstance;needResync=false;lastSent=JSON.stringify(snapshot.position);scene.homePlotId=homePlotId;const visited=snapshot.plots.find(plot=>plot.id===homePlotId);scene.homeOwnerName=visited?.ownerName??'Resident';scene.homeLevel=Number(visited?.level??1);scene.homePennantOwned=!!visited?.pennantOwned;unlockWorld();
}
const town=townMode?new TownClient({
 onSnapshot:snapshot=>{skyOffset=snapshot.serverTime-Date.now();const identityChanged=residentId!==snapshot.playerId;const expandedInPlace=session.room==='home'&&snapshot.position.room==='home-expanded'&&snapshot.position.homePlotId===homePlotId;
 // Ordinary snapshots can race acknowledged movement. Only explicit entry/resume or an in-place forward expansion adopts feet.
 if(identityChanged||needResync||expandedInPlace||(snapshot.serverInstance&&snapshot.serverInstance!==serverInstance))adoptTownPosition(snapshot);
 scene.homePlotId=homePlotId;const visited=snapshot.plots.find(plot=>plot.id===homePlotId);scene.homeOwnerName=visited?.ownerName??'Resident';scene.homeLevel=Number(visited?.level??1);scene.homePennantOwned=!!visited?.pennantOwned;scene.houseLevel=Number(snapshot.plot?.level??snapshot.plots[0]?.level??0);scene.residentId=snapshot.playerId;scene.bridgeRestored=snapshot.bridge.restored;scene.bridgePhase=snapshot.bridge.phase;scene.bridgeReadyAt=snapshot.bridge.readyAt??null;scene.refreshDecorations();scene.refreshGarden();scene.refreshCarpentry();gardenUI?.refresh();carpentryUI?.refresh();paintGuideObjective();townUI?.refresh();const residentButton=document.querySelector('#resident');if(residentButton)residentButton.textContent=snapshot.name;const tag=document.querySelector('.pilot-tag span');if(tag)tag.textContent=snapshot.name+' · practice town';},
 onPresence:presence=>{scene.residents=Array.isArray(presence)?presence:[];},
 onConnection:message=>{feedback.textContent=message;if(message.includes('interrupted')){needResync=true;session.lock(true);}},
 beforeCommand:()=>flushMovement(true)
}):null;
async function flushMovement(force=false):Promise<void>{
 if(!town?.snapshot)return;if(movement){if(!force)return;await movement;}
 if(!town.snapshot)return;
 if(!force&&(Date.now()-lastMove<150||Date.now()<moveBackoff))return;
 const value={room:session.room,position:{...session.position},...(session.room.startsWith('home')&&homePlotId?{homePlotId}:{})},hash=JSON.stringify(value);if(hash===lastSent){if(!movement&&!needResync&&contextKey(value.room,homePlotId)===confirmedContext)confirmedDistance=walkedDistance;return;}
 const sentDistance=walkedDistance,epoch=movementEpoch,sentPlayerId=town.snapshot.playerId;
 lastMove=Date.now();
 const action=town.movement(value).then(()=>{if(epoch!==movementEpoch||town.snapshot?.playerId!==sentPlayerId)return;lastSent=hash;confirmedDistance=Math.max(confirmedDistance,sentDistance);confirmedContext=contextKey(value.room,value.homePlotId);moveBackoff=0;}).catch(async error=>{if(epoch!==movementEpoch||town.snapshot?.playerId!==sentPlayerId)return;moveBackoff=Date.now()+2000;needResync=true;session.lock(true);feedback.textContent='Movement could not be confirmed. Reconnecting to the local town…';try{const snapshot=await town.load();if(snapshot.playerId!==sentPlayerId||town.snapshot?.playerId!==sentPlayerId)return;homePlotId=snapshot.position.homePlotId;session.enter(snapshot.position.room,snapshot.position.position);lastSent=JSON.stringify(snapshot.position);}catch{/* SSE reconnect reloads the authoritative position. */}if(force)throw error;}).finally(()=>{if(movement===action)movement=null;});
 movement=action;await action;
}
const remoteWorkshop=town?.workshopAdapter();
const workshop=new WorkshopUI({carpentry:()=>carpentryUI?.showDesk(),garden:()=>gardenUI?.showBeds(),walkToStudy:(id:SurveyId)=>{closePanel();if(session.room!=='square'){const exit=worlds[session.room].stops.find(stop=>stop.transition==='square');if(exit)session.point(exit.point);feedback.textContent='Walking back to the square. Then choose a tree from Places or the sketchbook.';return;}session.walk(SURVEYS[id].point);feedback.textContent='Walking to '+SURVEYS[id].name+'. Inspect the tree when you arrive.';},open:openPanel,body,feedback:message=>feedback.textContent=message,inside:()=>session.room==='workshop',changed:()=>{scene.refreshDecorations();scene.refreshGarden();scene.refreshCarpentry();gardenUI?.refresh();carpentryUI?.refresh();},...(town?{objective:()=>currentObjective(),kitUse:()=>town.snapshot&&town.snapshot.bridge.contributed>=town.snapshot.bridge.target?'Bridge funding is complete. Save ordinary kits for housing: '+PLOT_CLAIM_KITS+' to claim, '+PLOT_UPGRADE_KITS+' more to expand.':'Bring a finished ordinary kit to the collecting bridge committee.',teaching:()=>townUI?.showLesson(),discoveries:()=>townUI?.showTrail(),returns:()=>town?.snapshot&&townUI?.showReturns(returnSummary(town.snapshot,previousVisit(town.snapshot.playerId))),homeAvailable:()=>session.room.startsWith('home'),home:()=>{if(session.room.startsWith('home'))townUI?.showPlots(homePlotId);else feedback.textContent='Enter a house to arrange or inspect its furnishings.';}}:{})},remoteWorkshop);
gardenUI=new GardenUI({open:openPanel,body,feedback:message=>feedback.textContent=message,shared:townMode,owner:()=>town?.snapshot?.playerId??'local',publicState:()=>town?.snapshot?.gardenTown,changed:()=>{scene.refreshGarden();refreshMenuFrame(2);unlockWorld();},canUse:action=>gardenActionLocations(action).some(location=>{const stop=worlds[location.room].stops.find(s=>s.id===location.stopId);return session.room===location.room&&!!stop&&Math.hypot(session.position.x-stop.point.x,session.position.y-stop.point.y)<=1.4;}),go:goGardenDestination,accepted:action=>{if(action.action==='plant')scene.playGardenAction('sow');else if(action.action==='harvest')scene.playGardenAction('harvest');else if(action.action==='observe')scene.playGardenAction('inspect');}},workshop);
scene.gardenState=()=>workshop.state.garden;scene.gardenNow=()=>workshop.gardenClock();scene.welcomeCredits=()=>town?.snapshot?.gardenTown?.credits??Math.min(6,workshop.state.garden?.requests??0);
function currentNoticeboard():NoticeboardState|undefined{if(town)return town.snapshot?.noticeboard;const s=workshop.state.carpentry;return s.recorded<6?{...createNoticeboard(),credits:s.recorded}:settleNoticeboard({credits:6,phase:'installing',startedAt:s.sixthRecordAt,readyAt:s.sixthRecordAt!+24*3600_000,openedAt:null},Math.max(workshop.gardenClock(),s.sixthRecordAt!));}
carpentryUI=new CarpentryUI({open:openPanel,body,feedback:message=>feedback.textContent=message,shared:townMode,owner:()=>town?.snapshot?.playerId??'local',publicState:currentNoticeboard,changed:()=>{scene.refreshCarpentry();refreshMenuFrame(2);unlockWorld();},canUse:action=>carpentryActionLocations(action).some(location=>{const stop=worlds[location.room].stops.find(s=>s.id===location.stopId);return session.room===location.room&&!!stop&&Math.hypot(session.position.x-stop.point.x,session.position.y-stop.point.y)<=1.4;}),go:goGardenDestination,accepted:action=>{if(action.action==='gather-pine')scene.playCarpentryAction('saw');else if(action.action==='start-easel'||action.action==='claim-easel')scene.playCarpentryAction('finish');else if(action.action==='deliver-hamper')scene.playCarpentryAction('deliver');for(const ms of [250,500])window.setTimeout(()=>refreshMenuFrame(2),ms);}},workshop);
scene.carpentryState=()=>workshop.state.carpentry;scene.noticeboardState=currentNoticeboard;
function goGardenDestination(room:'square'|'garden'|'workshop',stopId:string){if(gardenUI?.isSaving||carpentryUI?.isSaving){feedback.textContent='Finish confirming the current change before walking.';return;}closePanel();gardenWalk={room,stopId,startedRoom:'',owner:town?.snapshot?.playerId??'local'};followGardenWalk();}
function followGardenWalk(){
 if(!gardenWalk||!ready||panel.open||session.locked||transitionBusy||townMode&&(!town?.snapshot||needResync||contextKey(session.room,homePlotId)!==confirmedContext))return;
 if(gardenWalk.owner!==(town?.snapshot?.playerId??'local')){gardenWalk=null;return;}
 if(gardenWalk.startedRoom===session.room)return;
 const stop=session.room===gardenWalk.room?worlds[session.room].stops.find(s=>s.id===gardenWalk!.stopId):session.room==='square'&&gardenWalk.room!=='square'?worlds.square.stops.find(s=>s.id===(gardenWalk!.room==='garden'?'allotment':'workshop')):worlds[session.room].stops.find(s=>s.transition==='square');
 if(!stop||!session.approach(stop.id)){gardenWalk=null;feedback.textContent='That route could not be reached. Choose a clear nearby destination.';return;}
 gardenWalk.startedRoom=session.room;feedback.textContent='Walking to '+stop.name+'.';
}
if(town){townUI=new TownUI({open:openPanel,body,feedback:message=>feedback.textContent=message,changed:()=>scene.refreshDecorations(),enterHome,enterTrail:()=>{if(!town.snapshot?.bridge.restored){feedback.textContent='The bridge is still under inspection.';return;}if(session.room!=='square'){feedback.textContent='You are already beyond the town bridge. Use Places for the local landmarks.';return;}closePanel();const gate=worlds.square.stops.find(stop=>stop.id==='trail-gate')!;session.point(gate.point);feedback.textContent='Walking into Inkwood trail.';}},town);document.querySelector('#resident')!.addEventListener('click',()=>void townUI!.showLogin(()=>closePanel()));}
scene.decorations=()=>session.room.startsWith('home')?(town?.snapshot?.plots.find(plot=>plot.id===homePlotId)?.placements??workshop.state.placements) as typeof workshop.state.placements:workshop.state.placements;
document.querySelector('#bag')!.addEventListener('click',()=>{if(town?.retryAvailable){showPendingRequest();return;}workshop.showInventory();});
function currentObjective(){return town?.snapshot?sharedObjective(town.snapshot,town.serverNow()):questStep(workshop.state);}
function paintGuideObjective(){const note=body.querySelector<HTMLElement>('[data-guide-objective]');if(!note)return;const objective=currentObjective(),text=objective.title+' — '+objective.detail;if(note.textContent!==text)note.textContent=text;}
let guidanceSecond=-1;
document.querySelector('#field-guide')!.addEventListener('click',()=>{
  openPanel('Town field guide');body.innerHTML=guideContents(session.room==='workshop',townMode,session.room!=='square'&&session.room!=='workshop');if(scene.skyFixture){const live=document.createElement('a');live.className='destination live-clock';live.href=townMode?'/?town=1':'/';live.textContent='Return to the live town clock';body.prepend(live);}const objective=currentObjective();const note=paragraph(objective.title+' — '+objective.detail);note.className='quest-card';note.dataset.guideObjective='';body.prepend(note);const climate=scene.climateState();if(climate){const clock=paragraph('Town time · '+String(Math.floor(climate.minute/60)).padStart(2,'0')+':'+String(climate.minute%60).padStart(2,'0')+' · '+climate.label+(climate.fixture?' · Lighting study':''));clock.id='guide-sky';body.prepend(clock);}
  body.querySelector('#guide-workshop')!.addEventListener('click',()=>{closePanel();const stop=worlds[session.room].stops.find(s=>s.id==='workshop'||s.id==='bench'||s.id==='home-door'||s.id==='trail-exit'||s.id==='garden-exit');if(stop){if(stop.transition&&session.room!=='square')session.point(stop.point);else session.walk(stop.point);}feedback.textContent=session.room==='square'?'Walking to your workshop.':session.room==='workshop'?'Your bench is right here.':'Walking back to the square.';});
});
document.querySelector('#places')!.addEventListener('click', () => {
  openPanel('Places to go');
  body.append(paragraph('Pick a stop. Your employee will walk there; you can inspect it when you arrive.'));
  for (const stop of worlds[session.room].stops) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'destination';
    button.textContent = stop.name + ' →'; button.dataset.destination = stop.id;
    button.addEventListener('click', () => { closePanel(); session.walk(stop.point); feedback.textContent = `Walking to ${stop.name}.`; });
    body.append(button);
  }
});
function showPendingRequest(message='Resolve the previous request before walking.'){
 if(!town)return;openPanel('Confirm pending request');body.append(paragraph(message),paragraph('The change may already be saved. Retrying uses the same request and cannot spend or enter twice.'));const retry=document.createElement('button');retry.type='button';retry.className='destination';retry.textContent=town.retryAvailable?'Retry the same request':'Refresh confirmed position';retry.onclick=()=>{retry.disabled=true;void(town.retryAvailable?town.retry():town.load()).then(snapshot=>{adoptTownPosition(snapshot);closePanel();feedback.textContent=town.lastMessage||'Confirmed position restored.';}).catch(error=>{retry.disabled=false;feedback.textContent=error.message;});};body.append(retry);
}
async function enterHome(plotId:string){
 if(!town?.snapshot||needResync||transitionBusy)return;if(town.retryAvailable){showPendingRequest();return;}const front=worlds.square.stops.find(stop=>stop.id==='home-front')!;if(session.room==='square'&&Math.hypot(session.position.x-front.point.x,session.position.y-front.point.y)>1.25){closePanel();pendingHomePlotId=plotId;if(!session.point(front.point)){pendingHomePlotId=undefined;feedback.textContent='The house door could not be reached.';}else feedback.textContent='Walking to the house door.';return;}closePanel();const intent=++portalIntent,playerId=town.snapshot.playerId,epoch=movementEpoch;transitionBusy=true;session.lock(true);feedback.textContent='Confirming the house door…';
 try{await flushMovement(true);if(intent!==portalIntent||epoch!==movementEpoch||town.snapshot?.playerId!==playerId||needResync)return;const snapshot=await town.command({kind:'enter-home',plotId});if(town.snapshot?.playerId===playerId&&snapshot.position.homePlotId===plotId){adoptTownPosition(snapshot);feedback.textContent=scene.homeOwnerName+'’s home. Owned work stays here through weekly scores.';focusWorld();}else feedback.textContent=town.lastMessage;}catch(error){
  feedback.textContent='House entry could not be confirmed. Resolve the same request before walking.';showPendingRequest((error as Error).message);
 }finally{transitionBusy=false;unlockWorld();}
}
async function enterRemotePortal(stop:Stop){
 if(!town?.snapshot||!stop.transition||needResync)return;
 const intent=++portalIntent,epoch=movementEpoch,playerId=town.snapshot.playerId,sourceRoom=session.room,targetRoom=stop.transition;
 transitionBusy=true;session.lock(true);feedback.textContent='Confirming your arrival before entering…';
 try{
  // Confirm the final source-room approach before the separate portal request.
  await flushMovement(true);
  if(intent!==portalIntent||epoch!==movementEpoch||town.snapshot?.playerId!==playerId||session.room!==sourceRoom||panel.open||needResync)return;
  session.enter(targetRoom,stop.arrival);if(!targetRoom.startsWith('home')){homePlotId=undefined;scene.homePlotId=undefined;}save();focusWorld();
  feedback.textContent=targetRoom==='trail'?'Inkwood trail. Three landmarks, one extremely official field notebook.':targetRoom==='garden'?'Your allotment. Inspect the three beds or visit the attendant.':targetRoom==='workshop'?'Your workshop. Tap the bench to make your first planter.':(scene.bridgeRestored?'Back in the square. The bridge is repaired; the committee has finally earned its name.':'Back in the square. The committee has made no measurable progress.');
 }catch{
  if(intent===portalIntent&&epoch===movementEpoch&&town.snapshot?.playerId===playerId&&!needResync)feedback.textContent='Entry could not be confirmed. Try the door again.';
 }finally{
  transitionBusy=false;
  unlockWorld();
 }
}
function activate(stop: Stop) {
  if(stop.id==='carpentry-desk'){carpentryUI!.showDesk();return;}
  if(stop.id==='finishing-rack'){carpentryUI!.showRack();return;}
  if(stop.id.startsWith('pine-')&&(PINE_STATIONS as readonly string[]).includes(stop.id.slice(5))){carpentryUI!.showPine(stop.id.slice(5) as typeof PINE_STATIONS[number]);return;}
  if(stop.id.startsWith('garden-')||stop.id.startsWith('stake-')||stop.id==='allotment'){
    if(!workshop.state.garden){feedback.textContent='This town service needs its garden update before these actions are available.';return;}
    if(stop.id==='garden-beds'){gardenUI!.showBeds();return;}
    if(stop.id==='garden-desk'){gardenUI!.showDesk();return;}
    if(stop.id==='garden-field'){gardenUI!.showField();return;}
    if(stop.id==='garden-registry'){gardenUI!.showMarkers();return;}
    if(stop.id.startsWith('stake-')&&(STAKE_IDS as readonly string[]).includes(stop.id.slice(6))){gardenUI!.showStake(stop.id.slice(6) as StakeId);return;}
  }
  const job=workshop.state.job,objective=questStep(workshop.state);
  const dialogue=dialogueFor(stop.id,{room:session.room==='square'?'square':'workshop',questStage:objective.id as DialogueContext['questStage'],job:job?.recipe??'none',jobReady:!!job&&job.readyAt<=(remoteWorkshop?.now()??Date.now()),bridgeRestored:scene.bridgeRestored,bridgePhase:scene.bridgePhase,trailStamps:town?.snapshot?.trail?.stamps.length??0,pennantOwned:town?.snapshot?.trail?.pennantOwned??false,maintenanceSatisfied:!!(town?.snapshot?.lesson?.redeemed||town?.snapshot?.lesson?.legacySatisfied),...(town?.snapshot?{guidance:sharedObjective(town.snapshot,town.serverNow())}:{}),shared:townMode,phase:scene.climateState()?.phase??'day'});
  if(dialogue){
    openPanel(dialogue.title);for(const line of dialogue.lines)body.append(paragraph(line));
    if(dialogue.action){const action=dialogue.action,button=document.createElement('button');button.type='button';button.className='destination';button.dataset.npcAction=action.destination;button.textContent=action.label;button.addEventListener('click',()=>{if(action.destination==='journal'){workshop.showInventory();return;}closePanel();const target=worlds[session.room].stops.find(s=>s.id===action.destination||(action.destination==='workshop'&&s.id==='bench'));if(target){session.walk(target.point);feedback.textContent='Walking to '+target.name+'.';}});body.append(button);}
    return;
  }
  const study=stop.id.startsWith('survey-')?surveyId(stop.id.slice(7)):undefined;if(study){workshop.showSketchbook(study);return;}
  if(stop.id==='trail-gate'&&!scene.bridgeRestored){if(town)townUI!.showBridge();else{openPanel('Bridge committee');body.append(paragraph('Shared practice keeps bridge construction and trail discoveries. This browser-only workshop has a separate save.'));}return;}
  if(town&&session.room==='trail'&&(TRAIL_LANDMARK_IDS as readonly string[]).includes(stop.id)){townUI!.showTrail(stop.id);return;}
  if(town&&stop.id==='bridge'){townUI!.showBridge();return;}
  if(town&&stop.id==='plot'){townUI!.showPlots();return;}
  if(town&&stop.id==='home-front'){const target=pendingHomePlotId??town.snapshot?.plot?.id;pendingHomePlotId=undefined;if(target)void enterHome(target);else townUI!.showPlots();return;}
  if(['scrap','timber','supplies'].includes(stop.id)){workshop.showResource(stop.id as 'scrap'|'timber'|'supplies');return;}
  if(stop.id==='bench'){workshop.showBench();return;}
  if (stop.transition) {
    if(town){void enterRemotePortal(stop);return;}
    session.enter(stop.transition, stop.arrival); save(); focusWorld(); feedback.textContent = stop.transition==='garden'?'Your allotment. Inspect the beds or visit the attendant.':stop.transition === 'workshop' ? 'Your workshop. Tap the bench to make your first planter.' : (scene.bridgeRestored?'Back in the square. The bridge is repaired; the committee has finally earned its name.':'Back in the square. The committee has made no measurable progress.');
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
  frameLimit(!ready||panel.open||performance.now()<wakeRenderUntil||scene.needsFullRate()?0:10);
  if(panel.open){const second=Math.floor((town?.serverNow()??Date.now())/1000);if(second!==guidanceSecond){guidanceSecond=second;paintGuideObjective();}}
  if(town&&!document.hidden)void flushMovement().catch(()=>{});
  if (!ready) {
    ready = true; document.querySelector('#boot')?.remove();
    const canvas = document.querySelector('canvas')!; canvas.tabIndex = 0; canvas.setAttribute('aria-label', 'Walkable neighborhood. Use Places for named destinations.'); canvas.setAttribute('aria-describedby', 'instructions'); focusWorld();
    if(town){needResync=true;session.lock(true);void town.load().then(()=>town.connect()).catch(()=>townUI!.showLogin(()=>closePanel()));}
  }
  const arrival = session.takeArrival();
  if (arrival) activate(arrival);
  followGardenWalk();
  const stop = session.nearby();
  const state = contextKey(session.room,homePlotId)+':'+(stop?.id??'')+':'+(scene.bridgePhase??String(scene.bridgeRestored));
  if (state !== lastContext) {
    lastContext = state;
    location.innerHTML = session.room === 'square' ? 'Town square<span>Under new mismanagement.</span>' : session.room==='trail'?'Inkwood trail<span>A path worth the paperwork.</span>':session.room==='garden'?'Your allotment<span>Ready plants wait safely.</span>':session.room.startsWith('home')?scene.homeOwnerName+'’s home<span>'+(session.room==='home-expanded'?'Workroom expansion · saved':'Starter house · saved')+'</span>':'Your workshop<span>Great things take time.</span>';
    if(town){const label=document.createElement('small');label.className='fixture-label';label.textContent='Practice town · '+(town.snapshot?.name??'choose a resident');location.append(label);}
    interactButton.textContent = stop ? (stop.transition ? `Enter ${stop.transition === 'workshop' ? 'workshop' : stop.transition==='trail'?'trail':stop.transition==='garden'?'allotment':'square'}` : 'Inspect') : 'Nothing nearby';
    if(stop?.id==='trail-gate'&&!scene.bridgeRestored)interactButton.textContent='Inspect bridge';
    interactButton.disabled = !stop;
    interactButton.setAttribute('aria-label', stop?.id==='trail-gate'&&!scene.bridgeRestored?'Inspect bridge committee':stop ? (stop.transition ? `Enter ${stop.transition === 'workshop' ? 'workshop' : stop.transition==='trail'?'Inkwood trail':stop.transition==='garden'?'your allotment':'town square'}` : `Inspect ${stop.name}`) : 'Nothing nearby');
  }
  const climate=scene.climateState();if(climate){let sky=document.querySelector<HTMLElement>('#town-sky');if(!sky){sky=document.createElement('small');sky.id='town-sky';sky.setAttribute('aria-label','Town time and weather');location.append(sky);}const hour=String(Math.floor(climate.minute/60)).padStart(2,'0'),minute=String(climate.minute%60).padStart(2,'0');const label=(climate.fixture?'Lighting study · ':'')+climate.label+' · '+hour+':'+minute;if(sky.textContent!==label)sky.textContent=label;if(panel.open){const guide=document.querySelector<HTMLElement>('#guide-sky');const clockLabel='Town time · '+hour+':'+minute+' · '+climate.label+(climate.fixture?' · Lighting study':'');if(guide&&guide.textContent!==clockLabel)guide.textContent=clockLabel;}}
};
window.addEventListener('pagehide',()=>{rememberVisit();save();});
document.addEventListener('visibilitychange', () => { if(document.hidden){rememberVisit();save();}else if(town){needResync=true;session.lock(true);void town.load().catch(()=>{});} });
window.addEventListener('pageshow',event=>{if(event.persisted&&town){needResync=true;session.lock(true);void town.load().catch(()=>{});}});
// Read-only diagnostics for reproducible pilot checks; never an economy/debug mutation API.
Object.defineProperty(window, '__pilot', { value: Object.freeze({
  snapshot: () => session.snapshot(),
  town:()=>town?.snapshot?JSON.parse(JSON.stringify(town.snapshot)):null,
  workshop:()=>workshop.snapshot(),
  metrics: () => {
    const samples = scene.frameSamples.slice().sort((a, b) => a - b);
    return { climate:scene.climateState(), ready, presentation:{menuBackdropPaused:menuRenderPaused,renderedFrames,idleFrameLimit:game.loop.fpsLimit,frameSamplePolicy:'Visible mixed normal and 10Hz idle intervals; modal gaps excluded'}, frameSamples: samples.length, p95FrameMs: samples[Math.floor(samples.length * .95)] ?? null, renderer: game.renderer?.type, renderOptions:{textureSmoothing:game.config.antialias,contextAntialias:game.renderer?.type===Phaser.WEBGL?(game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl.getContextAttributes()?.antialias:null}, phaser: Phaser.VERSION, visual:scene.visualState() };
  },
  screenPoint: (x: number, y: number) => { const c = scene.cameras.main; return { x: (x + .5) * 32 - c.scrollX, y: (y + .5) * 32 - c.scrollY }; }
}), writable: false });

}
