const faces=['south','north','east','west'],poses=['ready','reach','contact','recovery','idle'];
const facing=document.querySelector('#facing'),pose=document.querySelector('#pose'),family=document.querySelector('.family'),actors=[...document.querySelectorAll('.actor')],status=document.querySelector('#status'),reduce=document.querySelector('#reduce'),media=matchMedia('(prefers-reduced-motion: reduce)');
let generation=0,timers=[],loaded=false;
function setPose(column){const row=faces.indexOf(facing.value);for(const actor of actors){actor.style.backgroundPosition=`${-column*57.6}px ${-row*72}px`;actor.dataset.column=String(column);actor.dataset.row=String(row);actor.setAttribute('aria-label',`${actor.dataset.rig}, ${facing.value}-facing, ${poses[column]}`);}pose.value=String(column);}
function cancel(message){generation++;timers.forEach(clearTimeout);timers=[];setPose(4);if(message)status.textContent=message;}
document.querySelector('#replay').addEventListener('click',()=>{cancel();if(!loaded){status.textContent='Artwork is not ready. Refresh to try again.';return;}if(reduce.checked||media.matches){status.textContent='Still images only. Choose a pose to inspect it.';return;}const token=generation;setPose(0);status.textContent='Previewing one short serving gesture.';[160,340,520,720].forEach((ms,i)=>timers.push(setTimeout(()=>{if(token!==generation||document.hidden)return;setPose(i+1);if(i===3){timers=[];status.textContent='Gesture finished. Back at rest.';}},ms)));});
document.querySelector('#contact').addEventListener('click',()=>{cancel();setPose(2);status.textContent='Serve pose. Still image for inspection.';});
pose.addEventListener('change',()=>{const next=Number(pose.value);cancel();setPose(next);status.textContent='Still pose for inspection.';});
facing.addEventListener('change',()=>cancel('Direction changed. Back at rest.'));
document.querySelector('#background').addEventListener('change',event=>{family.dataset.background=event.target.value;});
reduce.addEventListener('change',()=>cancel('Motion preference changed. Back at rest.'));media.addEventListener('change',()=>cancel('System motion preference changed. Back at rest.'));
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel('Preview paused. Back at rest.');});
document.querySelector('#enlarge').addEventListener('change',event=>{family.classList.toggle('enlarged',event.target.checked);});
document.querySelector('#anchors').addEventListener('change',event=>{document.querySelectorAll('.anchor').forEach(anchor=>anchor.hidden=!event.target.checked);});
Promise.all(actors.map(actor=>new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=reject;image.src=`${actor.dataset.rig}-serving.svg`;}))).then(()=>{loaded=true;family.dataset.loaded='true';document.querySelector('#replay').disabled=false;}).catch(()=>cancel('Artwork could not load. Refresh to try again.'));
setPose(4);
