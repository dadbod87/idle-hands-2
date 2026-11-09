import Phaser from 'phaser';
import { Session } from './game/session.ts';
import { worlds, type Stop } from './game/world.ts';
import { WorldScene } from './phaser/WorldScene.ts';
import './ui/style.css';

const saveKey = 'ih2:pilot-position:v1';
let stored: unknown;
try { stored = JSON.parse(localStorage.getItem(saveKey) ?? 'null'); } catch { stored = null; }
const session = new Session(stored);
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<main class="shell">
 <header><div class="brand-mark" aria-hidden="true">II</div><div class="brand"><p class="eyebrow">THE PATRON GROUP · A NEW CHAPTER</p><h1>Idle Hands <span>2</span></h1></div><div class="pilot-tag">NEIGHBORHOOD PILOT<span>Local only · placeholder art</span></div></header>
 <section class="world-wrap" aria-label="Neighborhood playfield"><div id="world"></div><div class="location-tag" id="location">Town square<span>Under new mismanagement.</span></div><p class="world-note" id="instructions">Tap the floor to walk.<span>WASD / arrows · E to interact</span></p><p class="boot" id="boot" role="status">Opening the town. Finding the keys.</p></section>
 <footer><div class="context"><span class="eyebrow">FIELD NOTES</span><p id="feedback" role="status" aria-live="polite">A small beginning. Room for a much bigger story.</p></div><nav aria-label="Game controls"><button id="places"><span aria-hidden="true">⌖</span> Places</button><button id="interact" class="primary" disabled>Nothing nearby</button></nav></footer>
</main>
<dialog id="panel" aria-labelledby="panel-title"><form method="dialog"><header class="dialog-head"><div><p class="eyebrow">TOWN INFORMATION SERVICES</p><h2 id="panel-title">Places to go</h2></div><button aria-label="Close panel" value="close">×</button></header><div id="panel-body"></div></form></dialog>`;
const panel = document.querySelector<HTMLDialogElement>('#panel')!;
const title = document.querySelector<HTMLElement>('#panel-title')!;
const body = document.querySelector<HTMLDivElement>('#panel-body')!;
const feedback = document.querySelector<HTMLElement>('#feedback')!;
const interactButton = document.querySelector<HTMLButtonElement>('#interact')!;
const location = document.querySelector<HTMLElement>('#location')!;
const scene = new WorldScene(session);
const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'world', backgroundColor: '#a3b090',
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, pixelArt: false }, audio: { noAudio: true },
  fps: { target: 60 }, scene: [scene]
});
let ready = false;
let lastContext = '';
function save() { try { localStorage.setItem(saveKey, JSON.stringify(session.save())); } catch { feedback.textContent = 'Position could not be saved in this browser. The pilot remains playable.'; } }
function focusWorld() { document.querySelector('canvas')?.focus(); }
function closePanel() { if (session.locked) session.lock(false); panel.close(); focusWorld(); }
panel.addEventListener('submit', event => { event.preventDefault(); closePanel(); });
panel.addEventListener('close', () => { if (session.locked) session.lock(false); focusWorld(); });
panel.addEventListener('cancel', () => { session.lock(false); });
function openPanel(heading: string) { session.lock(true); title.textContent = heading; body.replaceChildren(); panel.showModal(); }
function paragraph(text: string) { const p = document.createElement('p'); p.textContent = text; return p; }
document.querySelector('#places')!.addEventListener('click', () => {
  openPanel('Places to go');
  body.append(paragraph('Pick a stop. Your employee will walk there; you can inspect it when you arrive.'));
  for (const stop of worlds[session.room].stops) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'destination';
    button.textContent = stop.name + ' →'; button.dataset.destination = stop.id;
    button.addEventListener('click', () => { closePanel(); session.lock(false); session.walk(stop.point); feedback.textContent = `Walking to ${stop.name}.`; });
    body.append(button);
  }
});
function activate(stop: Stop) {
  if (stop.transition) {
    session.enter(stop.transition, stop.arrival); save(); focusWorld(); feedback.textContent = stop.transition === 'workshop' ? 'Your workshop. A place to make things, eventually.' : 'Back in the square. The committee has made no measurable progress.';
  } else {
    openPanel(stop.name); body.append(paragraph(stop.text));
    const note = paragraph('Prototype note: this is a local interaction test. No purchases, resources or shared progress are implemented.'); note.className = 'disclosure'; body.append(note);
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
  if (!ready) {
    ready = true; document.querySelector('#boot')?.remove();
    const canvas = document.querySelector('canvas')!; canvas.tabIndex = 0; canvas.setAttribute('aria-label', 'Walkable neighborhood. Use Places for named destinations.'); canvas.setAttribute('aria-describedby', 'instructions'); focusWorld();
  }
  const arrival = session.takeArrival();
  if (arrival) activate(arrival);
  const stop = session.nearby();
  const state = session.room + ':' + (stop?.id ?? '');
  if (state !== lastContext) {
    lastContext = state;
    location.innerHTML = session.room === 'square' ? 'Town square<span>Under new mismanagement.</span>' : 'Your workshop<span>Great things take time.</span>';
    interactButton.textContent = stop ? (stop.transition ? `Enter ${stop.transition === 'workshop' ? 'workshop' : 'square'}` : 'Inspect') : 'Nothing nearby';
    interactButton.disabled = !stop;
    interactButton.setAttribute('aria-label', stop ? (stop.transition ? `Enter ${stop.transition === 'workshop' ? 'workshop' : 'town square'}` : `Inspect ${stop.name}`) : 'Nothing nearby');
  }
};
window.addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
// Read-only diagnostics for reproducible pilot checks; never an economy/debug mutation API.
Object.defineProperty(window, '__pilot', { value: Object.freeze({
  snapshot: () => session.snapshot(),
  metrics: () => {
    const samples = scene.frameSamples.slice().sort((a, b) => a - b);
    return { ready, frameSamples: samples.length, p95FrameMs: samples[Math.floor(samples.length * .95)] ?? null, renderer: game.renderer?.type, phaser: Phaser.VERSION };
  },
  screenPoint: (x: number, y: number) => { const c = scene.cameras.main; return { x: (x + .5) * 32 - c.scrollX, y: (y + .5) * 32 - c.scrollY }; }
}), writable: false });
