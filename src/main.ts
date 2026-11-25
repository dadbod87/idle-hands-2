import {isFieldRoute, isLowerRoom, lowerTransitionLabel, LIFT_TOP_ID} from './game/lower-pumpworks-room.ts';
import {setupDepths} from './ui/lower-pumpworks.ts';
import {graftReady,readValleyGraft,startValleyGraft,VALLEY_GRAFT_KEY,VALLEY_GRAFT_STOP_ID,type GraftId} from './game/valley-graft.ts';
import {showValleyGraft,valleyGraftJournal} from './ui/valley-graft.ts';
import {nearbyOutfits,residentOutfit} from './ui/nearby-outfits.ts';
import {earnedValleyPrint,takeValleyPrint,VALLEY_PRINT_KEY,VALLEY_PRINT_STOP_ID} from './game/valley-print.ts';
import {MOSSBANK_VALLEY_ROAD} from './game/hidden-valley-room.ts';
import {SEWING_TABLE,sewingReady} from './game/tailoring.ts';
import {refreshSewingJournal,sewingJournal,showTailoring,tailoringBagCards} from './ui/tailoring.ts';
import {INKWOOD_MOSSBANK_ROAD,MOSSBANK_ROAD} from './game/mossbank-room.ts';
import {MOSSBANK_KEY,mossbankFromAwards,readMossbank,type SurveyPlace} from './game/mossbank.ts';
import {createMossbank} from './ui/mossbank.ts';
import {FORGE_STOP,PUMPWORKS_DOOR} from './game/pumpworks-room.ts';
import {equippedArmor,FIELD_HEALTH,readPumpworks,type PumpworksPlace} from './game/pumpworks.ts';
import {LODGING_BEDSIDE} from './game/lodging.ts';
import {createPumpworks} from './ui/pumpworks.ts';
import {INKMINT_STATIONS} from './game/nursery-inkmint.ts';
import {showInkmint} from './ui/nursery-inkmint.ts';
import {freshGlasshouseOpening} from './game/glasshouse.ts';
import {WINDOWSILL_STOP} from './game/home-windowsill.ts';
import {showHomeWindowsill} from './ui/home-windowsill.ts';
import {showNurseryKeeper} from './ui/glasshouse-plants.ts';
import {GlasshouseBoard} from './ui/glasshouse.ts';
import {POND_WATCH_KEY,POND_WATCH_STOPS,completePondWatch,pondWatchId,readPondWatch,recordPondWatch,type PondWatchId} from './game/pond-watch.ts';
import {mountPondWatch} from './ui/pond-watch.ts';
import {readRiverSurvey,RIVER_SURVEY_KEY,type RiverSurvey,type RiverSpot} from './game/river-survey.ts';
import {earnedFieldCertificate} from './game/outing.ts';
import {showRiverSurvey} from './ui/river-survey.ts';
import {WORKSHOP_PRINT_KEY,WORKSHOP_PRINT_STOP,WORKSHOP_PRINTS,earnedWorkshopPrints,selectedWorkshopPrint,setWorkshopPrint,type WorkshopPrint} from './game/workshop-print.ts';
import {RecentFieldNotes} from './game/recent-field-notes.ts';
import {activeWave,waveRoom} from './game/town-wave.ts';
import {INKWOOD_HOOD,CLERK_CAP,ownsHeadwear} from './game/earned-headwear.ts';
import {headwearName} from './art/headwear.ts';
import { WORKSHOP_LODGE_BOARD } from './game/home-lodge.ts';
import { benchWork } from './game/crafting-view.ts';
import { SUNROOM_NOTEBOOK } from './game/home-sunroom.ts';
import { displayedHomeKeepsake, HOME_KEEPSAKES } from './game/home-keepsake.ts';
import {FIRST_MORNING_KEY,readFirstMorning,saveFirstMorning,type MorningRead} from './game/first-morning.ts';
import {mountDoorLight} from './ui/door-light.ts';
import {ARRIVAL_STORIES} from './game/arrival-stories.ts';
import type {BrowserResident} from './game/browser-resident.ts';
import {orchardGuide} from './game/orchard-guide.ts';
import './ui/jun-orchard.css';
import {SnackShelfUI} from './ui/snack-shelf.ts';
import {showCafeParcelNote} from './ui/cafe-parcel-note.ts';
import { rewardCue } from './audio/world-sounds.ts';
import { mountPlaceMusic } from './ui/place-music.ts';
import{OutingUI}from'./ui/outing.ts';
import{housingWorld}from'./game/housing-world.ts';
import {townDistrict} from './game/town-expansion.ts';
import {CafeUI} from './ui/cafe.ts';
import{addressForPlot,plotAtAddress,frontForPlot,exitForHome,HOME_SITE_PREFIX}from'./game/neighborhood.ts';
import {renderPlaces} from './ui/places.ts';
import {freshBridgeOpening} from './game/bridge-ceremony.ts';
import {mountBrowserResident} from './ui/browser-resident.ts';
import {OrchardUI} from './ui/orchard.ts';
import {sharedOrchard} from './ui/town-orchard.ts';
import {ORCHARD_BRANCHES,ORCHARD_STOPS,orchardBranchFromStop,type BranchId} from './game/orchard.ts';
import {homeDisplay} from './game/live-home-layout.ts';
import {CommissionUI} from './ui/commission.ts';
import {commissionLocation,type RecipientId} from './game/commission.ts';
import {CarpentryUI} from './ui/carpentry.ts';
import {carpentryActionLocations,PINE_STATIONS,createNoticeboard,settleNoticeboard,type NoticeboardState} from './game/carpentry.ts';
import {GardenUI} from './ui/garden.ts';
import {gardenActionLocations,STAKE_IDS,type StakeId} from './game/garden.ts';
import {surveyId,SURVEYS,type SurveyId} from './game/fieldwork.ts';
import Phaser from 'phaser';
import { Session } from './game/session.ts';
import { worlds,INKWOOD_GLASSHOUSE,TRAIL_LANDMARK_IDS,type Stop,type Room } from './game/world.ts';
import { WorldScene } from './phaser/WorldScene.ts';
import './ui/style.css';
import {questStep} from './game/live-workshop.ts';
import {sharedObjective} from './game/shared-guidance.ts';
import {PLOT_CLAIM_KITS,PLOT_UPGRADE_KITS} from './game/town-rules.ts';
import {climateFixture} from './game/town-climate.ts';
import {dialogueFor,type DialogueContext} from './game/town-people.ts';
import {visitBaseline,parseVisit,type VisitBaseline} from './game/return-summary.ts';
import {TownClient,TownUI,type TownSnapshot} from './ui/town.ts';
import type { TownPlot } from './ui/town-client.ts';
import {WorkshopUI} from './ui/workshop.ts';
import { renderStudy, renderVarietyStudy } from './art/study.ts';
import {fieldGuideContents} from './ui/field-guide.ts';
import './ui/field-guide.css';
if(new URLSearchParams(location.search).has('variety-study')) { renderVarietyStudy(); } else if(new URLSearchParams(location.search).has('art-study')) { renderStudy(); } else {

const townMode=new URLSearchParams(window.location.search).has('town');
const saveKey = 'ih2:pilot-position:v1';
let stored: unknown;
try { stored = townMode?null:JSON.parse(localStorage.getItem(saveKey) ?? 'null'); } catch { stored = null; }
const morningStorage={
  getItem:(key:string)=>localStorage.getItem(key),
  setItem:(key:string,value:string)=>localStorage.setItem(key,value),
};
let morning:MorningRead=townMode?{status:'unavailable',record:null}:readFirstMorning(morningStorage);
let morningWriting=false;
const resting=()=>morning.record?.phase==='bed';
const session = new Session(townMode?null:morning.record?.saved??stored,townMode?undefined:[...ORCHARD_STOPS,...POND_WATCH_STOPS,PUMPWORKS_DOOR,MOSSBANK_ROAD],!townMode);
session.sharedPumpworks=townMode;
const fieldSave=townMode?null:readPumpworks(morningStorage);
if(fieldSave?.ok&&fieldSave.state.recovering)session.enter('lodging',LODGING_BEDSIDE);
if(resting())session.lock(true);
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<main class="shell ${townMode?'town-mode':''}">
 <header><div class="brand-mark" aria-hidden="true">II</div><div class="brand"><p class="eyebrow">THE PATRON GROUP · A NEW CHAPTER</p><h1>Idle Hands <span>2</span></h1></div><div class="pilot-tag">${townMode?'NEIGHBORHOOD STUDY':'<strong id="local-resident-badge" dir="auto">NEIGHBORHOOD STUDY</strong>'}<span>Local workshop · saved here</span></div>${townMode?'<button id="resident" type="button" aria-label="Choose practice resident">Resident</button>':''}<button id="field-guide" aria-label="Open field guide" title="Town field guide"><svg viewBox="0 0 24 24" width="23" height="23" aria-hidden="true"><path d="M3 4q5-2 9 1 4-3 9-1v16q-5-2-9 1-4-3-9-1ZM12 5v16" fill="none" stroke="currentColor" stroke-width="2"/></svg></button></header>
 <section class="world-wrap" aria-label="Neighborhood playfield"><div id="world"></div><div id="door-light" aria-hidden="true"></div><div class="location-tag" id="location">Town square<span>Under new mismanagement.</span></div><button id="place-sound" class="sound-icon" type="button" aria-label="Sound settings"></button><button id="stop-assisted-walk" type="button" aria-keyshortcuts="Escape" hidden>Stop walking</button><button id="wake-resident" class="primary" type="button" hidden>Get up</button><aside class="pump-health" id="pump-health" aria-label="Field health" hidden></aside><p class="world-note" id="instructions">Tap the floor to walk.<span>WASD / arrows · E to interact</span></p><p class="boot" id="boot" role="status">Opening the town. Finding the keys.</p></section>
 <footer><div class="context"><span class="eyebrow">FIELD NOTES</span><p id="feedback" role="status" aria-live="polite" tabindex="0" data-ui-scroll="true" title="Scroll field notes to read longer messages.">Tap the three material depots below you. Your first planter starts here.</p></div><nav class="game-controls" aria-label="Game controls"><section class="pump-controls" id="pump-controls" aria-label="Combat controls" hidden></section><section class="pump-controls" id="depths-controls" aria-label="Lower Pumpworks combat" hidden></section><button id="places"><span aria-hidden="true">⌖</span> Places</button><button id="bag" title="Bag (B)" aria-keyshortcuts="B"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M8 7V5a4 4 0 0 1 8 0v2M5 7h14l1 14H4ZM8 12h8v5H8Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>Bag</button><button id="journal" title="Journal (J)" aria-keyshortcuts="J"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M5 3h14v18H5ZM3 7h4m-4 5h4m-4 5h4m3-10h6m-6 5h6" fill="none" stroke="currentColor" stroke-width="2"/></svg>Journal<span class="journal-ready-mark" id="journal-ready-mark" aria-hidden="true" hidden></span></button><button id="interact" class="primary" data-size-label="Enter workshop" disabled><span id="interaction-label">Nothing nearby</span></button></nav><span id="journal-ready-description" hidden>Work is ready to check in the Journal.</span><span class="town-wave-announcement" role="status" aria-live="polite"></span></footer>
</main>
<dialog id="panel" aria-labelledby="panel-title"><form method="dialog"><header class="dialog-head"><div><p class="eyebrow">TOWN INFORMATION SERVICES</p><h2 id="panel-title">Places to go</h2></div><div class="dialog-actions"><button id="quick-music" class="sound-icon" type="button" hidden></button><button aria-label="Close panel" value="close">×</button></div></header><div id="panel-body"></div></form></dialog>`;
const panel = document.querySelector<HTMLDialogElement>('#panel')!;
const title = document.querySelector<HTMLElement>('#panel-title')!;
const body = document.querySelector<HTMLDivElement>('#panel-body')!;
const journalButton=document.querySelector<HTMLButtonElement>('#journal')!;
const journalReadyMark=document.querySelector<HTMLElement>('#journal-ready-mark')!;
let ordinaryJournalReady=false,forgeJournalReady=false;
function paintJournalReady(ready=ordinaryJournalReady){
 ordinaryJournalReady=ready;
 const lit=ready||forgeJournalReady||!!town&&sewingReady(town.snapshot?.tailoring,town.serverNow());
 if(journalReadyMark.hidden===!lit)return;
 journalReadyMark.hidden=!lit;
 if(lit)journalButton.setAttribute('aria-describedby','journal-ready-description');
 else journalButton.removeAttribute('aria-describedby');
}

const music = mountPlaceMusic({
  room: session.room,
  position: session.position,
  settings: document.querySelector<HTMLButtonElement>('#place-sound')!,
  compactBefore: document.querySelector<HTMLButtonElement>('#field-guide')!,
  quick: document.querySelector<HTMLButtonElement>('#quick-music')!,
  body,
  open: () => openPanel('Sound settings'),
});

const doorLight = mountDoorLight(document.querySelector<HTMLElement>('#door-light')!);
function confirmedDoor() {
  music.cue('door');
  doorLight();
}

const feedback = document.querySelector<HTMLElement>('#feedback')!;
const fieldNotes=new RecentFieldNotes();
let fieldNoteOwner:string|null=townMode?null:'local';
fieldNotes.record(fieldNoteOwner,feedback.textContent,Date.now());
const stopWalkButton = document.querySelector<HTMLButtonElement>('#stop-assisted-walk')!;
new MutationObserver(()=>{feedback.scrollTop=0;fieldNotes.record(fieldNoteOwner,feedback.textContent,Date.now());}).observe(feedback,{childList:true,characterData:true,subtree:true});
if(session.room==='lodging')feedback.textContent=resting()?'Your first morning in Ledgerwick. Get up when you’re ready.':'Read the note by the bed, or step outside to find Marlow.';
if(session.room==='hidden-valley')feedback.textContent='Follow the orchard path to the grafting house or the cider court.';
if(session.recoveredLodgingFootprint){
 feedback.textContent='You’re by the boarding house. The new front steps are just behind you.';
 save();
}
const wakeButton=document.querySelector<HTMLButtonElement>('#wake-resident')!;
const interactButton = document.querySelector<HTMLButtonElement>('#interact')!;
function showRestingControl(){
  const asleep=resting();
  wakeButton.hidden=!asleep;
  interactButton.hidden=asleep;
  app.querySelector('.shell')?.classList.toggle('first-morning-resting',asleep);
}
showRestingControl();
const interactLabel = document.querySelector<HTMLElement>('#interaction-label')!;
const location = document.querySelector<HTMLElement>('#location')!;
const locationTitle = location.firstChild as Text;
const locationHint = location.querySelector('span')!;
const practiceLabel = townMode ? document.createElement('small') : null;
if (practiceLabel) {
  practiceLabel.className = 'fixture-label';
  location.append(practiceLabel);
}
const sky = document.createElement('small');
sky.id = 'town-sky';
sky.setAttribute('aria-label', 'Town time and weather');
const scene = new WorldScene(session);
scene.workshopPrintEnabled=!townMode;
scene.pondWatchEnabled=!townMode;
scene.resting=resting();
const residentBadge=document.querySelector('#local-resident-badge');
let localResident:BrowserResident|null=null;
const showBrowserResident=townMode?null:mountBrowserResident({open:openPanel,body,appearance:profile=>{
 localResident=profile;
 scene.residentId=profile?.look??'devon';
 scene.headwear=profile&&profile.version!==1?profile.headwear:null;
 if(residentBadge)residentBadge.textContent=profile?.name??'NEIGHBORHOOD STUDY';
 if(scene.actor?.active)refreshMenuFrame(2);
}});

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
scene.onWalkFailure=()=>{namedWalk=null;placeWalk=null;feedback.textContent='That spot cannot be reached. Try a clear patch of ground or tap a named prop.';};
const worldContainer=document.querySelector<HTMLElement>('#world')!;
const updateTextMode=()=>app.querySelector('.shell')?.classList.toggle('large-text',parseFloat(getComputedStyle(document.documentElement).fontSize)>20);
updateTextMode();
let worldResizePending=false;
game.events.on(Phaser.Core.Events.STEP,()=>{
 if(!worldResizePending)return;
 worldResizePending=false;
 // Apply text-mode changes outside ResizeObserver because they can resize the world.
 updateTextMode();
 // Measure after Phaser's own scale check. Apply any remaining change in the
 // game step so the cleared canvas is redrawn in that same frame.
 const {width,height}=worldContainer.getBoundingClientRect();
 if(width>0&&height>0&&(Math.abs(game.scale.width-width)>.5||Math.abs(game.scale.height-height)>.5)){
  game.scale.setParentSize(width,height);
 }
});
const worldResize=new ResizeObserver(entries=>{
 const {width,height}=entries[0].contentRect;
 if(!game.isBooted||width<=0||height<=0)return;
 worldResizePending=true;
 if(document.hidden)return;
 if(menuRenderPaused)refreshMenuFrame(2);
 else wakeRender();
});
worldResize.observe(worldContainer);
let glasshouseUI:GlasshouseBoard|undefined;
let cafeUI:CafeUI|undefined;let snackShelfUI:SnackShelfUI|undefined;let gardenUI:GardenUI|undefined;let carpentryUI:CarpentryUI|undefined;let commissionUI:CommissionUI|undefined;
let namedWalk:{room:Room;stopId:string;startedRoom:string;owner:string}|null=null;
let placeWalk:{room:Room;stopId:string;owner:string}|null=null;
let ready = false;
let riverSurvey:RiverSurvey|null=null;
let workshopPrint:WorkshopPrint|null=null;
function readLocalPondWatch(){
 if(townMode)return null;
 try{return readPondWatch(localStorage.getItem(POND_WATCH_KEY));}
 catch{return null;}
}
const readMossbankSurvey=()=>townMode?null:readMossbank(morningStorage)?.state??null;
let mossbankSurvey=readMossbankSurvey();
session.setHiddenValleyRoad(mossbankSurvey?.finished===true);
scene.mossbankSurvey=()=>mossbankSurvey;
const printRights={marigold:false,woodland:false,pond:completePondWatch(readLocalPondWatch()),alder:mossbankSurvey?.finished===true,pumpworks:!!(fieldSave?.ok&&fieldSave.state.reported),valley:!townMode&&earnedValleyPrint(morningStorage)};
function refreshValleyPrint(){
 printRights.valley=earnedValleyPrint(morningStorage);
 refreshWorkshopPrint();
}
function canPullValleyPrint(stop:Stop|undefined){
 return !townMode&&session.room==='hidden-valley'&&stop?.id===VALLEY_PRINT_STOP_ID&&mossbankSurvey?.finished===true&&!printRights.valley;
}
let graftWake=0;
const localGraft=()=>{const saved=readValleyGraft(morningStorage);return saved.ok?saved.order:null;};
function paintGraft(){
 window.clearTimeout(graftWake);
 if(townMode)return;
 const order=localGraft(),now=Date.now();
 const art=order?(graftReady(order,now)?order.variety:'sapling'):null;
 if(scene.setValleyGraft(art)&&ready&&session.room==='hidden-valley')refreshMenuFrame(2);
 if(order&&art==='sapling'){
  graftWake=window.setTimeout(paintGraft,Math.min(2_147_483_647,Math.max(50,order.readyAt-now+5)));
 }
}
if(!townMode)paintGraft();
function refreshMossbankPrint(){
 mossbankSurvey=readMossbankSurvey();
 session.setHiddenValleyRoad(mossbankSurvey?.finished===true);
 printRights.alder=mossbankSurvey?.finished===true;
 scene.paintMossbankSurvey();
 refreshWorkshopPrint();
}
function refreshPondPrint(){
 printRights.pond=completePondWatch(readLocalPondWatch());
 refreshWorkshopPrint();
}
function refreshWorkshopPrint(){
 try{workshopPrint=selectedWorkshopPrint(localStorage.getItem(WORKSHOP_PRINT_KEY),riverSurvey,printRights);}
 catch{workshopPrint=null;}
 session.setWorkshopPrint(workshopPrint!==null);
 if(scene.setWorkshopPrint(workshopPrint)&&ready){refreshMenuFrame(2);wakeRender();}
}
function refreshRiverCast(){
 try{riverSurvey=readRiverSurvey(localStorage.getItem(RIVER_SURVEY_KEY));}
 catch{riverSurvey=null;}
 scene.riverCast=riverSurvey?.cast??null;
 refreshWorkshopPrint();
 if(ready)wakeRender();
}
if(!townMode){
 refreshRiverCast();
 window.addEventListener('storage',event=>{if(event.key===VALLEY_GRAFT_KEY||event.key===null)paintGraft();if(event.key===VALLEY_PRINT_KEY||event.key===null)refreshValleyPrint();if(event.key===POND_WATCH_KEY||event.key===null)refreshPondPrint();if(event.key===MOSSBANK_KEY||event.key===null)refreshMossbankPrint();if(event.key===RIVER_SURVEY_KEY||event.key===null)refreshRiverCast();else if(event.key===WORKSHOP_PRINT_KEY)refreshWorkshopPrint();});
 window.addEventListener('pageshow',event=>{if(event.persisted){refreshPondPrint();refreshMossbankPrint();refreshValleyPrint();paintGraft();refreshRiverCast();}});
}
let lastContext = '';
let lastDistrictHint='';
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
function save() {
  if(townMode)return;
  if(morning.record){
    if(morning.status!=='ready'||morning.record.phase!=='finished')return;
    const result=saveFirstMorning(morningStorage,morning.raw,{kind:'position',saved:session.save()});
    if(result.status==='saved')morning={status:'ready',raw:result.raw,record:result.record};
    else feedback.textContent='Your position could not be saved in this browser.';
    return;
  }
  try{localStorage.setItem(saveKey,JSON.stringify(session.save()));}
  catch{feedback.textContent='Position could not be saved in this browser. The pilot remains playable.';}
}
async function changeMorning(kind:'start'|'wake'|'leave'){
  if(townMode||morningWriting||morning.status!=='ready')return;
  const expected=morning.raw;
  const showError=(message:string)=>{
    feedback.textContent=message;
    if(kind==='start'&&panel.open){
      const status=body.querySelector<HTMLElement>('[data-morning-feedback]');
      if(status)status.textContent=message;
    }
  };
  morningWriting=true;
  wakeButton.disabled=true;
  session.lock(true);
  try{
    const write=()=>saveFirstMorning(morningStorage,expected,{kind});
    const result=navigator.locks?await navigator.locks.request(FIRST_MORNING_KEY,write):write();
    if(result.status!=='saved'){
      showError(result.status==='changed'?'This room changed in another tab. Reload to continue there.':'The room could not be saved. Try again.');
      return;
    }
    morning={status:'ready',raw:result.raw,record:result.record};
    if(kind!=='wake')session.enter(result.record.saved.room,result.record.saved.position);
    scene.resting=resting();
    showRestingControl();
    if(kind==='start'){
      namedWalk=null;
      placeWalk=null;
      if(panel.open)closePanel();
      feedback.textContent='Your first morning in Ledgerwick. Get up when you’re ready.';
    }else if(kind==='wake'){
      feedback.textContent='Read the note by the bed, or step outside to find Marlow.';
    }else{
      music.setLocation(session.room,session.position);
      confirmedDoor();
      feedback.textContent='Follow the path east to Marlow.';
    }
    if(resting()){wakeButton.disabled=false;wakeButton.focus();}else focusWorld();
  }catch{showError('The room could not be saved. Try again.');}
  finally{morningWriting=false;wakeButton.disabled=false;unlockWorld();}
}
function focusWorld() { document.querySelector('canvas')?.focus(); }
function unlockWorld(){if(!resting()&&!morningWriting&&session.locked&&!panel.open&&!transitionBusy&&!gardenUI?.isSaving&&!carpentryUI?.isSaving&&!commissionUI?.isSaving&&(!townMode||!!town?.snapshot&&!needResync&&!town.retryAvailable))session.lock(false);}
let pendingExplicitPanelCloses=0;
let cleanupRiverSurvey:(()=>void)|undefined;
let cleanupInkmint:(()=>void)|undefined;
let cleanupWindowsill:(()=>void)|undefined;
function closeGlasshouseDetail(){
 cleanupInkmint?.();cleanupInkmint=undefined;
 cleanupWindowsill?.();cleanupWindowsill=undefined;
}
function closeRiverSurvey(){cleanupRiverSurvey?.();cleanupRiverSurvey=undefined;}
function restorePanelFocus() {
  if (title.textContent === 'Sound settings') document.querySelector<HTMLButtonElement>('#place-sound')?.focus();
  else focusWorld();
}
let refreshPlaces:ReturnType<typeof renderPlaces>|undefined;
const waveAnnouncement=document.querySelector<HTMLElement>('.town-wave-announcement')!;
const heardWaves=new Map<string,number>();
function closePanel() { refreshPlaces=undefined; closeRiverSurvey(); closeGlasshouseDetail(); orchardUI?.closed();outingUI?.closed();cafeUI?.close();snackShelfUI?.close(); gardenUI?.closed();carpentryUI?.closed();commissionUI?.closed();workshop.closed(); if(panel.open)pendingExplicitPanelCloses++;panel.close();resumeMenuRender();unlockWorld(); restorePanelFocus(); }
panel.addEventListener('submit', event => { event.preventDefault(); closePanel(); });
panel.addEventListener('close', () => {const explicit=pendingExplicitPanelCloses>0;if(explicit)pendingExplicitPanelCloses--;if(panel.open)return; refreshPlaces=undefined; closeRiverSurvey(); closeGlasshouseDetail(); orchardUI?.closed();outingUI?.closed();cafeUI?.close();snackShelfUI?.close();gardenUI?.closed();carpentryUI?.closed();commissionUI?.closed();workshop.closed();resumeMenuRender();unlockWorld(); if(!explicit)restorePanelFocus(); });
panel.addEventListener('cancel', event => {event.preventDefault();closePanel();});
function openPanel(heading: string) { refreshPlaces=undefined; closeRiverSurvey(); closeGlasshouseDetail(); orchardUI?.closed();outingUI?.closed();cafeUI?.close();snackShelfUI?.close(); namedWalk=null;placeWalk=null;gardenUI?.closed();carpentryUI?.closed();commissionUI?.closed();workshop.closed();body.classList.remove('outing-panel','garden-panel','carpentry-panel','commission-panel','home-arrangement-panel');body.removeAttribute('aria-busy');pendingHomePlotId=undefined;pendingDistrictId=undefined;portalIntent++; session.lock(true); title.textContent = heading; body.replaceChildren(); panel.showModal();panel.scrollTop=0;pauseMenuRender(); }
function paragraph(text: string) { const p = document.createElement('p'); p.textContent = text; return p; }
let townUI:TownUI|undefined;
let pendingHomePlotId:string|undefined,pendingDistrictId:string|undefined;
let homePlotId:string|undefined,districtId:string|undefined,transitionBusy=false;
const contextKey=(room:string,plotId?:string,block=districtId)=>room+':'+(room.startsWith('home')?plotId??'':room==='neighborhood'?block??'':'');
function rememberVisit(){if(!town?.snapshot)return;try{localStorage.setItem('ih2:visit:'+town.snapshot.playerId,JSON.stringify(visitBaseline(town.snapshot)));}catch{/* Optional view hint only; progress is saved by the server. */}}
function previousVisit(id:string):VisitBaseline|null{try{return parseVisit(JSON.parse(localStorage.getItem('ih2:visit:'+id)??'null'),id);}catch{return null;}}
let residentId='',serverInstance='',needResync=true,lastSent='',lastMove=0,moveBackoff=0;
let movement:Promise<void>|null=null;
let walkedDistance=0,confirmedDistance=0,movementEpoch=0,confirmedContext=contextKey(session.room);
// Predict a short visible walk, then wait for confirmation without cancelling the route.
// Keep the existing server's two-tile burst limit and movement rate checks authoritative.
scene.movementBudget=()=>!townMode?Infinity:!town?.snapshot||town.retryAvailable||contextKey(session.room,homePlotId)!==confirmedContext?0:Math.max(0,1.5-(walkedDistance-confirmedDistance));
scene.onSteer=()=>{namedWalk=null;placeWalk=null;pendingHomePlotId=undefined;pendingDistrictId=undefined;};
scene.onMovement=distance=>{if(townMode)walkedDistance+=distance;};
function adoptTownPosition(snapshot:TownSnapshot, throughDoor=false){
 const entered=throughDoor&&contextKey(snapshot.position.room,snapshot.position.homePlotId,snapshot.position.districtId)!==confirmedContext;
 if (residentId !== snapshot.playerId) music.pause();
 music.setLocation(snapshot.position.room,snapshot.position.position);
 namedWalk=null;placeWalk=null;
 portalIntent++;scene.residents=[];scene.localWaveUntil=0;heardWaves.clear();refreshPlaces?.(scene.residents);homePlotId=snapshot.position.homePlotId;districtId=snapshot.position.districtId;scene.districtId=districtId;session.geometry=housingWorld(snapshot.plots,snapshot.position.districtId??'1');session.enter(snapshot.position.room,snapshot.position.position);walkedDistance=0;confirmedDistance=0;confirmedContext=contextKey(snapshot.position.room,homePlotId);movementEpoch++;residentId=snapshot.playerId;lastContext='';serverInstance=snapshot.serverInstance??serverInstance;needResync=false;lastSent=JSON.stringify(snapshot.position);scene.homePlotId=homePlotId;scene.districtId=districtId;session.geometry=housingWorld(snapshot.plots,snapshot.position.districtId??districtId??'1');scene.neighborhoodPlots=snapshot.plots;scene.constructionSites=snapshot.housingSites??[];const visited=snapshot.plots.find(plot=>plot.id===homePlotId);scene.homeOwnerName=visited?.ownerName??'Resident';scene.homeLevel=Number(visited?.level??1);scene.homePennantOwned=!!visited?.pennantOwned;syncHomeStops(visited,snapshot);unlockWorld();
 if(entered)confirmedDoor();
}
let fieldRecoveryHandled='';
let depthsRecoveryHandled='';
const depthsAtControl=()=>isLowerRoom(session.room)&&!panel.open&&!session.locked&&scene.roomReady&&!document.hidden;
const depths=setupDepths({
 root:document.querySelector<HTMLElement>('#depths-controls')!,
 view:()=>town?.depthsView?.room===session.room?town.depthsView:null,
 canAct:()=>depthsAtControl(),
 send:async input=>{
  if(!town)throw Error('Choose a resident first.');
  await flushMovement(true);
  return town.sendDepths(input);
 },
 message:message=>feedback.textContent=message,
});
const town=townMode?new TownClient({
 onField:view=>{
  pumpworks?.syncRemote();
  if(session.room!=='pumpworks'||view.playerId!==town?.snapshot?.playerId)return;
  if(view.state.fight&&panel.open){
   closePanel();
   feedback.textContent='The hopper is active. Step back across the footbridge to use menus.';
  }
  if(!view.returnTo)return;
  const key=view.playerId+':'+view.serverInstance+':'+view.state.revision;
  if(key===fieldRecoveryHandled)return;
  fieldRecoveryHandled=key;
  if(panel.open)closePanel();
  adoptTownPosition({...town.snapshot,position:{room:'pumpworks',position:view.returnTo}});
  openRecovery=true;
 },
 onDepths:view=>{
  if(!isLowerRoom(session.room))return;
  if(view.room===session.room&&view.enemy&&panel.open){
   closePanel();feedback.textContent='Step away from the fight to use menus.';
  }
  if(view.returnTo&&view.room&&view.playerId===town?.snapshot?.playerId){
   const key=view.playerId+':'+view.serverInstance+':'+view.progress.revision;
   if(depthsRecoveryHandled===key)return;
   depthsRecoveryHandled=key;
   if(panel.open)closePanel();
   adoptTownPosition({...town.snapshot,position:{room:view.room,position:view.returnTo}});
   feedback.textContent='First aid brought you back to the lamplit landing.';
  }
 },
 onConfirmedCommand:(command,reward)=>{
  const cue=reward.teapot?'craft':command.kind==='gather'&&!reward.collection?undefined:rewardCue(command);
  if(cue)music.cue(cue);
 },
 onSnapshot:(snapshot,previous)=>{
 mossbankSurvey=mossbankFromAwards(snapshot.quest.awarded);scene.paintMossbankSurvey();
 const headwear=snapshot.headwear,worn=headwear?.worn;
 scene.headwear=headwear&&(worn===INKWOOD_HOOD||worn===CLERK_CAP)&&ownsHeadwear(headwear,worn)?worn:null;
 fieldNoteOwner=snapshot.playerId;fieldNotes.read(fieldNoteOwner);
  if(scene.setGlasshousePhase(snapshot.glasshouse?.project.phase??'overgrown'))refreshMenuFrame(2);
  if(!needResync&&!panel.open&&freshGlasshouseOpening(previous,snapshot)&&scene.playGlasshouseOpening())
   feedback.textContent='The Glasshouse is open. The vines have filed a complaint.';
  glasshouseUI?.refresh();
  if(town)refreshSewingJournal(body,town);
  const cloth=snapshot.tailoring?.worn??'none',tie=cloth==='none'?'knot':snapshot.tailoring?.tie??'knot';
  const goldEdge=cloth!=='none'&&snapshot.tailoring?.goldEdge===true;
  if(scene.sharedKerchief!==cloth||scene.sharedKerchiefTie!==tie||scene.sharedKerchiefGoldEdge!==goldEdge){
   scene.sharedKerchief=cloth;
   scene.sharedKerchiefTie=tie;
   scene.sharedKerchiefGoldEdge=goldEdge;
   refreshMenuFrame(2);
  }
 session.setSquareStops([
  ...(snapshot.orchard!==undefined?ORCHARD_STOPS:[]),
  ...(snapshot.sharedPumpworks?[PUMPWORKS_DOOR]:[]),
 ]);
 if(snapshot.sharedPumpworks&&!town?.fieldView)void town?.loadField().catch(()=>{});
 const celebrateBridge=!needResync&&freshBridgeOpening(previous??null,snapshot);
 skyOffset=snapshot.serverTime-Date.now();const identityChanged=residentId!==snapshot.playerId;const expandedInPlace=session.room==='home'&&snapshot.position.room==='home-expanded'&&snapshot.position.homePlotId===homePlotId;
 // Ordinary snapshots can race acknowledged movement. Only explicit entry/resume or an in-place forward expansion adopts feet.
 if(identityChanged||needResync||expandedInPlace||(snapshot.serverInstance&&snapshot.serverInstance!==serverInstance))adoptTownPosition(snapshot);
 scene.homePlotId=homePlotId;scene.districtId=districtId;session.geometry=housingWorld(snapshot.plots,snapshot.position.districtId??districtId??'1');scene.neighborhoodPlots=snapshot.plots;scene.constructionSites=snapshot.housingSites??[];const visited=snapshot.plots.find(plot=>plot.id===homePlotId);scene.homeOwnerName=visited?.ownerName??'Resident';scene.homeLevel=Number(visited?.level??1);scene.homePennantOwned=!!visited?.pennantOwned;syncHomeStops(visited,snapshot);scene.houseLevel=Number(snapshot.plot?.level??snapshot.plots[0]?.level??0);scene.residentId=snapshot.playerId;scene.bridgeRestored=snapshot.bridge.restored;scene.bridgePhase=snapshot.bridge.phase;scene.bridgeReadyAt=snapshot.bridge.readyAt??null;if(celebrateBridge&&!panel.open&&scene.playBridgeCeremony())feedback.textContent='Inkwood is open. The bridge has filed its paperwork.';scene.refreshDecorations();scene.refreshGarden();scene.refreshCarpentry();scene.refreshOuting();outingUI?.refresh();cafeUI?.refresh();gardenUI?.refresh();carpentryUI?.refresh();commissionUI?.refresh();paintGuideObjective();townUI?.refresh();const residentButton=document.querySelector('#resident');if(residentButton)residentButton.textContent=snapshot.name;const tag=document.querySelector('.pilot-tag span');if(tag)tag.textContent=snapshot.name+' · practice town';},
 onPresence:presence=>{
  scene.residents=Array.isArray(presence)?presence:[];
  refreshPlaces?.(scene.residents);
  const waved:string[]=[],at=town?.serverNow()??Date.now();
  if(waveRoom(session.room))for(const peer of scene.residents){
   if(peer.room===session.room&&activeWave(peer.waveUntil,at)&&heardWaves.get(peer.id)!==peer.waveUntil){
    heardWaves.set(peer.id,peer.waveUntil);
    waved.push(peer.name);
   }
  }
  if(waved.length)waveAnnouncement.textContent=waved.join(', ')+(waved.length===1?' waves hello.':' wave hello.');
 },
 onConnection:message=>{feedback.textContent=message;if(message.includes('interrupted')){needResync=true;session.lock(true);scene.residents=[];scene.localWaveUntil=0;refreshPlaces?.(null);}},
 beforeCommand:()=>flushMovement(true)
}):null;
if(town){
 scene.waveTime=town.serverNow;
 scene.depthsView=()=>town.depthsView;
}
document.addEventListener('keydown',event=>{
 if(!depthsAtControl()||event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;
 if(event.target instanceof HTMLElement&&event.target.closest('button,input,select,textarea'))return;
 if(event.code==='Space'){event.preventDefault();void depths.attack('strike');}
 if(event.key==='Shift')void depths.attack('brace');
});

async function flushMovement(force=false):Promise<void>{
 if(!town?.snapshot)return;if(movement){if(!force)return;await movement;}
 if(!town.snapshot)return;
 if(!force&&(Date.now()-lastMove<150||Date.now()<moveBackoff))return;
 const value={room:session.room,position:{...session.position},...(session.room.startsWith('home')&&homePlotId?{homePlotId}:{}),...(districtId?{districtId}:{})},hash=JSON.stringify(value);if(hash===lastSent){if(!movement&&!needResync&&contextKey(value.room,homePlotId)===confirmedContext)confirmedDistance=walkedDistance;return;}
 const sentDistance=walkedDistance,epoch=movementEpoch,sentPlayerId=town.snapshot.playerId;
 lastMove=Date.now();
 const action=town.movement(value).then(()=>{if(epoch!==movementEpoch||town.snapshot?.playerId!==sentPlayerId)return;lastSent=hash;confirmedDistance=Math.max(confirmedDistance,sentDistance);const nextContext=contextKey(value.room,value.homePlotId,value.districtId);if(nextContext!==confirmedContext)confirmedDoor();confirmedContext=nextContext;music.setLocation(value.room,value.position);moveBackoff=0;}).catch(async error=>{if(epoch!==movementEpoch||town.snapshot?.playerId!==sentPlayerId)return;moveBackoff=Date.now()+2000;needResync=true;session.lock(true);feedback.textContent='Movement could not be confirmed. Reconnecting to the local town…';try{const snapshot=await town.load();if(snapshot.playerId!==sentPlayerId||town.snapshot?.playerId!==sentPlayerId)return;homePlotId=snapshot.position.homePlotId;districtId=snapshot.position.districtId;scene.districtId=districtId;session.geometry=housingWorld(snapshot.plots,snapshot.position.districtId??'1');session.enter(snapshot.position.room,snapshot.position.position);lastSent=JSON.stringify(snapshot.position);}catch{/* SSE reconnect reloads the authoritative position. */}if(force)throw error;}).finally(()=>{if(movement===action)movement=null;});
 movement=action;await action;
}
if(town)glasshouseUI=new GlasshouseBoard({
 open:()=>openPanel(INKWOOD_GLASSHOUSE.name),body,
 atDoor:()=>session.room==='trail'&&session.nearby()?.id===INKWOOD_GLASSHOUSE.id,
 enter:()=>{closePanel();activate(INKWOOD_GLASSHOUSE);},
},town);
const remoteWorkshop=town?.workshopAdapter();
function refreshWoodlandCertificate(){
 if(townMode)return;
 const earned=earnedFieldCertificate(outingUI.snapshot().journal);
 if(earned===printRights.woodland)return;
 printRights.woodland=earned;
 refreshWorkshopPrint();
}
const outingUI=new OutingUI({open:openPanel,body,position:()=>({room:session.room,position:session.position}),go:id=>goNamedDestination('square',id),changed:()=>{scene.refreshOuting();refreshWoodlandCertificate();refreshMenuFrame(2);},feedback:message=>feedback.textContent=message,previewCertificate:townMode?undefined:()=>workshop.showJournal('woodland-certificate')},town);
scene.outingState=()=>outingUI.snapshot();
refreshWoodlandCertificate();
const orchardTable=worlds.square.stops.find(stop=>stop.id==='commons-orchard')!;
const orchardAvailable=()=>!town||town.snapshot?.orchard!==undefined;
const orchardPort=town?sharedOrchard(town,()=>!needResync&&!transitionBusy&&contextKey(session.room,homePlotId)===confirmedContext):undefined;
const orchardUI=new OrchardUI({
 open:openPanel,close:closePanel,body,feedback:message=>feedback.textContent=message,walk:walkToPlace,
 at:stop=>session.room==='square'&&session.nearby()?.id===stop.id,
 packed:save,
 pick:id=>{
  const branch=ORCHARD_BRANCHES.find(branch=>branch.id===id)!;
  scene.playOrchardPick(branch);
  music.cue('gather');
 },
},orchardTable,orchardPort);
scene.orchardState=()=>orchardAvailable()?orchardUI.state:undefined;
scene.orchardNow=orchardPort?.now??Date.now;
function nurseryPlantForBag(){
 const snapshot=town?.snapshot,plant=snapshot?.glasshousePlant;
 if(!plant)return;
 const ownerHere=snapshot.plantWindowsill===true&&session.room.startsWith('home')&&
  snapshot.plot?.id===homePlotId&&session.stops.some(stop=>stop.id===WINDOWSILL_STOP.id);
 return {plant,striped:snapshot.inkmint?.phase==='applied',...(ownerHere?{walk:()=>{
  if(town?.snapshot?.playerId!==snapshot.playerId||homePlotId!==snapshot.plot?.id||
     !session.stops.some(stop=>stop.id===WINDOWSILL_STOP.id))return;
  goNamedDestination(session.room,WINDOWSILL_STOP.id);
 }}:{})};
}
function inkmintForJournal(){
 const snapshot=town?.snapshot;
 if(!snapshot?.inkmint)return;
 const home=snapshot.plot;
 return {
  state:snapshot.inkmint,
  tray:()=>goNamedDestination('glasshouse',INKMINT_STATIONS.tray),
  pottery:()=>goNamedDestination('glasshouse',INKMINT_STATIONS.pottery),
  ...(home?{home:()=>{
   if(town?.snapshot?.plot?.id!==home.id)return;
   const atHome=nurseryPlantForBag()?.walk;
   if(atHome)atHome();
   else if(session.room==='neighborhood')void enterHome(home.id);
   else goNamedDestination('square','home-front');
  }}:{}),
 };
}
const fieldStations:Record<string,PumpworksPlace>={
 'pumpworks-locker':'locker','pumpworks-bench':'bench',[FORGE_STOP.id]:'forge',
 'pumpworks-cache':'cache','pumpworks-report':'desk','lodging-note':'bed',
};
const atFieldStation=(place:PumpworksPlace)=>session.stops.some(stop=>fieldStations[stop.id]===place&&session.canInspect(stop));
let openRecovery=!!(fieldSave?.ok&&fieldSave.state.recovering);
const pumpworks=createPumpworks({
 body,hud:document.querySelector('#pump-health')!,controls:document.querySelector('#pump-controls')!,
 open:openPanel,atStation:atFieldStation,wakeFrame:wakeRender,cue:music.cue,
 combat:()=>({
  inRoom:session.room==='pumpworks',
  able:session.room==='pumpworks'&&scene.roomReady&&!panel.open&&!session.locked&&!document.hidden,
  position:session.position,
 }),
 equipment:()=>workshop.showFieldGear(),
 look:()=>({rig:scene.residentId,headwear:scene.headwear}),
 reward:()=>music.cue('craft'),
 forgeReminder:ready=>{forgeJournalReady=ready;paintJournalReady();},
 feedback:message=>feedback.textContent=message,
 update:record=>{
  const earned=record.ok&&record.state.reported;
  if(!townMode&&earned!==printRights.pumpworks){
   printRights.pumpworks=earned;
   refreshWorkshopPrint();
  }
  scene.paintPumpworks();refreshMenuFrame(2);
 },
 moveToBed:()=>{
  closePanel();
  session.enter('lodging',LODGING_BEDSIDE);
  music.setLocation('lodging',LODGING_BEDSIDE);
  save();focusWorld();openRecovery=true;
 },
},morningStorage,town?{
 view:()=>town.fieldView,
 now:town.serverNow,
 ready:()=>!!town.snapshot?.sharedPumpworks&&!needResync&&!transitionBusy&&!town.retryAvailable&&!town.isSaving,
 beforeInput:async()=>{await flushMovement(true);},
 send:input=>town.sendField(input),
}:undefined);
scene.pumpworksState=pumpworks.current;
scene.pumpworksEncounter=pumpworks.encounter;
window.addEventListener('keydown',event=>{
 if(!pumpworks||session.room!=='pumpworks'||!scene.roomReady||panel.open||event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;
 if(event.target instanceof HTMLElement&&event.target.closest('input,textarea,select,summary,[contenteditable]'))return;
 if(event.code==='Space'&&(!(event.target instanceof HTMLElement)||!event.target.closest('button'))){
  event.preventDefault();pumpworks.strike();
 }else if(event.key==='Shift')pumpworks.brace();
 else if(event.key.toLowerCase()==='f')pumpworks.eat();
});
const mossbank=createMossbank({
 open:openPanel,body,place:()=>session.room==='mossbank'?session.nearby()?.id:undefined,
 feedback:message=>feedback.textContent=message,
 saved:()=>{if(!townMode)refreshMossbankPrint();},inMossbank:()=>session.room==='mossbank',observationCue:()=>music.cue('gather'),
 preview:townMode?undefined:()=>workshop.showJournal('mossbank-swatch'),
 walk:place=>{
  if(place==='mossbank-road'&&!townMode)goNamedDestination('square',place);
  else goNamedDestination('mossbank',place==='mossbank-road'?'mossbank-mill':place);
 },
},morningStorage,town?{
 read:()=>{
  const snapshot=town.snapshot,state=mossbankFromAwards(snapshot?.quest.awarded);
  return snapshot&&state?{state,raw:snapshot.playerId+':'+snapshot.workshop.revision}:null;
 },
 save:async(action,expected,present)=>{
  const snapshot=town.snapshot;
  if(!present()||!snapshot||expected!==snapshot.playerId+':'+snapshot.workshop.revision){
   return {ok:false,message:'The route card changed. Open the updated card and try again.'};
  }
  if(town.retryAvailable){showPendingRequest();return {ok:false,message:'Confirm the previous request first.'};}
  if(town.isSaving||needResync)return {ok:false,message:'Wait for the town to confirm your position.'};
  try{return await town.saveMossbankSurvey(action,snapshot.workshop.revision,present);}
  catch(error){
   if(town.snapshot?.playerId===snapshot.playerId&&town.retryAvailable)showPendingRequest();
   return {ok:false,message:error instanceof Error?error.message:'The route card could not be confirmed.'};
  }
 },
}:undefined);
const sewingHost={open:openPanel,body,look:()=>({rig:scene.residentId,headwear:scene.headwear}),armor:()=>{
 const field=pumpworks.current(),armor=field?equippedArmor(field):null;
 return armor?{armor,finish:field?.armorFinishes?.[armor]??'original' as const}:null;
},walkToSupplies:()=>goNamedDestination('square','supplies'),atTable:()=>session.room==='workshop'&&session.nearby()?.id===SEWING_TABLE.id&&!needResync,cue:()=>music.cue('craft')};
const workshop=new WorkshopUI({fieldGear:()=>{
 const field=pumpworks.gear()??[];
 const clothing=town?tailoringBagCards(town,()=>showTailoring(sewingHost,town,true))??[]:[];
 return [...field,...clothing];
},fieldJournal:body=>{
 pumpworks.journal(body,()=>{
  const state=pumpworks.current();
  if(session.room==='pumpworks'){
   goNamedDestination('pumpworks',state?.satchel==='at-pump'?'pumpworks-cache':state?.cleared?'pumpworks-report':state?.rod==='unissued'?'pumpworks-locker':'pumpworks-hopper');
  }else goNamedDestination('square',PUMPWORKS_DOOR.id);
 },()=>workshop.showJournal('pumpworks-seal'),()=>goNamedDestination('pumpworks',FORGE_STOP.id));
 mossbank.journal(body);
 if(town)sewingJournal(body,town,()=>goNamedDestination('workshop',SEWING_TABLE.id));
 else valleyGraftJournal(body,localGraft(),()=>goNamedDestination('hidden-valley',VALLEY_GRAFT_STOP_ID));
},inkmint:inkmintForJournal,nurseryPlant:nurseryPlantForBag,townHeadwear:()=>town?.snapshot?.headwear,recentFieldNotes:()=>fieldNotes.read(townMode?town?.snapshot?.playerId??null:fieldNoteOwner),river:!town?{read:()=>riverSurvey,walk:()=>goNamedDestination('square','commons-riverwalk')}:undefined,
 savedMarigold:!town?(earned)=>{
  if(earned===printRights.marigold)return;
  printRights.marigold=earned;
  refreshWorkshopPrint();
 }:undefined,
 prints:!town?{earned:()=>earnedWorkshopPrints(riverSurvey,printRights),selected:()=>workshopPrint,choose:print=>{
  try{
   const saved=setWorkshopPrint(localStorage,print,printRights);
   refreshWorkshopPrint();
   return saved;
  }catch{return false;}
 }}:undefined,wardrobe:showBrowserResident?()=>({label:scene.headwear?headwearName[scene.headwear]:'Original look',open:showBrowserResident}):undefined,orchard:()=>orchardAvailable()?orchardUI.state:undefined,orchardWalk:()=>goNamedDestination('square',orchardTable.id),walkToOrchardBranch:(id:BranchId)=>{const stop=ORCHARD_STOPS.find(site=>orchardBranchFromStop(site.id)===id);if(stop)goNamedDestination('square',stop.id);},cue:music.cue,outings:()=>outingUI.show(),pondWatch:townMode?undefined:()=>goNamedDestination('square','commons-pond'),woodlandTrip:()=>outingUI.benchTrip(),walkToWorkshop:()=>goNamedDestination('square','workshop'),readyWork:paintJournalReady,walkToStarter:!townMode?target=>target==='bench'?goNamedDestination('workshop','bench'):goNamedDestination('square',target):undefined,owner:()=>town?.snapshot?.playerId??'local',rig:()=>scene.residentId,commission:()=>commissionUI?.showPip(),finishing:()=>carpentryUI?.showRack(),carpentry:()=>carpentryUI?.showDesk(),garden:()=>gardenUI?.showBeds(),walkToStudy:(id:SurveyId)=>goNamedDestination('square','survey-'+id),walkToAllotment:()=>goNamedDestination('garden','garden-beds'),open:openPanel,body,feedback:message=>feedback.textContent=message,inside:()=>session.room==='workshop',changed:()=>{scene.refreshDecorations();scene.refreshGarden();scene.refreshCarpentry();cafeUI?.refresh();gardenUI?.refresh();carpentryUI?.refresh();commissionUI?.refresh();},...(town?{cafeParcels:()=>showCafeParcelNote({open:openPanel,body,walk:()=>goNamedDestination('square','cafe')},town),objective:()=>currentObjective(),kitUse:()=>town.snapshot&&town.snapshot.bridge.contributed>=town.snapshot.bridge.target?'Bridge funding is complete. Save ordinary kits for housing: '+PLOT_CLAIM_KITS+' to claim, '+PLOT_UPGRADE_KITS+' more to expand.':'Bring a finished ordinary kit to the collecting bridge committee.',teaching:()=>townUI?.showLesson(),discoveries:()=>townUI?.showTrail(),returns:()=>town?.snapshot&&townUI?.showReturns(previousVisit(town.snapshot.playerId)),homeAvailable:()=>session.room.startsWith('home'),home:()=>{if(session.room.startsWith('home'))townUI?.showPlots(homePlotId);else feedback.textContent='Enter a house to arrange or inspect its furnishings.';}}:{})},remoteWorkshop);
const atCafe=()=>session.room==='square'&&Math.hypot(session.position.x-30,session.position.y-22)<=1.4;
if(town)snackShelfUI=new SnackShelfUI({open:openPanel,body,canUse:atCafe,counter:()=>cafeUI?.show()},town);
cafeUI=new CafeUI({open:openPanel,body,owner:()=>town?.snapshot?.playerId??'local',rig:()=>scene.residentId,headwear:()=>scene.headwear,canUse:atCafe,parcelShelf:snackShelfUI?()=>snackShelfUI?.show():undefined,project:()=>town?.snapshot?.cafe,shared:townMode,bag:()=>workshop.showInventory(),garden:()=>goNamedDestination('square','allotment'),feedback:message=>feedback.textContent=message},workshop);
gardenUI=new GardenUI({open:openPanel,body,showFlowerPrint:townMode?undefined:()=>workshop.showJournal('marigold'),feedback:message=>feedback.textContent=message,shared:townMode,owner:()=>town?.snapshot?.playerId??'local',publicState:()=>town?.snapshot?.gardenTown,changed:()=>{scene.refreshGarden();refreshMenuFrame(2);unlockWorld();},canUse:action=>gardenActionLocations(action).some(location=>{const stop=worlds[location.room].stops.find(s=>s.id===location.stopId);return session.room===location.room&&!!stop&&Math.hypot(session.position.x-stop.point.x,session.position.y-stop.point.y)<=1.4;}),go:goNamedDestination,accepted:action=>{if(action.action==='plant')scene.playGardenAction('sow');else if(action.action==='harvest')scene.playGardenAction('harvest');else if(action.action==='observe')scene.playGardenAction('inspect');}},workshop);
scene.ordinaryJob=()=>workshop.confirmedBenchJob();
scene.gardenState=()=>workshop.state.garden;scene.gardenNow=()=>workshop.gardenClock();scene.welcomeCredits=()=>town?.snapshot?.gardenTown?.credits??Math.min(6,workshop.state.garden?.requests??0);
function currentNoticeboard():NoticeboardState|undefined{if(town)return town.snapshot?.noticeboard;const s=workshop.state.carpentry;return s.recorded<6?{...createNoticeboard(),credits:s.recorded}:settleNoticeboard({credits:6,phase:'installing',startedAt:s.sixthRecordAt,readyAt:s.sixthRecordAt!+24*3600_000,openedAt:null},Math.max(workshop.gardenClock(),s.sixthRecordAt!));}
carpentryUI=new CarpentryUI({open:openPanel,body,feedback:message=>feedback.textContent=message,shared:townMode,owner:()=>town?.snapshot?.playerId??'local',publicState:currentNoticeboard,changed:()=>{scene.refreshCarpentry();refreshMenuFrame(2);unlockWorld();},canUse:action=>carpentryActionLocations(action).some(location=>{const stop=worlds[location.room].stops.find(s=>s.id===location.stopId);return session.room===location.room&&!!stop&&Math.hypot(session.position.x-stop.point.x,session.position.y-stop.point.y)<=1.4;}),go:goNamedDestination,accepted:action=>{if(action.action==='gather-pine')scene.playCarpentryAction('saw');else if(action.action==='start-easel'||action.action==='claim-easel')scene.playCarpentryAction('finish');else if(action.action==='deliver-hamper')scene.playCarpentryAction('deliver');for(const ms of [250,500])window.setTimeout(()=>refreshMenuFrame(2),ms);}},workshop);
commissionUI=new CommissionUI({open:openPanel,body,feedback:message=>feedback.textContent=message,changed:()=>{scene.refreshDecorations();refreshMenuFrame(2);unlockWorld();},owner:()=>town?.snapshot?.playerId??'local',shared:townMode,styles:()=>town?town.snapshot?.commissionTown?.styles:workshop.state.commission.published?[{ownerId:'local',ownerName:'Your local resident',motif:workshop.state.commission.motif}]:[],canUse:action=>{const location=commissionLocation(action),stop=worlds[location.room].stops.find(s=>s.id===location.stopId);return session.room===location.room&&!!stop&&Math.hypot(session.position.x-stop.point.x,session.position.y-stop.point.y)<=1.4;},go:goNamedDestination},workshop);
scene.carpentryState=()=>workshop.state.carpentry;scene.noticeboardState=currentNoticeboard;
function routeAvailable(){
 if(resting()||morningWriting){feedback.textContent=resting()?'Get up before walking.':'Saving your room…';return false;}
 if(town?.isSaving){feedback.textContent='Finish confirming the current change before walking.';return false;}
 if(town&&(town.retryAvailable||needResync||transitionBusy||!town.snapshot)){showPendingRequest('Confirm your current location or pending request before walking.');return false;}
 if(gardenUI?.isSaving||carpentryUI?.isSaving||commissionUI?.isSaving){feedback.textContent='Finish confirming the current change before walking.';return false;}
 return true;
}
function goNamedDestination(room:Room,stopId:string){
 if(!routeAvailable())return;closePanel();placeWalk=null;
 namedWalk={room,stopId,startedRoom:'',owner:town?.snapshot?.playerId??'local'};followNamedWalk();
}
function followNamedWalk(){
 if(!namedWalk||!ready||!scene.roomReady||panel.open||session.locked||transitionBusy||townMode&&(!town?.snapshot||needResync||contextKey(session.room,homePlotId)!==confirmedContext))return;
 if(namedWalk.owner!==(town?.snapshot?.playerId??'local')){namedWalk=null;return;}
 if(namedWalk.startedRoom===session.room)return;
 const target=namedWalk;
 const fromInkwoodSide=session.room==='glasshouse'||(townMode&&session.room==='mossbank');
 const toNursery=target.room==='glasshouse',toMossbank=townMode&&target.room==='mossbank';
 const toPumpworks=target.room==='pumpworks'&&(!townMode||town?.snapshot?.sharedPumpworks===true);
 const toValley=!townMode&&target.room==='hidden-valley';
 const squarePortal=toValley?MOSSBANK_ROAD.id:toPumpworks?PUMPWORKS_DOOR.id:target.room==='garden'?'allotment':target.room==='workshop'?'workshop':toNursery||toMossbank?'trail-gate':null;
 const stop=session.room===target.room?session.stops.find(s=>s.id===target.stopId)
  :session.room==='square'?session.stops.find(s=>s.id===squarePortal)
  :session.room==='trail'&&toNursery?INKWOOD_GLASSHOUSE
  :session.room==='trail'&&toMossbank?INKWOOD_MOSSBANK_ROAD
  :session.room==='mossbank'&&toValley?session.stops.find(stop=>stop.id===MOSSBANK_VALLEY_ROAD.id)
  :session.stops.find(s=>s.transition===(fromInkwoodSide?'trail':session.room==='hidden-valley'?'mossbank':'square'));
 if(!stop){namedWalk=null;feedback.textContent='That route could not be reached. Choose a clear nearby destination.';return;}
 if(Math.hypot(session.position.x-stop.point.x,session.position.y-stop.point.y)<=1.25){
  if(session.room===target.room&&stop.id===target.stopId)namedWalk=null;
  activate(stop);return;
 }
 if(!session.approach(stop.id)){namedWalk=null;feedback.textContent='That route could not be reached. Choose a clear nearby destination.';return;}
 target.startedRoom=session.room;feedback.textContent='Walking to '+stop.name+'.';
}
const pumpworksExitLabel='Return to Willow meadow';
function placeArrival(stop:Stop){
 stop=resolvedStop(stop);if(stop.id==='home-door'&&stop.transition==='neighborhood'){feedback.textContent='At the front door. Choose Enter street.';return;}
 if(stop.id==='lodging-door'){feedback.textContent='At the boarding house. Choose Enter lodging.';return;}
 if(stop.id==='lodging-exit'){feedback.textContent='At the door. Choose Step outside.';return;}
 if(stop.id==='pumpworks-exit'){feedback.textContent='You’re at the exit to Willow meadow.';return;}
 const depthsAction=lowerTransitionLabel(stop);
 if(depthsAction){feedback.textContent=stop.text;return;}
 const next=stop.id==='trail-gate'&&!scene.bridgeRestored?'Inspect the bridge committee':stop.transition?'Enter':'Inspect';
 feedback.textContent='At '+stop.name+'. Choose '+next+'.';
}
function walkToPlace(stop:Stop){
 if(!routeAvailable())return;
 if(stop.id==='residential-gate'&&town){void enterNeighborhood(town.snapshot?.plot?addressForPlot(town.snapshot.plot.id).block:'1');return;}
 if(session.room==='neighborhood'&&districtId&&stop.id.startsWith(HOME_SITE_PREFIX)&&town){const id=plotAtAddress(districtId,Number(stop.id.slice(HOME_SITE_PREFIX.length)));if(town.snapshot?.plots.some(p=>p.id===id)){void enterHome(id);return;}}
 closePanel();namedWalk=null;
 const owner=town?.snapshot?.playerId??'local',room=session.room;
 // Interaction ranges overlap: arrival must agree with the Inspect target.
 if(session.nearby()?.id===stop.id&&Math.hypot(session.position.x-stop.point.x,session.position.y-stop.point.y)<=1.25){placeArrival(stop);return;}
 if(!session.walk(stop.point)){feedback.textContent='That route could not be reached. Choose a clear nearby destination.';return;}
 placeWalk={room,stopId:stop.id,owner};feedback.textContent='Walking to '+stop.name+'.';
}
function canStopAssistedWalk() {
 return !!(namedWalk || placeWalk) && !session.locked && !panel.open && !transitionBusy && scene.roomReady;
}
function stopAssistedWalk() {
 if (!canStopAssistedWalk()) return false;
 namedWalk = null;
 placeWalk = null;
 session.stop();
 stopWalkButton.hidden = true;
 feedback.textContent = 'Walk stopped. Tap the ground or choose another place.';
 focusWorld();
 return true;
}
stopWalkButton.addEventListener('click', stopAssistedWalk);
document.addEventListener('keydown', event => {
 if (event.key === 'Escape' && !event.repeat && !event.defaultPrevented && stopAssistedWalk()) event.preventDefault();
});
function paintPlaceArrival(){
 if(!placeWalk)return;
 if(placeWalk.room!==session.room||placeWalk.owner!==(town?.snapshot?.playerId??'local')){placeWalk=null;return;}
 if(session.snapshot().walking)return;
 const stop=session.stops.find(s=>s.id===placeWalk!.stopId);placeWalk=null;
 if(stop&&session.nearby()?.id===stop.id&&Math.hypot(session.position.x-stop.point.x,session.position.y-stop.point.y)<=1.25)placeArrival(stop);
 else feedback.textContent='The walk stopped before the destination. Choose a clear nearby stop.';
}
if(town){townUI=new TownUI({room:()=>session.room,showEquipment:()=>workshop.showHeadwear(INKWOOD_HOOD),open:openPanel,body,feedback:message=>feedback.textContent=message,changed:()=>scene.refreshDecorations(),go:goNamedDestination,enterHome,enterNeighborhood,enterTrail:()=>{if(!town.snapshot?.bridge.restored){feedback.textContent='The bridge is still under inspection.';return;}if(session.room!=='square'){feedback.textContent='You are already beyond the town bridge. Use Places for the local landmarks.';return;}closePanel();const gate=worlds.square.stops.find(stop=>stop.id==='trail-gate')!;session.point(gate.point);feedback.textContent='Walking into Inkwood trail.';}},town);document.querySelector('#resident')!.addEventListener('click',()=>void townUI!.showLogin(()=>closePanel()));}
scene.letterboxMotif=()=>session.room.startsWith('home')?town?.snapshot?.plots.find(plot=>plot.id===homePlotId)?.letterboxMotif??null:workshop.state.commission.motif;
scene.decorations=()=>{if(!session.room.startsWith('home'))return workshop.state.placements;const plot=town?.snapshot?.plots.find(plot=>plot.id===homePlotId);return plot?homeDisplay(plot):{};};
function personalTool(tool:'bag'|'journal'){if(town?.retryAvailable){showPendingRequest();return;}if(tool==='bag')workshop.showInventory();else workshop.showJournal();}
document.querySelector('#bag')!.addEventListener('click',()=>personalTool('bag'));
journalButton.addEventListener('click',()=>personalTool('journal'));
window.addEventListener('keydown',event=>{if(event.defaultPrevented||event.repeat||event.ctrlKey||event.metaKey||event.altKey||panel.open||transitionBusy||!!town&&needResync)return;const target=event.target;if(target instanceof HTMLElement&&target.closest('input,textarea,select,button,summary,[contenteditable]'))return;const key=event.key.toLowerCase();if(key==='b'||key==='j'){event.preventDefault();personalTool(key==='b'?'bag':'journal');}});
function currentObjective(){return town?.snapshot?sharedObjective(town.snapshot,town.serverNow()):questStep(workshop.state);}
function workshopArrivalNote():string {
  const {job,stats}=workshop.state;
  if(job)return 'Your workshop. Open the bench to check your work.';
  if(stats.plantersCrafted>0)return 'Your workshop. Open the bench to see what you can make.';
  return 'Your workshop. Tap the bench to make your first planter.';
}
function paintGuideObjective(){
  const title=body.querySelector<HTMLElement>('[data-guide-title]');
  const detail=body.querySelector<HTMLElement>('[data-guide-detail]');
  if(!title||!detail)return;
  const objective=currentObjective();
  if(title.textContent!==objective.title)title.textContent=objective.title;
  if(detail.textContent!==objective.detail)detail.textContent=objective.detail;
  const depots=body.querySelector<HTMLButtonElement>('#guide-places');
  if(depots)depots.hidden=objective.id!=='gather'||session.room!=='square';
}
function showMaterialDepots(){
  document.querySelector<HTMLButtonElement>('#places')?.click();
  body.querySelector<HTMLButtonElement>('.places-primary button')?.focus();
}
let guidanceSecond=-1;
document.querySelector('#field-guide')!.addEventListener('click',()=>{
  openPanel('Town field guide');
  body.innerHTML=fieldGuideContents(session.room==='workshop',townMode,session.room!=='square'&&session.room!=='workshop');
  paintGuideObjective();
  body.querySelector('#guide-places')!.addEventListener('click',showMaterialDepots);
  const guideJournal=body.querySelector<HTMLButtonElement>('#guide-journal')!;
  guideJournal.addEventListener('click',()=>{
    personalTool('journal');
    panel.querySelector<HTMLButtonElement>('[aria-label="Close panel"]')?.focus({preventScroll:true});
  });
  const climate=scene.climateState();
  if(climate){
   const clock=paragraph('Town time · '+String(Math.floor(climate.minute/60)).padStart(2,'0')+':'+String(climate.minute%60).padStart(2,'0')+' · '+climate.label+(climate.fixture?' · Lighting study':''));
   clock.id='guide-sky';
   body.append(clock);
  }
  if(scene.skyFixture){
   const live=document.createElement('a');
   live.className='destination live-clock';
   live.href=townMode?'/?town=1':'/';
   live.textContent='Return to the live town clock';
   body.append(live);
  }
  const skyNotes=document.createElement('details'),skySummary=document.createElement('summary');skyNotes.className='sky-notes';skySummary.textContent='Weather & daylight';skyNotes.append(skySummary,paragraph('A town day lasts 48 real minutes. Weather can change every 12 minutes. Daylight, warm windows and passing drizzle are cosmetic; your work uses real time.'));const motionNote=paragraph(window.matchMedia('(prefers-reduced-motion: reduce)').matches?'Your device requests reduced motion, so tree sway and animated rain are turned off.':'Trees sway outdoors, and drizzle moves when it is raining. Indoors stays sheltered.');skyNotes.append(motionNote);body.append(skyNotes);
  if(showBrowserResident){
   const appearance=document.createElement('button');
   appearance.type='button';
   appearance.className='destination';
   appearance.textContent='Edit your resident';
   appearance.onclick=showBrowserResident;
   body.append(appearance);
   if(localResident&&morning.status==='ready'&&!morning.record){
    const first=document.createElement('button');
    first.type='button';
    first.className='destination';
    first.textContent='Try a first morning';
    const firstStatus=paragraph('');
    firstStatus.setAttribute('role','status');
    firstStatus.dataset.morningFeedback='';
    first.onclick=()=>void changeMorning('start');
    body.append(first,firstStatus);
   }
   if(session.room==='square'){
    const lodging=document.createElement('button');
    lodging.type='button';
    lodging.className='destination';
    lodging.textContent='Visit the boarding house';
    lodging.onclick=()=>goNamedDestination('square','lodging-door');
    body.append(lodging);
   }

  }
  body.querySelector('#guide-workshop')!.addEventListener('click',()=>{
   if(session.room==='square'){goNamedDestination('square','workshop');return;}
   if(session.room==='workshop'){goNamedDestination('workshop','bench');return;}
   if(session.room==='glasshouse'||session.room==='mossbank'){goNamedDestination('square','workshop');return;}
   const exit=worlds[session.room].stops.find(stop=>stop.transition==='square');if(exit)goNamedDestination(session.room,exit.id);
  });
});
async function waveHere(){
 const room=session.room,player=town?.snapshot?.playerId;
 if(!town||!player||needResync||!waveRoom(room))throw new Error('Enter the shared square or Mossbank to wave.');
 const map=body.querySelector('.places-map,.mossbank-map');
 const until=await town.wave();
 if(session.room!==room||town.snapshot?.playerId!==player||needResync)return;
 scene.localWaveUntil=until;
 if(map?.isConnected)closePanel();
 wakeRender();
 feedback.textContent='You waved hello. Informally, no paperwork required.';
}
function showPlaces(){
  openPanel('Places to go');
  refreshPlaces=renderPlaces(body,{room:session.room,position:session.position,wave:town?.snapshot&&waveRoom(session.room)?waveHere:undefined,peers:town?.snapshot?(needResync?null:scene.residents):undefined,stops:currentStops(),state:workshop.state,goal:currentObjective(),now:remoteWorkshop?.now()??Date.now(),neighborhood:districtId?{districtId,ownerPlotId:town?.snapshot?.plot?.id}:undefined,walk:walkToPlace,inspectOutfit:town?.snapshot?showPeerOutfit:undefined,outfitScope:{homePlotId,districtId}});
}
document.querySelector('#places')!.addEventListener('click',showPlaces);
function showPeerOutfit(id:string){
 const context=contextKey(session.room,homePlotId),owner=town?.snapshot?.playerId;
 if(!owner||needResync)return;
 const current=()=>contextKey(session.room,homePlotId)===context&&town?.snapshot?.playerId===owner&&!needResync
  ?nearbyOutfits(scene.residents,session.room,session.position,{homePlotId,districtId}).find(peer=>peer.id===id):undefined;
 const peer=current();
 if(!peer)return;
 openPanel(peer.name+'’s outfit');
 const display=residentOutfit(body,showPlaces);
 refreshPlaces=()=>display(current());
 refreshPlaces(scene.residents);
}
function openSharedTownChoice(heading:string,intro='Homes live in shared practice. Your browser-only workshop stays saved here; shared town progress is separate.'){openPanel(heading);body.append(paragraph(intro));const enter=document.createElement('button');enter.type='button';enter.className='destination';enter.dataset.openTown='';enter.textContent='Open shared practice town';enter.onclick=()=>{const url=new URL(window.location.href);url.searchParams.set('town','1');window.location.assign(url);};body.append(enter);}
function resolvedStop(stop:Stop):Stop{
 if(stop.id===INKWOOD_MOSSBANK_ROAD.id&&!townMode)return{...stop,transition:undefined,arrival:undefined};
 if(stop.id===INKWOOD_GLASSHOUSE.id&&town?.snapshot?.glasshouse?.project.phase!=='open')return{...stop,transition:undefined,arrival:undefined};
 if(stop.id==='home-door'&&districtId){const exit=exitForHome({homePlotId,districtId});return{...stop,name:'Front door',transition:exit.room,arrival:exit.position};}return stop;}
function currentStops():Stop[]{return session.stops.map(stop=>{if(session.room!=='neighborhood'||!districtId||!stop.id.startsWith(HOME_SITE_PREFIX))return resolvedStop(stop);const id=plotAtAddress(districtId,Number(stop.id.slice(HOME_SITE_PREFIX.length))),plot=town?.snapshot?.plots.find(p=>p.id===id);return{...stop,name:stop.name+' · '+(plot?plot.ownerName??'Resident':'Future home site')};});}
async function enterNeighborhood(block:string,homeAfter?:string){
 if(!town?.snapshot||!routeAvailable())return;const source=worlds[session.room].stops.find(s=>s.id===(session.room==='square'?'residential-gate':'neighborhood-directory'));
 if(!source){feedback.textContent='Leave the building before choosing a neighborhood.';return;}
 if(Math.hypot(session.position.x-source.point.x,session.position.y-source.point.y)>1.25){closePanel();pendingDistrictId=block;pendingHomePlotId=homeAfter;if(!session.approach(source.id)){pendingDistrictId=undefined;pendingHomePlotId=undefined;feedback.textContent='The neighborhood gate could not be reached.';}return;}
 closePanel();pendingDistrictId=undefined;pendingHomePlotId=undefined;const intent=++portalIntent,epoch=movementEpoch,playerId=town.snapshot.playerId;transitionBusy=true;session.lock(true);feedback.textContent='Confirming the neighborhood gate…';
 try{await flushMovement(true);if(intent!==portalIntent||epoch!==movementEpoch||town.snapshot?.playerId!==playerId||needResync)return;const snapshot=await town.command({kind:'enter-neighborhood',districtId:block});if(snapshot.position.room==='neighborhood'&&snapshot.position.districtId===block){adoptTownPosition(snapshot,true);feedback.textContent='Neighborhood '+block+'. Each front door belongs to one home.';focusWorld();}else feedback.textContent=town.lastMessage;}
 catch(error){showPendingRequest((error as Error).message);}finally{transitionBusy=false;unlockWorld();}
 if(homeAfter&&town.snapshot?.playerId===playerId&&session.room==='neighborhood'&&districtId===block)await enterHome(homeAfter);
}
function showPendingRequest(message='Resolve the previous request before walking.'){
 if(!town)return;openPanel('Confirm pending request');body.append(paragraph(message),paragraph('The change may already be saved. Retrying uses the same request and cannot spend or enter twice.'));const retry=document.createElement('button');retry.type='button';retry.className='destination';retry.textContent=town.retryAvailable?'Retry the same request':'Refresh confirmed position';retry.onclick=()=>{retry.disabled=true;void(town.retryAvailable?town.retry():town.load()).then(snapshot=>{adoptTownPosition(snapshot);closePanel();feedback.textContent=town.lastMessage||'Confirmed position restored.';}).catch(error=>{retry.disabled=false;feedback.textContent=error.message;});};body.append(retry);
}
async function enterHome(plotId:string){
 if(town?.isSaving){feedback.textContent='Finish confirming the current change before entering.';return;}
 if(!town?.snapshot||needResync||transitionBusy)return;if(!routeAvailable())return;if(town.retryAvailable){showPendingRequest();return;}const a=addressForPlot(plotId);if(session.room==='square'&&town.snapshot.housing){await enterNeighborhood(a.block,plotId);return;}if(session.room==='neighborhood'&&districtId!==a.block){await enterNeighborhood(a.block,plotId);return;}const front=session.room==='neighborhood'?worlds.neighborhood.stops.find(stop=>stop.id===HOME_SITE_PREFIX+a.slot)!:worlds.square.stops.find(stop=>stop.id==='home-front')!;if((session.room==='square'||session.room==='neighborhood')&&Math.hypot(session.position.x-front.point.x,session.position.y-front.point.y)>1.25){closePanel();pendingHomePlotId=plotId;if(!session.approach(front.id)){pendingHomePlotId=undefined;feedback.textContent='The house door could not be reached.';}else feedback.textContent='Walking to the house door.';return;}closePanel();const intent=++portalIntent,playerId=town.snapshot.playerId,epoch=movementEpoch;transitionBusy=true;session.lock(true);feedback.textContent='Confirming the house door…';
 try{await flushMovement(true);if(intent!==portalIntent||epoch!==movementEpoch||town.snapshot?.playerId!==playerId||needResync)return;const snapshot=await town.command({kind:'enter-home',plotId});if(town.snapshot?.playerId===playerId&&snapshot.position.homePlotId===plotId){adoptTownPosition(snapshot,true);feedback.textContent=scene.homeOwnerName+'’s home. Owned work stays here through weekly scores.';focusWorld();}else feedback.textContent=town.lastMessage;}catch(error){
  feedback.textContent='House entry could not be confirmed. Resolve the same request before walking.';showPendingRequest((error as Error).message);
 }finally{transitionBusy=false;unlockWorld();}
}
async function enterRemotePortal(stop:Stop){
 if(!town?.snapshot||!stop.transition||needResync)return;
 if(stop.id===LIFT_TOP_ID&&!town.depthsView?.progress.liftOpen){
  feedback.textContent='The freight lift latch opens from below.';return;
 }
 const intent=++portalIntent,epoch=movementEpoch,playerId=town.snapshot.playerId,sourceRoom=session.room,targetRoom=stop.transition;
 transitionBusy=true;session.lock(true);feedback.textContent='Confirming your arrival before entering…';
 try{
  // Confirm the final source-room approach before the separate portal request.
  await flushMovement(true);
  if(intent!==portalIntent||epoch!==movementEpoch||town.snapshot?.playerId!==playerId||session.room!==sourceRoom||panel.open||needResync)return;
  if(isFieldRoute(targetRoom)||isFieldRoute(sourceRoom)||targetRoom==='mossbank'||sourceRoom==='mossbank'){
   const destination={room:targetRoom,position:stop.arrival!};
   const receipt=await town.movement(destination);
   if(intent!==portalIntent||epoch!==movementEpoch||town.snapshot?.playerId!==playerId||session.room!==sourceRoom||panel.open||needResync)return;
   if(receipt.ok!==true||receipt.position?.room!==targetRoom)throw new Error('Road arrival was not confirmed.');
   session.enter(targetRoom,receipt.position.position);
   lastSent=JSON.stringify(destination);confirmedContext=contextKey(targetRoom);
   scene.residents=[];music.setLocation(targetRoom,receipt.position.position);confirmedDoor();focusWorld();
   if(isLowerRoom(targetRoom)){
    feedback.textContent=targetRoom==='pumpworks-depths'?'Follow the lamps to the next room, or look for the Stores.':'Head toward the spillway or take the lift back up.';
    void town.loadDepths().catch(()=>{});
    return;
   }
   feedback.textContent=isLowerRoom(sourceRoom)?'Back upstairs by the survey locker.':targetRoom==='pumpworks'?'Pick up a survey kit at the locker. Your hopper encounter is private.':sourceRoom==='pumpworks'?'Back in Willow meadow.':targetRoom==='mossbank'?'Mossbank outskirts. The sawmill is up the road.':'Back on the Inkwood trail.';
   if(targetRoom==='pumpworks')void town.loadField().then(()=>pumpworks.syncRemote()).catch(()=>{});
   return;
  }
  session.enter(targetRoom,stop.arrival);districtId=targetRoom==='neighborhood'?districtId:undefined;scene.districtId=districtId;if(!targetRoom.startsWith('home')){homePlotId=undefined;scene.homePlotId=undefined;}save();focusWorld();
  feedback.textContent=targetRoom==='neighborhood'?'Back in neighborhood '+districtId+'. Each door leads to its own home.':targetRoom==='glasshouse'?'The nursery is open. Walk up to a bench or meet the keeper.':sourceRoom==='glasshouse'?'Back on the Glasshouse front step.':targetRoom==='trail'?'Inkwood trail. Three landmarks, one extremely official field notebook.':targetRoom==='garden'?'Your allotment. Inspect the three beds or visit the attendant.':targetRoom==='workshop'?workshopArrivalNote():(scene.bridgeRestored?'Back in the square. The bridge is repaired; the committee has finally earned its name.':'Back in the square. The committee has made no measurable progress.');
 }catch{
  if(intent===portalIntent&&epoch===movementEpoch&&town.snapshot?.playerId===playerId&&!needResync){
   if(isFieldRoute(targetRoom)||isFieldRoute(sourceRoom)||targetRoom==='mossbank'||sourceRoom==='mossbank'){
    needResync=true;
    try{
     const snapshot=await town.load();
     if(snapshot.playerId!==playerId)return;
     if(needResync)adoptTownPosition(snapshot);
     feedback.textContent=snapshot.position.room===targetRoom?'Road arrival recovered.':'Still at the road. Try entering again.';
    }catch{showPendingRequest('Refresh the last confirmed road position before walking.');}
   }else feedback.textContent='Entry could not be confirmed. Try the door again.';
  }
 }finally{
  transitionBusy=false;
  unlockWorld();
 }
}
function noteForHome(plot:TownPlot|undefined){
 if(plot?.level!==2)return null;
 if(plot.planId==='garden-studio-2')return SUNROOM_NOTEBOOK;
 if(plot.planId==='workshop-lodge-2')return WORKSHOP_LODGE_BOARD;
 return null;
}

function paintLodgeWork(target:HTMLElement,snapshot:TownSnapshot){
 const work=benchWork(snapshot.workshop,town?.serverNow()??snapshot.serverTime);
 let detail=work.phase==='idle'?'The work bench is free.':work.title+'. '+work.detail;
 if(work.phase==='running'){
  const due=new Date(work.readyAt).toLocaleString(undefined,{weekday:'short',hour:'numeric',minute:'2-digit'});
  detail=work.title+' · Scheduled to finish '+due+'.';
 }
 if(target.textContent!==detail)target.textContent=detail;
}

function syncHomeStops(plot:TownPlot|undefined,snapshot:TownSnapshot){
 const keepsake=displayedHomeKeepsake(plot);
 const note=noteForHome(plot);
 const windowsill=snapshot.plantWindowsill===true&&!!plot&&(!!plot.windowsillPlant||plot.ownerId===snapshot.playerId&&!!snapshot.glasshousePlant);
 session.setHomeStops(keepsake,note,windowsill);
 if(scene.setWindowsillPlant(windowsill?plot?.windowsillPlant:undefined,windowsill&&plot?.windowsillStriped===true))refreshMenuFrame(2);
 if(scene.setHomeKeepsake(keepsake))refreshMenuFrame(2);
 if(!panel.open)return;
 const notebook=body.querySelector<HTMLElement>('[data-home-plan-note]');
 const certificate=body.querySelector<HTMLElement>('[data-reading-keepsake]');
 const changedCertificate=certificate&&certificate.dataset.readingKeepsake!==keepsake;
 const changedNotebook=notebook&&(notebook.dataset.homePlanNote!==note?.id||notebook.dataset.plot!==plot?.id||notebook.dataset.owner!==String(plot?.ownerId===snapshot.playerId));
 const sillPanel=body.querySelector<HTMLElement>('[data-home-windowsill]');
 const changedSill=sillPanel&&(!windowsill||sillPanel.dataset.homeWindowsill!==plot?.id);
 if(changedCertificate||changedNotebook||changedSill){closePanel();return;}
 const board=notebook?.querySelector<HTMLElement>('[data-lodge-work]');
 if(board&&plot?.ownerId===snapshot.playerId)paintLodgeWork(board,snapshot);
}

function readHomePlanNote(note:Stop){
 const snapshot=town?.snapshot;
 const plot=snapshot?.plots.find(plot=>plot.id===homePlotId);
 if(!snapshot||!plot||noteForHome(plot)?.id!==note.id||!session.stops.some(stop=>stop.id===note.id))return;
 const garden=note.id===SUNROOM_NOTEBOOK.id;
 openPanel(note.name);
 const view=document.createElement('section');
 view.dataset.homePlanNote=note.id;
 if(garden)view.dataset.sunroomNotebook='';
 else view.dataset.lodgeBoard='';
 view.dataset.plot=plot.id;
 const owner=plot.ownerId===snapshot.playerId;
 view.dataset.owner=String(owner);
 view.append(paragraph(note.text));
 if(owner){
  if(!garden){
   const work=paragraph('');
   work.dataset.lodgeWork='';
   paintLodgeWork(work,snapshot);
   view.append(work);
  }
  const open=document.createElement('button');
  open.type='button';
  open.textContent=garden?'Open your allotment notes':'Walk to the work bench';
  open.className='destination primary';
  open.onclick=()=>{
   const current=town?.snapshot;
   const home=current?.plots.find(item=>item.id===homePlotId);
   if(!current||home?.id!==plot.id||home.ownerId!==current.playerId||!session.stops.some(stop=>stop.id===note.id))return;
   if(garden)gardenUI?.showBeds();
   else goNamedDestination('workshop','bench');
  };
  view.append(open);
 }else{
  view.append(paragraph(garden?'The household’s garden notes are private.':'The household’s work schedule is private.'));
 }
 body.append(view);
}

function readHomeKeepsake(){
 const choice=displayedHomeKeepsake(town?.snapshot?.plots.find(plot=>plot.id===homePlotId));
 if(!choice||!session.stops.some(stop=>stop.id==='home-keepsake'))return;
 const keepsake=HOME_KEEPSAKES[choice];
 openPanel(keepsake.name);
 const card=document.createElement('figure');
 card.className='reading-keepsake';
 card.dataset.readingKeepsake=choice;
 const art=document.createElement('img');
 art.src=keepsake.art;
 art.alt=keepsake.alt;
 art.width=300;art.height=200;
 const caption=document.createElement('figcaption');
 caption.textContent=keepsake.story;
 card.append(art,caption);
 body.append(card);
}
async function savePondObservation(id:PondWatchId,choice:string,active:()=>boolean){
 try{
  if(!navigator.locks)return 'This browser cannot coordinate field note saves.';
  return await navigator.locks.request(POND_WATCH_KEY,()=>{
   if(townMode||!active()||session.room!=='square'||session.nearby()?.id!==id)return 'Return to this shore to record the observation.';
   const current=readLocalPondWatch();
   if(!current)return 'The saved field notes could not be read. They were kept.';
   const result=recordPondWatch(current,id,choice);
   if(!result.changed)return result.message;
   const recorded=JSON.stringify(result.state);
   try{localStorage.setItem(POND_WATCH_KEY,recorded);}
   catch(error){if(localStorage.getItem(POND_WATCH_KEY)!==recorded)throw error;}
   refreshPondPrint();
   save();
   return result.message;
  });
 }catch{return 'The observation could not be saved. Your earlier notes are safe.';}
}
function activate(stop: Stop) {
  if(session.room==='hidden-valley'&&!stop.transition){
    if(stop.id===VALLEY_GRAFT_STOP_ID){
      const eligible=()=>session.room==='hidden-valley'&&session.nearby()?.id===VALLEY_GRAFT_STOP_ID&&mossbankSurvey?.finished===true;
      if(!eligible())return;
      openPanel('Grafting house');
      showValleyGraft(body,{read:()=>readValleyGraft(morningStorage),start:async(id:GraftId,present)=>{
        if(!navigator.locks)return {ok:false,message:'This browser cannot safely save the graft across tabs.'};
        return navigator.locks.request(VALLEY_GRAFT_KEY,()=>{
          const result=startValleyGraft(morningStorage,id,present()&&eligible(),Date.now());
          if(result.ok){paintGraft();music.cue('craft');}
          return result;
        });
      }});
      return;
    }
    if(canPullValleyPrint(stop)){
      const saved=takeValleyPrint(morningStorage,session.nearby()?.id===VALLEY_PRINT_STOP_ID);
      if(saved){refreshValleyPrint();music.cue('craft');}
      feedback.textContent=saved?'Cider press print added to your Journal. The apples unanimously abstained.':'Your print could not be saved. Try the press again here.';
    }else feedback.textContent=stop.text;
    return;
  }
  if(session.room==='mossbank'&&stop.id.startsWith('mossbank-')&&!stop.transition){
    mossbank.show(stop.id as SurveyPlace);
    return;
  }
  if(town&&stop.id===SEWING_TABLE.id){
    showTailoring(sewingHost,town);
    return;
  }
  if(isLowerRoom(session.room)&&stop.id==='depths-tool-chest'){
  void depths.toolChest();return;
 }
 if(pumpworks&&session.room==='pumpworks'&&stop.id==='pumpworks-bell'){
    const field=pumpworks.current();
    feedback.textContent=field?.bow==='equipped'?'Hold still and Shoot at the bell.':field?.staff==='equipped'?'Try Pulse on the bell.':field?.rod==='equipped'?'Try Strike on the bell.':'Equip a weapon to ring the bell.';
    return;
  }
  if(pumpworks&&session.room==='pumpworks'&&stop.id==='pumpworks-hopper'){
    feedback.textContent='Dodge the marked lunge. Space or Strike attacks in reach. Shift or Brace reduces the hit.';
    return;
  }
  if(pumpworks&&session.room==='pumpworks'&&fieldStations[stop.id]){
    pumpworks.show(fieldStations[stop.id]);return;
  }
  if(pumpworks?.current()?.recovering&&stop.id==='lodging-exit'){
    goNamedDestination('lodging','lodging-note');return;
  }
  const pond=pondWatchId(stop.id);
  if(!townMode&&(pond||stop.id==='commons-pond')){
    feedback.textContent='At '+stop.name+'.';
    stopWalkButton.hidden=true;
    openPanel(stop.name);
    mountPondWatch(body,{read:readLocalPondWatch,save:savePondObservation,walk:id=>goNamedDestination('square',id),previewPrint:()=>workshop.showJournal('pond')},pond);
    return;
  }
  if(stop.id===WORKSHOP_PRINT_STOP.id){
    if(townMode||!workshopPrint||session.room!=='workshop')return;
    const print=WORKSHOP_PRINTS[workshopPrint];
    openPanel(print.name);
    const inspection=document.createElement('div');
    inspection.className='workshop-print-inspection';
    const artwork=document.createElement('img');
    artwork.src=print.art;
    artwork.alt='';
    artwork.width=108;
    artwork.height=90;
    inspection.append(artwork,paragraph(print.story));
    body.append(inspection);
    return;
  }
  if(stop.id===SUNROOM_NOTEBOOK.id||stop.id===WORKSHOP_LODGE_BOARD.id){readHomePlanNote(stop);return;}
  if(stop.id===WINDOWSILL_STOP.id&&town&&homePlotId){
    const plotId=homePlotId;
    openPanel(WINDOWSILL_STOP.name);
    cleanupWindowsill=showHomeWindowsill(body,town,plotId,()=>plotId===homePlotId&&session.nearby()?.id===stop.id);
    return;
  }
  if(stop.id==='home-keepsake'){readHomeKeepsake();return;}
  if(orchardAvailable()){
   if(stop.id===orchardTable.id){orchardUI.showTable();return;}
   const branch=orchardBranchFromStop(stop.id);
   if(branch){orchardUI.showBranch(stop,branch);return;}
  }
  if(stop.id.startsWith('outing-')){outingUI.show();return;}
  if(stop.id==='cafe'){cafeUI?.show();return;}
  stop=resolvedStop(stop);
  if(stop.id==='residential-gate'){if(town)void enterNeighborhood(pendingDistrictId??(town.snapshot?.plot?addressForPlot(town.snapshot.plot.id).block:'1'),pendingHomePlotId);else openSharedTownChoice('Homes & neighbors');return;}
  if(session.room==='neighborhood'&&town&&stop.id==='neighborhood-directory'){if(pendingDistrictId){const id=pendingDistrictId,home=pendingHomePlotId;pendingDistrictId=undefined;pendingHomePlotId=undefined;void enterNeighborhood(id,home);}else townUI!.showNeighborhoods();return;}
  if(session.room==='neighborhood'&&districtId&&town&&stop.id.startsWith(HOME_SITE_PREFIX)){const id=plotAtAddress(districtId,Number(stop.id.slice(HOME_SITE_PREFIX.length)));pendingHomePlotId=undefined;if(town.snapshot?.plots.some(p=>p.id===id))void enterHome(id);else{openPanel(stop.name);body.append(paragraph('Future home site. Homes are assigned a permanent address when earned at the Housing Registry.'));const b=document.createElement('button');b.type='button';b.className='destination';b.textContent='Walk to Housing Registry';b.onclick=()=>goNamedDestination('square','plot');body.append(b);}return;}
  feedback.textContent='At '+stop.name+'.';
  if(stop.id==='carpentry-desk'){carpentryUI!.showDesk();commissionUI?.addNpcLink('carpentry-desk');return;}
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
    if(['courier','clerk','caretaker'].includes(stop.id))commissionUI?.addNpcLink(stop.id as RecipientId|'courier');
    if(stop.id==='clerk'&&!townMode&&objective.id==='gather'){
      const depots=document.createElement('button');
      depots.type='button';
      depots.className='destination primary';
      depots.textContent='Find material depots';
      depots.onclick=showMaterialDepots;
      body.append(depots);
    }
    if(dialogue.action){const action=dialogue.action,button=document.createElement('button');button.type='button';button.className='destination';button.dataset.npcAction=action.destination;button.textContent=action.label;button.addEventListener('click',()=>{if(action.destination==='journal'){workshop.showJournal();return;}const target=worlds[session.room].stops.find(s=>s.id===action.destination||(action.destination==='workshop'&&s.id==='bench'));if(target)walkToPlace(target);});body.append(button);}
    if(stop.id==='caretaker'&&orchardAvailable()){
      const pantry=orchardUI.state;
      if(pantry&&(pantry.picked>0||pantry.snacks>0||objective.id==='bridge'||objective.id==='complete')){
        const guide=orchardGuide(pantry,orchardPort?.now()??Date.now(),townMode);
        const card=document.createElement('section'),title=document.createElement('h3');
        card.className='jun-orchard';
        title.textContent='Orchard work';
        card.append(title,paragraph(guide.detail));
        if(guide.to&&guide.button){
          const destination=guide.to;
          const button=document.createElement('button');
          button.type='button';
          button.className='destination';
          button.textContent=guide.button;
          button.onclick=()=>goNamedDestination('square',destination);
          card.append(button);
        }
        body.querySelector('p')?.after(card);
      }
    }
    return;
  }
  const study=stop.id.startsWith('survey-')?surveyId(stop.id.slice(7)):undefined;if(study){workshop.showSketchbook(study);return;}
  if (stop.id === 'bridge' || stop.id === 'trail-gate' && !scene.bridgeRestored) {
    if (town) townUI!.showBridge();
    else openSharedTownChoice('Bridge committee', 'Help repair the bridge and explore Inkwood in shared practice. Your workshop in this browser has its own save.');
    return;
  }
  if(stop.id===INKWOOD_GLASSHOUSE.id&&!stop.transition){
    if(town?.snapshot?.glasshouse&&glasshouseUI)glasshouseUI.show();
    else{openPanel(stop.name);body.append(paragraph(stop.text));}
    return;
  }
  if(stop.id==='glasshouse-keeper'&&town){
    openPanel(stop.name);
    showNurseryKeeper(body,town,()=>session.room==='glasshouse'&&session.nearby()?.id===stop.id,
      ()=>goNamedDestination('glasshouse',INKMINT_STATIONS.tray));
    return;
  }
  if(town?.snapshot?.inkmint&&session.room==='glasshouse'&&(stop.id===INKMINT_STATIONS.tray||stop.id===INKMINT_STATIONS.pottery)){
    const station=stop.id===INKMINT_STATIONS.tray?'tray':'pottery';
    const next=station==='tray'?INKMINT_STATIONS.pottery:INKMINT_STATIONS.tray;
    openPanel(stop.name);
    cleanupInkmint=showInkmint(body,town,station,()=>session.room==='glasshouse'&&session.nearby()?.id===stop.id,
      ()=>goNamedDestination('glasshouse',next),inkmintForJournal()?.home);
    return;
  }
  if(session.room==='glasshouse'&&!stop.transition){
    openPanel(stop.name);body.append(paragraph(stop.text));return;
  }
  if(town&&session.room==='trail'&&(TRAIL_LANDMARK_IDS as readonly string[]).includes(stop.id)){townUI!.showTrail(stop.id);return;}
  if(!town&&(stop.id==='plot'||stop.id==='home-front')){openSharedTownChoice(stop.id==='plot'?'Housing Registry':'Home visits',stop.id==='plot'?stop.text:'Earned homes and their front doors are in shared practice. Your browser-only workshop stays saved separately.');return;}
  if(town&&stop.id==='plot'){townUI!.showPlots();return;}
  if(town&&stop.id==='home-front'){const target=pendingHomePlotId??town.snapshot?.plot?.id;pendingHomePlotId=undefined;if(target)void enterHome(target);else townUI!.showPlots();return;}
  if(['scrap','timber','supplies'].includes(stop.id)){workshop.showResource(stop.id as 'scrap'|'timber'|'supplies');return;}
  if(stop.id==='bench'){workshop.showBench();return;}
  if(stop.id.startsWith('commons-')){
    openPanel(stop.name);
    const walkBack=()=>goNamedDestination('square','workshop');
    if(stop.id==='commons-riverwalk'&&!town){
     cleanupRiverSurvey=showRiverSurvey(body,action=>{if(action.kind==='cast')save();refreshRiverCast();},walkBack);
     return;
    }
    body.append(paragraph(stop.text));
    const back=document.createElement('button');back.type='button';
    if(stop.id==='commons-riverwalk')back.className='destination';
    back.textContent='Walk to the old square';back.onclick=walkBack;body.append(back);
    return;
  }
  if (stop.id==='lodging-note') {
    const field=pumpworks?.current();
    if(!resting()&&field&&field.health<FIELD_HEALTH){pumpworks?.show('bed');return;}
    openPanel(stop.name);
    const note=document.createElement('div');
    note.className='lodging-note';
    const arrivalLine=localResident?.version===3?ARRIVAL_STORIES[localResident.story].note:null;
    note.append(paragraph(arrivalLine?arrivalLine+' Marlow at the clerk’s desk has your first job.':stop.text));
    const actions=document.createElement('div');
    actions.className='lodging-note-actions';
    const visit=document.createElement('button');
    visit.type='button';
    visit.className='destination primary';
    visit.textContent='Walk to Marlow';
    visit.onclick=()=>goNamedDestination('square','clerk');
    const leave=document.createElement('button');
    leave.type='button';
    leave.className='destination';
    leave.textContent='Step outside';
    leave.onclick=()=>goNamedDestination('lodging','lodging-exit');
    actions.append(visit,leave);
    note.append(actions);
    body.append(note);
    return;
  }
  if (stop.transition) {
    if(stop.id==='lodging-exit'&&morning.record?.phase==='awake'){void changeMorning('leave');return;}
    if(town){void enterRemotePortal(stop);return;}
    if(stop.id===MOSSBANK_VALLEY_ROAD.id&&!mossbankSurvey?.finished)return;
    session.enter(stop.transition, stop.arrival); music.setLocation(stop.transition,stop.arrival); confirmedDoor(); save(); focusWorld(); feedback.textContent = stop.id===MOSSBANK_VALLEY_ROAD.id?'Hidden Valley. Follow the road up to the orchard or down to the cider court.':stop.id==='valley-mossbank-road'?'Back above the Mossbank sawmill.':stop.id==='pumpworks-door'?'Gear up at the locker. The hopper guards the far bank.':stop.id==='mossbank-road'?'Mossbank outskirts. See Wren at the sawmill.':stop.id==='mossbank-return'?'Back by the Ledgerwick orchard.':stop.id==='pumpworks-exit'?'Back in Willow meadow.':stop.id==='lodging-exit'?'Follow the path east to Marlow.':stop.transition==='lodging'?'One room, two adequate blankets. Look for the note by the bed.':stop.transition==='garden'?'Your allotment. Inspect the beds or visit the attendant.':stop.transition === 'workshop' ? workshopArrivalNote() : (scene.bridgeRestored?'Back in the square. The bridge is repaired; the committee has finally earned its name.':'Back in the square. The committee has made no measurable progress.');
  } else {
    openPanel(stop.name); body.append(paragraph(stop.text));
    const note = paragraph(townMode?'Shared practice keeps your town projects and home progress.':'This workshop is saved in this browser. Shared bridge donations and plot ownership use the separate shared-practice town.'); note.className = 'disclosure'; body.append(note);
  }
}
function interact() {
  if (!scene.roomReady) return;
  if (resting()&&!panel.open){void changeMorning('wake');return;}
  if (session.locked) return;
  const stop = session.nearby();
  if (stop){namedWalk=null;placeWalk=null;session.stop();activate(stop);}
}
wakeButton.addEventListener('click', interact);
interactButton.addEventListener('click', interact);
document.addEventListener('keydown', e => {
  if (e.repeat || (session.locked&&!resting()) || !(e.key === 'e' || e.key === 'E' || e.key === 'Enter')) return;
  if (e.target instanceof HTMLElement && e.target.closest('button,input,dialog,[data-ui-scroll]')) return;
  e.preventDefault(); interact();
});
scene.onFrame = () => {
  const now=performance.now();
  pumpworks?.tick(now);
  depths.paint(isLowerRoom(session.room));
  if(town)paintJournalReady();
  frameLimit(!ready||panel.open||now<wakeRenderUntil||scene.needsFullRate()||pumpworks?.encounterActive()||isLowerRoom(session.room)&&!!town?.depthsView?.enemy?0:10);
  if(panel.open){const second=Math.floor((town?.serverNow()??Date.now())/1000);if(second!==guidanceSecond){guidanceSecond=second;paintGuideObjective();}}
  if(town&&!document.hidden)void flushMovement().catch(()=>{});
  else if(!town)music.setLocation(session.room,session.position);
  if (!ready) {
    ready = true; document.querySelector('#boot')?.remove();
    const canvas = document.querySelector('canvas')!; canvas.tabIndex = 0; canvas.setAttribute('aria-label', 'Walkable neighborhood. Use Places for named destinations.'); canvas.setAttribute('aria-describedby', 'instructions'); focusWorld();
    if(town){needResync=true;session.lock(true);void town.load().then(()=>{
      // A coalesced load may already have delivered its snapshot before this first frame.
      // Reuse only the client's confirmed current snapshot to finish the pending resume.
      if(needResync&&town.snapshot)adoptTownPosition(town.snapshot);town.connect();
    }).catch(()=>townUI!.showLogin(()=>closePanel()));}
  }
  pumpworks?.paintHealth(session.room==='pumpworks'||(session.room==='lodging'&&!!pumpworks.current()?.recovering),session.room==='pumpworks');
  if(openRecovery&&scene.roomReady&&!panel.open){
    if(session.room==='lodging'||townMode&&session.room==='pumpworks'){
     openRecovery=false;pumpworks.show(townMode?'bench':'bed');
    }
  }
  const arrival = session.takeArrival();
  if(arrival){if(namedWalk?.room===session.room&&namedWalk.stopId===arrival.id)namedWalk=null;activate(arrival);}
  followNamedWalk();paintPlaceArrival();
  const hideStopWalk = !canStopAssistedWalk();
  if (stopWalkButton.hidden !== hideStopWalk) {
    const shouldRestoreFocus = hideStopWalk && document.activeElement === stopWalkButton && !panel.open;
    stopWalkButton.hidden = hideStopWalk;
    if (shouldRestoreFocus) focusWorld();
  }
  const nearby=session.nearby(),stop=nearby?resolvedStop(nearby):undefined;
  const district=session.room==='square'?townDistrict(session.position):null;
  const pullValleyPrint=canPullValleyPrint(stop);
  const state = (district?.name??'')+contextKey(session.room,homePlotId)+':'+(stop?.id??'')+':'+(scene.bridgePhase??String(scene.bridgeRestored))+':'+String(resting())+':'+(stop?.transition??'')+':'+String(pullValleyPrint);
  if (state !== lastContext) {
    lastContext = state;
    const roomName=isLowerRoom(session.room)?(session.room==='pumpworks-depths'?'Lower Pumpworks':'Lower sluice'):session.room==='square'?district!.name:session.room==='neighborhood'?'Neighborhood '+districtId:session.room==='trail'?'Inkwood trail':session.room==='glasshouse'?'Inkwood Glasshouse':session.room==='garden'?'Your allotment':session.room==='mossbank'?'Mossbank outskirts':session.room==='hidden-valley'?'Hidden Valley':session.room==='pumpworks'?'The Pumpworks':session.room==='lodging'?'Boarding house':session.room.startsWith('home')?scene.homeOwnerName+'’s home':'Your workshop';
    const hint=session.room==='square'?district!.hint:session.room==='neighborhood'?'Homes, not cubicles.':session.room==='trail'?'A path worth the paperwork.':session.room==='glasshouse'?'A warm aisle and five things to inspect.':session.room==='garden'?'Ready plants wait safely.':session.room==='mossbank'?'The sawmill is up the road.':session.room==='hidden-valley'?'Terraces, orchard paths and a covered press.':session.room==='pumpworks'?(matchMedia('(pointer:coarse)').matches?'Tap or drag to steer.':'Mind the water.'):session.room==='lodging'?'Your rented room. Nothing due today.':session.room.startsWith('home')?(session.room==='home-expanded'?'Workroom expansion · saved':'Starter house · saved'):'Great things take time.';
    if(district&&district.name!=='Town square'&&(feedback.textContent?.startsWith('Tap the three material depots')||feedback.textContent===lastDistrictHint)){feedback.textContent=district.hint;lastDistrictHint=district.hint;}
    if(location.dataset.room!==session.room)location.dataset.room=session.room;
    if (locationTitle.data !== roomName) locationTitle.data = roomName;
    if (locationHint.textContent !== hint) locationHint.textContent = hint;
    if (practiceLabel) {
      const label = 'Practice town · ' + (town?.snapshot?.name ?? 'choose a resident');
      if (practiceLabel.textContent !== label) practiceLabel.textContent = label;
    }
    const depthsAction=stop?lowerTransitionLabel(stop)??(stop.id==='depths-tool-chest'?'Open Stores chest':undefined):undefined;
    interactLabel.textContent = depthsAction??(stop ? (stop.transition ? `Enter ${stop.transition === 'workshop' ? 'workshop' : stop.transition==='trail'?'trail':stop.transition==='glasshouse'?'nursery':stop.transition==='mossbank'?'Mossbank':stop.transition==='hidden-valley'?'Hidden Valley':stop.transition==='pumpworks'?'the Pumpworks':stop.transition==='garden'?'allotment':stop.transition==='neighborhood'?'street':'square'}` : 'Inspect') : 'Nothing nearby');
    if(pullValleyPrint)interactLabel.textContent='Pull a cider print';
    if(stop?.id==='lodging-door')interactLabel.textContent='Enter lodging';
    if(stop?.id==='lodging-exit')interactLabel.textContent='Step outside';
    if(stop?.id==='pumpworks-exit')interactLabel.textContent=pumpworksExitLabel;
    if(stop&&orchardAvailable()&&orchardBranchFromStop(stop.id))interactLabel.textContent='Inspect branch';
    if(stop?.id==='trail-gate'&&!scene.bridgeRestored)interactLabel.textContent='Inspect bridge';

    interactButton.setAttribute('aria-label', depthsAction??(pullValleyPrint?'Pull a cider print':stop?.id==='lodging-door'?'Enter boarding house':stop?.id==='lodging-exit'?'Step outside to the square':stop?.id==='pumpworks-exit'?pumpworksExitLabel:stop?.id==='trail-gate'&&!scene.bridgeRestored?'Inspect bridge committee':stop ? (stop.transition ? `Enter ${stop.transition === 'workshop' ? 'workshop' : stop.transition==='trail'?'Inkwood trail':stop.transition==='glasshouse'?'Inkwood Glasshouse':stop.transition==='mossbank'?'Mossbank':stop.transition==='hidden-valley'?'Hidden Valley':stop.transition==='pumpworks'?'the Pumpworks':stop.transition==='garden'?'your allotment':stop.transition==='neighborhood'?'your street':'town square'}` : `Inspect ${stop.name}`) : 'Nothing nearby'));
  }
  // A named stop can be visible while its restored shared position is still syncing.
  // Keep Inspect unavailable until the same input guard would accept its click.
  const disabled = !stop || session.locked || !scene.roomReady;
  if (interactButton.disabled !== disabled) interactButton.disabled = disabled;
  const climate = scene.climateState();
  if (climate) {
    const hour = String(Math.floor(climate.minute / 60)).padStart(2, '0');
    const minute = String(climate.minute % 60).padStart(2, '0');
    const label = (climate.fixture ? 'Lighting study · ' : '') + climate.label + ' · ' + hour + ':' + minute;
    if (sky.textContent !== label) sky.textContent = label;
    if (!sky.isConnected) location.append(sky);
    if (panel.open) {
      const guide = document.querySelector<HTMLElement>('#guide-sky');
      const clockLabel = 'Town time · ' + hour + ':' + minute + ' · ' + climate.label + (climate.fixture ? ' · Lighting study' : '');
      if (guide && guide.textContent !== clockLabel) guide.textContent = clockLabel;
    }
  }
};
window.addEventListener('pagehide',()=>{rememberVisit();save();});
document.addEventListener('visibilitychange', () => { if(document.hidden){rememberVisit();save();}else if(town){needResync=true;session.lock(true);void town.load().catch(()=>{});} });
window.addEventListener('pageshow',event=>{if(event.persisted&&town){needResync=true;session.lock(true);void town.load().catch(()=>{});}});
// Read-only diagnostics for reproducible pilot checks; never an economy/debug mutation API.
Object.defineProperty(window, '__pilot', { value: Object.freeze({
  snapshot: () => session.snapshot(),
  town:()=>town?.snapshot?JSON.parse(JSON.stringify(town.snapshot)):null,
  workshop:()=>workshop.snapshot(),
  pumpworks:()=>pumpworks?.current()??null,
  pumpworksMotion:()=>pumpworks.encounter(),
  sharedField:()=>town?.fieldView??null,
  sharedDepths:()=>town?.depthsView??null,
  metrics: () => {
    const samples = scene.frameSamples.slice().sort((a, b) => a - b);
    return { climate:scene.climateState(), ready, presentation:{menuBackdropPaused:menuRenderPaused,renderedFrames,idleFrameLimit:game.loop.fpsLimit,frameSamplePolicy:'Visible mixed normal and 10Hz idle intervals; modal gaps excluded'}, frameSamples: samples.length, p95FrameMs: samples[Math.floor(samples.length * .95)] ?? null, renderer: game.renderer?.type, renderOptions:{textureSmoothing:game.config.antialias,contextAntialias:game.renderer?.type===Phaser.WEBGL?(game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl.getContextAttributes()?.antialias:null}, phaser: Phaser.VERSION, visual:scene.visualState() };
  },
  screenPoint: (x: number, y: number) => { const c = scene.cameras.main; const p=c.matrixCombined.transformPoint((x+.5)*32,(y+.5)*32);return {x:p.x,y:p.y}; }
}), writable: false });

}
