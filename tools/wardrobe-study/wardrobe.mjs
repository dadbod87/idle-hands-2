const resident = document.querySelector('#resident');
const facing = document.querySelector('#facing');
const activity = document.querySelector('#activity');
const actor = document.querySelector('#actor');
const overlay = document.querySelector('#headwear');
const detail = document.querySelector('#current');
const preview = document.querySelector('#walk');
const status = document.querySelector('#motion');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const directions = ['south','north','east','west'];
const names = {none:'Original look',clerk:'Clerk cap',inkwood:'Inkwood hood'};
const activities = {
 walk: {columns:28, rows:1, stride:7, frames:[1,2,3,4,5,6], interval:100},
 orchard: {columns:4, rows:4, stride:4, frames:[1,2,3], interval:155},
 garden: {columns:24, rows:1, stride:6, frames:[0,1], interval:155},
 saw: {columns:18, rows:2, stride:9, frames:[0,1,2], interval:200},
 serve: {columns:5, rows:4, stride:5, frames:[0,1,2,3,4], interval:145},
};
let playing = 0;

function hat() { return document.querySelector('[name="hat"]:checked').value; }

function show(frame = 0) {
 const garment=hat();
 const mode=activity.value;
 const direction=directions.indexOf(facing.value);
 const sheet=activities[mode];
 const walking=mode==='walk';
 const key = resident.value.toLowerCase() + '-' + (walking?garment:mode);
 const name = resident.value + ' · ' + names[garment];
 const cell=direction*sheet.stride+frame;
 actor.style.backgroundImage = 'url(./sheets/' + key + '.svg)';
 actor.style.backgroundSize=(sheet.columns*128)+'px '+(sheet.rows*160)+'px';
 actor.style.backgroundPosition=-(cell%sheet.columns*128)+'px '+-(Math.floor(cell/sheet.columns)*160)+'px';
 overlay.hidden=walking||garment==='none';
 if(!overlay.hidden){
  overlay.style.backgroundImage='url(./sheets/overlay-'+garment+'.svg)';
  overlay.style.backgroundPositionX=-(direction*7*128)+'px';
 }
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
 preview.textContent=activity.value==='walk'?'Preview walk':'Preview activity';
}

for (const el of [resident,facing,activity,...document.querySelectorAll('[name="hat"]')]) {
 el.addEventListener('change',reset);
}
preview.addEventListener('click',() => {
 stop();
 if (motion.matches) {
  status.textContent = 'Still pose shown for reduced motion.';
  return;
 }
 const sheet=activities[activity.value];
 const isWalk=activity.value==='walk';
 status.textContent = isWalk?'Playing one walk cycle.':'Playing one activity.';
 let cursor=0;
 show(sheet.frames[cursor]);
 playing = setInterval(() => {
  cursor++;
  if (cursor===sheet.frames.length) {
   stop();
   status.textContent = isWalk?'Walk preview complete.':'Activity preview complete.';
  } else show(sheet.frames[cursor]);
 },sheet.interval);
});
motion.addEventListener('change',reset);
document.addEventListener('visibilitychange',()=>{ if (document.hidden) reset(); });
reset();
