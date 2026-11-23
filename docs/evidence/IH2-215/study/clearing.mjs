import {createEncounter, encounterAction, HEALTH, INSPECTOR_HEALTH} from './encounter.mjs';

const node=selector=>document.querySelector(selector);
const scene=node('.scene'), status=node('#status'), deadline=node('#deadline'), result=node('#result');
const controls=[...document.querySelectorAll('[data-action]')];
const hud={
 health:node('#health'), healthLabel:node('#health-label'),
 enemy:node('#enemy'), enemyLabel:node('#enemy-label'), enemyMeter:node('.enemy-meter'),
 warning:node('.cue'), timeControls:node('#time-controls'), expire:node('#expire'),
 recover:node('[data-action=recover]'),
};
const actions={
 trail:['enter','rest'], clearing:['swing','guard','snack','retreat'],
 bed:['back'], recovery:['recover'], cleared:[], recovered:[], expired:[],
};
const resultLabels={
 cleared:'Clearing passed · No game items awarded',
 recovered:'Field sample recovered',
 expired:'Recovery choice pending',
};
let state=createEncounter(), timeOffset=0;
const demoTime=()=>Date.now()+timeOffset;

function updateTime() {
 if (state.phase!=='bed' && state.phase!=='recovery') return;
 const elapsed=demoTime()>state.recoverUntil;
 const remaining=Math.max(0, Math.ceil((state.recoverUntil-demoTime())/1000));
 const value=remaining?
  'Recover before '+Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0'):
  elapsed?'Recovery window ended':'Recovery at deadline';
 if(deadline.textContent!==value)deadline.textContent=value;
 const label=elapsed?'Check late return':'Recover your pouch';
 if(hud.recover.textContent!==label)hud.recover.textContent=label;
}

function render() {
 scene.dataset.phase=state.phase;
 scene.dataset.warning=String(state.warning);
 hud.health.value=state.health;
 hud.healthLabel.textContent=state.health+' / '+HEALTH;
 hud.enemy.value=state.inspector;
 hud.enemyLabel.textContent=state.inspector+' / '+INSPECTOR_HEALTH;
 hud.enemyMeter.hidden=state.phase!=='clearing'&&state.phase!=='cleared';
 hud.warning.hidden=!state.warning;
 status.textContent=state.message;
 deadline.hidden=state.phase!=='bed'&&state.phase!=='recovery';
 result.hidden=!resultLabels[state.phase];
 result.textContent=resultLabels[state.phase]??'';
 hud.timeControls.hidden=state.phase!=='recovery';
 hud.expire.disabled=state.phase!=='recovery';
 controls.forEach(button=>{
  const action=button.dataset.action;
  button.hidden=!actions[state.phase].includes(action)||(action==='rest'&&state.health===HEALTH);
  if(action==='snack'){
   button.disabled=state.snacks===0;
   button.textContent=state.snacks===0?'No snack':'Snack +4';
   button.setAttribute('aria-label',state.snacks===0?'No snack left':state.health===HEALTH?'Snack unavailable at full health':'Eat snack to restore 4 health');
   button.setAttribute('aria-disabled',String(state.snacks===0||state.health===HEALTH));
  }
 });
 updateTime();
}

function use(action, from) {
 if(action==='reset')timeOffset=0;
 const previous=state;
 state=encounterAction(state,action,demoTime());
 if(state===previous)return;
 render();
 if(from&&(from.hidden||from.disabled)){
  const next=controls.find(button=>!button.hidden&&!button.disabled);
  (next??result).focus({preventScroll:true});
 }
}

controls.forEach(button=>button.addEventListener('click',()=>use(button.dataset.action,button)));
node('#reset').addEventListener('click',()=>use('reset'));
hud.expire.addEventListener('click',()=>{
 timeOffset+=31*60*1000;
 render();
 hud.recover.focus();
});
window.setInterval(updateTime,1000);
render();
