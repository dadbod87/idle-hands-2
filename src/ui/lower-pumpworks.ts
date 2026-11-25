import {LOWER_ENEMIES, type LowerClaim, type LowerInput, type LowerReply, type LowerView} from '../game/lower-pumpworks.ts';
import {FIELD_HEALTH} from '../game/pumpworks.ts';

type DepthsUI={
  root:HTMLElement;
  view:()=>LowerView|null;
  canAct:()=>boolean;
  send:(input:LowerInput)=>Promise<LowerReply>;
  message:(message:string)=>void;
};

export function setupDepths({root,view,canAct,send,message}:DepthsUI){
  root.innerHTML=`
    <div class="pump-readout">
      <strong class="pump-control-status" role="status"></strong>
      <div class="pump-health">
        <label><span></span><progress max="${FIELD_HEALTH}" value="${FIELD_HEALTH}"></progress></label>
      </div>
      <progress class="pump-enemy-meter" hidden></progress>
    </div>
    <div class="pump-action-row">
      <button type="button" aria-keyshortcuts="Space">Strike<kbd aria-hidden="true">Space</kbd></button>
      <button type="button" aria-keyshortcuts="Shift">Brace<kbd aria-hidden="true">Shift</kbd></button>
    </div>`;
  const status=root.querySelector<HTMLElement>('.pump-control-status')!;
  const health=root.querySelector<HTMLElement>('.pump-health span')!;
  const meter=root.querySelector<HTMLProgressElement>('.pump-health progress')!;
  const enemyMeter=root.querySelector<HTMLProgressElement>('.pump-enemy-meter')!;
  const [strike,brace]=root.querySelectorAll<HTMLButtonElement>('button');
  let working=false;
  let painted:LowerView|null|undefined;
  let paintedPending=false,paintedAllowed=false;
  const say=(part:HTMLElement,text:string)=>{if(part.textContent!==text)part.textContent=text;};
  async function perform(input:LowerInput){
    if(working||!canAct())return;
    working=true;paint(!root.hidden);
    try{const reply=await send(input);message(reply.message);}
    catch(error){message(error instanceof Error?error.message:'The action was interrupted.');}
    finally{working=false;paint(!root.hidden);}
  }
  function attack(action:'strike'|'brace'){
    const active=view();
    if(!active?.encounter||action==='strike'&&!active.weapon)return;
    return perform({id:crypto.randomUUID(),kind:'combat',encounter:active.encounter,turn:active.turn,action});
  }
  function paint(show:boolean){
    if(root.hidden===show)root.hidden=!show;
    if(!show){painted=undefined;return;}
    const active=view(),allowed=canAct(),phase=active?.enemy?.phase;
    if(painted===active&&paintedPending===working&&paintedAllowed===allowed)return;
    painted=active;paintedPending=working;paintedAllowed=allowed;
    const current=active?.progress.health;
    say(health,current==null?'Health —':'Health '+current+' / '+FIELD_HEALTH);
    if(current==null)meter.removeAttribute('value');else if(meter.value!==current)meter.value=current;
    if(root.dataset.phase!==(phase??'safe'))root.dataset.phase=phase??'safe';
    const enemy=active?.enemy;
    enemyMeter.hidden=!enemy;
    if(enemy){
      if(enemyMeter.max!==enemy.maxHealth)enemyMeter.max=enemy.maxHealth;
      if(enemyMeter.value!==enemy.health)enemyMeter.value=enemy.health;
      const label=LOWER_ENEMIES[enemy.id].name+' health';
      if(enemyMeter.getAttribute('aria-label')!==label)enemyMeter.setAttribute('aria-label',label);
    }
    const ready=active?.room==='pumpworks-sluice'?active.progress.collectorCleared:active?.progress.miteCleared;
    say(status,!active?'Checking the passage…':phase==='windup'?
      (enemy?.warning?.kind==='pressure'?'Pressure burst · step out':'Lunge · move aside'):
      phase==='opening'?(active.collectorCounterUsed?'Shell recovering':'Open to strike'):enemy?LOWER_ENEMIES[enemy.id].name+' chasing':
      ready?(active.room==='pumpworks-sluice'?'Collector defeated':'Filter mite down'):'Explore the passage');
    const label=active?.weapon==='bow'?'Shoot':active?.weapon==='staff'?'Cast':'Strike';
    if(strike.firstChild?.textContent!==label&&strike.firstChild)strike.firstChild.textContent=label;
    strike.disabled=working||!allowed||!phase||!active?.weapon||!!active.drawUntil;
    brace.disabled=working||!allowed||!phase;
  }
  strike.onclick=()=>{void attack('strike');};
  brace.onclick=()=>{void attack('brace');};
  return {paint,attack,rest:()=>perform({id:crypto.randomUUID(),kind:'rest'}),openChest:(kind:LowerClaim)=>perform({id:crypto.randomUUID(),kind})};
}
