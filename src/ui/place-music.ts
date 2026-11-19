import { PlaceMusic, type MusicStatus } from '../audio/place-music.ts';
import { SCORE_NAMES, scoreForRoom } from '../audio/score.ts';
import type { Room } from '../game/world.ts';
import './place-music.css';

const statusText: Record<MusicStatus, string> = {
  off: 'Music is off.',
  preparing: 'Preparing music…',
  playing: 'Playing',
  paused: 'Music paused.',
  unavailable: 'Music could not start. Try again.',
};

const speaker = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path class="sound-waves" d="M15 9q3 3 0 6m3-9q5 6 0 12" fill="none" stroke="currentColor" stroke-width="2"/><path class="sound-slash" d="m15 9 6 6m0-6-6 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

export function mountPlaceMusic({ room, settings, quick, body, open }: {
  room: Room;
  settings: HTMLButtonElement;
  quick: HTMLButtonElement;
  body: HTMLElement;
  open: () => void;
}) {
  let controls: { root: HTMLElement; status: HTMLElement; play: HTMLButtonElement; level: HTMLOutputElement } | undefined;
  settings.innerHTML = speaker + '<span class="sound-label">Sound</span>';
  quick.innerHTML = speaker;
  const music = new PlaceMusic(scoreForRoom(room), paint);
  try {
    const level = localStorage.getItem('ih2:music-volume');
    if (level !== null) music.setVolume(Number(level));
  } catch { /* Volume can still be changed for this visit. */ }

  function paint() {
    settings.dataset.on = String(music.active);
    settings.title = music.active ? 'Sound settings · music on' : 'Sound settings · music off';
    quick.hidden = music.status === 'off';
    quick.dataset.on = String(music.active);
    const action = music.active ? 'Pause music' : 'Play music';
    quick.setAttribute('aria-label', action);
    quick.title = action;
    if (!controls?.root.isConnected) return;
    controls.play.textContent = action;
    const status = music.status === 'playing'
      ? 'Playing · ' + SCORE_NAMES[music.score] : statusText[music.status];
    if (controls.status.textContent !== status) controls.status.textContent = status;
    controls.level.value = Math.round(music.volume * 100) + '%';
  }

  function toggle() {
    if (music.active) music.pause();
    else void music.play();
  }
  quick.addEventListener('click', toggle);
  settings.addEventListener('click', () => {
    open();
    const root = document.createElement('section');
    root.className = 'place-music-controls';
    root.innerHTML = `<p role="status"></p><button type="button" class="primary"></button>
      <label for="place-music-volume">Music volume <output for="place-music-volume" aria-hidden="true"></output></label>
      <input id="place-music-volume" type="range" min="0" max="100" step="1">`;
    const play = root.querySelector('button')!;
    const range = root.querySelector('input')!;
    range.value = String(Math.round(music.volume * 100));
    controls = { root, status: root.querySelector('p')!, play, level: root.querySelector('output')! };
    play.addEventListener('click', toggle);
    range.addEventListener('input', () => {
      music.setVolume(range.valueAsNumber / 100);
      try { localStorage.setItem('ih2:music-volume', String(music.volume)); } catch { /* Optional preference. */ }
    });
    body.append(root);
    paint();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) music.pause();
  });
  window.addEventListener('pagehide', () => music.pause());
  paint();

  return {
    setRoom: (nextRoom: Room) => music.setPlace(scoreForRoom(nextRoom)),
    pause: () => music.pause(),
  };
}
