const resident = document.querySelector('#resident');
const facing = document.querySelector('#facing');
const actor = document.querySelector('#actor');
const detail = document.querySelector('#current');
const walk = document.querySelector('#walk');
const status = document.querySelector('#motion');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const directions = ['south','north','east','west'];
const names = {none:'Original look',clerk:'Clerk cap',inkwood:'Inkwood hood'};
let playing = 0;

function hat() { return document.querySelector('[name="hat"]:checked').value; }

function show(frame = 0) {
 const key = resident.value.toLowerCase() + '-' + hat();
 const name = resident.value + ' · ' + names[hat()];
 actor.style.backgroundImage = 'url(./sheets/' + key + '.svg)';
 actor.style.backgroundPositionX = -(directions.indexOf(facing.value)*7+frame)*128 + 'px';
 actor.setAttribute('aria-label',name + ' · ' + facing.selectedOptions[0].text);
 actor.dataset.frame = String(frame);
 detail.textContent = name;
}

function stop() {
 if (playing) clearInterval(playing);
 playing = 0;
 show();
}

function reset() {
 stop();
 status.textContent = '';
}

for (const el of [resident,facing,...document.querySelectorAll('[name="hat"]')]) {
 el.addEventListener('change',reset);
}
walk.addEventListener('click',() => {
 stop();
 if (motion.matches) {
  status.textContent = 'Still pose shown for reduced motion.';
  return;
 }
 status.textContent = 'Playing one walk cycle.';
 let frame=1;
 show(frame);
 playing = setInterval(() => {
  if (frame >= 6) {
   stop();
   status.textContent = 'Walk preview complete.';
  } else show(++frame);
 },100);
});
motion.addEventListener('change',reset);
document.addEventListener('visibilitychange',()=>{ if (document.hidden) reset(); });
reset();
