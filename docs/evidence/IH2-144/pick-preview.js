'use strict';

const poses = ['Idle', 'Reach', 'Pick', 'Pocket'];
const facings = ['south', 'north', 'east', 'west'];
const resident = document.querySelector('#resident');
const facing = document.querySelector('#facing');
const scene = document.querySelector('#scene');
const actor = document.querySelector('.actor');
const label = document.querySelector('#pose');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const replay = document.querySelector('#replay');

let pose = 0;
let timer;

function render(next, announce = true) {
 pose = next;
 scene.dataset.pose = poses[pose].toLowerCase();
 scene.dataset.facing = facing.value;
 actor.style.backgroundImage = 'url("sheets/' + resident.value + '-picking.svg")';
 actor.style.backgroundPosition = (-57.6 * pose) + 'px ' + (-72 * facings.indexOf(facing.value)) + 'px';
 if (announce) label.textContent = poses[pose];
}

function stop() {
 clearTimeout(timer);
 timer = undefined;
}

function reset() {
 stop();
 replay.textContent = reducedMotion.matches ? 'Show pick still' : 'Replay pick';
 render(0);
}

function play() {
 stop();
 if (reducedMotion.matches) {
  render(2);
  return;
 }
 render(1, false);
 label.textContent = 'Picking an apple';
 const intervals = [0, 190, 155, 270];
 function advance() {
  timer = setTimeout(() => {
   const next = (pose + 1) % poses.length;
   render(next, next === 0);
   if (next !== 0) advance();
   else timer = undefined;
  }, intervals[pose]);
 }
 advance();
}

resident.addEventListener('change', reset);
facing.addEventListener('change', reset);
reducedMotion.addEventListener('change', reset);
document.addEventListener('visibilitychange', () => {
 if (document.hidden) reset();
});
replay.addEventListener('click', play);
document.querySelector('#next').addEventListener('click', () => {
 stop();
 render((pose + 1) % poses.length);
});
reset();
