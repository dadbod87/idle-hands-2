import { WorldSounds } from '../audio/world-sounds.ts';
import { PlaceMusic, type MusicStatus } from '../audio/place-music.ts';
import { SCORE_NAMES, scoreForLocation } from '../audio/score.ts';
import type { Point, Room } from '../game/world.ts';
import './place-music.css';

const statusText: Record<MusicStatus, string> = {
  off: 'Music is off.',
  preparing: 'Preparing music…',
  playing: 'Playing',
  paused: 'Music paused.',
  unavailable: 'Music could not start. Try again.',
};

const speaker = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path class="sound-waves" d="M15 9q3 3 0 6m3-9q5 6 0 12" fill="none" stroke="currentColor" stroke-width="2"/><path class="sound-slash" d="m15 9 6 6m0-6-6 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

export function mountPlaceMusic({ room, position, settings, compactBefore, quick, body, open }: {
  room: Room;
  position?: Point;
  settings: HTMLButtonElement;
  compactBefore: HTMLButtonElement;
  quick: HTMLButtonElement;
  body: HTMLElement;
  open: () => void;
}) {
  let controls: { root: HTMLElement; status: HTMLElement; play: HTMLButtonElement; level: HTMLOutputElement } | undefined;
  let effectsControls: { button: HTMLButtonElement; level: HTMLOutputElement } | undefined;
  settings.innerHTML = speaker + '<span class="sound-label">Sound</span>';
  const landscape = matchMedia('(min-width: 651px) and (max-height: 480px)');
  const worldNext = settings.nextElementSibling!;
  const moveSoundControl = () => {
    const anchor = landscape.matches ? compactBefore : worldNext;
    if (settings.parentElement === anchor.parentElement) return;
    const hadFocus = document.activeElement === settings;
    anchor.before(settings);
    if (hadFocus) settings.focus({ preventScroll: true });
  };
  landscape.addEventListener('change', moveSoundControl);
  window.addEventListener('pagehide', event => {
    if (!event.persisted) landscape.removeEventListener('change', moveSoundControl);
  });
  moveSoundControl();
  quick.innerHTML = speaker;
  const music = new PlaceMusic(scoreForLocation(room,position), paint);
  const effects = new WorldSounds(paint);
  try {
    const effectLevel = localStorage.getItem('ih2:effects-volume');
    if (effectLevel !== null) effects.setVolume(Number(effectLevel));
    const level = localStorage.getItem('ih2:music-volume');
    if (level !== null) music.setVolume(Number(level));
  } catch { /* Volume can still be changed for this visit. */ }

  function paint() {
    settings.dataset.on = String(music.active || effects.enabled);
    settings.title = music.active || effects.enabled ? 'Sound settings · sound on' : 'Sound settings · sound off';
    quick.hidden = music.status === 'off';
    quick.dataset.on = String(music.active);
    const action = music.active ? 'Pause music' : 'Play music';
    quick.setAttribute('aria-label', action);
    quick.title = action;
    if (!controls?.root.isConnected) return;
    if (effectsControls) {
      effectsControls.button.textContent = effects.enabled ? 'Turn off effects' : effects.error ? 'Retry effects' : 'Turn on effects';
      effectsControls.level.value = Math.round(effects.volume * 100) + '%';
    }
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
      <input id="place-music-volume" type="range" min="0" max="100" step="1">
      <button id="toggle-effects" type="button">Turn on effects</button>
      <label for="effects-volume">Effects volume <output for="effects-volume" aria-hidden="true"></output></label>
      <input id="effects-volume" type="range" min="0" max="100" step="1">`;
    const play = root.querySelector('button')!;
    const range = root.querySelector('input')!;
    range.value = String(Math.round(music.volume * 100));
    controls = { root, status: root.querySelector('p')!, play, level: root.querySelector('output')! };
    play.addEventListener('click', toggle);
    range.addEventListener('input', () => {
      music.setVolume(range.valueAsNumber / 100);
      try { localStorage.setItem('ih2:music-volume', String(music.volume)); } catch { /* Optional preference. */ }
    });
    const effectsButton = root.querySelector<HTMLButtonElement>('#toggle-effects')!;
    const effectsRange = root.querySelector<HTMLInputElement>('#effects-volume')!;
    effectsRange.value = String(Math.round(effects.volume * 100));
    effectsControls = { button: effectsButton, level: root.querySelector('output[for="effects-volume"]')! };
    effectsButton.addEventListener('click', () => void effects.toggle());
    effectsRange.addEventListener('input', () => {
      effects.setVolume(effectsRange.valueAsNumber / 100);
      try { localStorage.setItem('ih2:effects-volume', String(effects.volume)); } catch { /* Optional preference. */ }
    });
    body.append(root);
    paint();
  });
  const pause = () => {
    music.pause();
    effects.disable();
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  });
  window.addEventListener('pagehide', pause);
  paint();

  return {
    setLocation: (nextRoom:Room,nextPosition?:Point) => music.setPlace(scoreForLocation(nextRoom,nextPosition,music.score)),
    pause,
    cue: (cue: Parameters<WorldSounds['play']>[0]) => effects.play(cue),
  };
}
