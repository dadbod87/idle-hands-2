const faces=['south','north','east','west'];
const poses=['ready','reach','contact','recovery','idle'];
const facing=document.querySelector('#facing');
const pose=document.querySelector('#pose');
const actor=document.querySelector('.actor');
const sample=document.querySelector('.sample');
const status=document.querySelector('#status');
const reduce=document.querySelector('#reduce');
const media=matchMedia('(prefers-reduced-motion: reduce)');
let timers=[];
let generation=0;
let loaded=false;
function setPose(column){
 const row=faces.indexOf(facing.value);
 actor.style.backgroundPosition=`${-column*57.6}px ${-row*72}px`;
 actor.dataset.column=String(column);
 actor.dataset.row=String(row);
 actor.setAttribute('aria-label',`Aster, ${facing.value}-facing, ${poses[column]}`);
 pose.value=String(column);
}
function cancel(message){generation++;timers.forEach(clearTimeout);timers=[];setPose(4);if(message)status.textContent=message;}
function stillOnly(){return reduce.checked||media.matches;}
document.querySelector('#replay').addEventListener('click',()=>{
 cancel();
 if(!loaded){status.textContent='The artwork is not ready. Please try again.';return;}
 if(stillOnly()){status.textContent='Still images only. Choose a pose to inspect it.';return;}
 const token=generation;
 setPose(0);status.textContent='Previewing one short serving gesture.';
 [160,340,520,720].forEach((ms,i)=>timers.push(setTimeout(()=>{
  if(token!==generation||document.hidden)return;
  setPose(i+1);
  if(i===3){timers=[];status.textContent='Gesture finished. Back at rest.';}
 },ms)));
});
document.querySelector('#contact').addEventListener('click',()=>{cancel();setPose(2);status.textContent='Serve pose. Still image for inspection.';});
pose.addEventListener('change',()=>{const column=Number(pose.value);cancel();setPose(column);status.textContent='Still pose for inspection.';});
facing.addEventListener('change',()=>{sample.dataset.facing=facing.value;cancel('Direction changed. Back at rest.');});
reduce.addEventListener('change',()=>cancel('Motion preference changed. Back at rest.'));
media.addEventListener('change',()=>cancel('System motion preference changed. Back at rest.'));
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel('Preview paused. Back at rest.');});
document.querySelector('#enlarge').addEventListener('change',event=>{sample.classList.toggle('enlarged',event.target.checked);document.querySelector('.scale-label').textContent=event.target.checked?'Enlarged 2× · inspection only':'Game size · Aster';});
document.querySelector('#anchors').addEventListener('change',event=>{document.querySelector('.anchor').hidden=!event.target.checked;});
const artwork=new Image();
artwork.onload=()=>{loaded=true;};
artwork.onerror=()=>{cancel('The artwork could not load. Refresh to try again.');};
artwork.src='aster-serving.svg';
setPose(4);
