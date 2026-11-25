import type {LowerInput, LowerReply, LowerView} from '../game/lower-pumpworks.ts';
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
    </div>
    <div class="pump-action-row">
      <button type="button" aria-keyshortcuts="Space">Strike<kbd aria-hidden="true">Space</kbd></button>
      <button type="button" aria-keyshortcuts="Shift">Brace<kbd aria-hidden="true">Shift</kbd></button>
    </div>`;
  const status=root.querySelector<HTMLElement>('.pump-control-status')!;
  const health=root.querySelector<HTMLElement>('.pump-health span')!;
  const meter=root.querySelector<HTMLProgressElement>('progress')!;
  const [strike,brace]=root.querySelectorAll<HTMLButtonElement>('button');
  let working=false;
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
    root.hidden=!show;
    if(!show)return;
    const active=view(),phase=active?.enemy?.phase;
    const current=active?.progress.health;
    say(health,current==null?'Health —':'Health '+current+' / '+FIELD_HEALTH);
    if(current==null)meter.removeAttribute('value');else if(meter.value!==current)meter.value=current;
    if(root.dataset.phase!==phase)root.dataset.phase=phase??'safe';
    say(status,!active?'Checking the passage…':phase==='windup'?'Lunge · move aside':phase==='opening'?'Open to strike':
      phase==='chase'?'Filter mite chasing':active.progress.miteCleared?'Filter mite down':'Explore the passage');
    const label=active?.weapon==='bow'?'Shoot':active?.weapon==='staff'?'Cast':'Strike';
    if(strike.firstChild?.textContent!==label&&strike.firstChild)strike.firstChild.textContent=label;
    strike.disabled=working||!canAct()||!phase||!active?.weapon||!!active.drawUntil;
    brace.disabled=working||!canAct()||!phase;
  }
  strike.onclick=()=>{void attack('strike');};
  brace.onclick=()=>{void attack('brace');};
  return {paint,attack,toolChest:()=>perform({id:crypto.randomUUID(),kind:'tool-chest'})};
}
