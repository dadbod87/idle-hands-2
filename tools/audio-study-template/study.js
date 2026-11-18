/* Original study-only controls. No storage, game commands or network API. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const clock = value => Math.floor(value / 60) + ':' + String(Math.floor(value % 60)).padStart(2, '0');
  let tick;
  const audition = new window.IH2Audition.AudioAudition(window.IH2Score, {changed: render});
  function progress() {
    const s = audition.snapshot();
    byId('progress').max = s.duration || 1; byId('progress').value = s.elapsed;
    byId('time').textContent = clock(s.elapsed) + (s.duration ? ' / ' + clock(s.duration) : '');
    if (s.mode === 'playing' && !document.hidden) tick = setTimeout(progress, 250);
  }
  function render() {
    const s = audition.snapshot(), theme = window.IH2Score.THEMES.find(t => t.id === s.selected);
    clearTimeout(tick);
    for (const b of document.querySelectorAll('[data-theme]')) b.setAttribute('aria-pressed', String(b.dataset.theme === s.selected));
    byId('track-title').textContent = theme.title; byId('track-note').textContent = theme.note;
    byId('play').textContent = s.mode === 'playing' ? 'Pause music' : s.mode === 'preparing' ? 'Cancel' : 'Play music';
    byId('play').disabled = s.muted || s.hidden;
    byId('mute').setAttribute('aria-pressed', String(s.muted)); byId('mute').textContent = s.muted ? 'Unmute' : 'Mute all';
    for (const b of document.querySelectorAll('[data-accent]')) b.disabled = s.muted || s.hidden;
    if (byId('status').textContent !== s.message) byId('status').textContent = s.message;
    byId('music-value').textContent = Math.round(s.musicVolume * 100) + '%';
    byId('effects-value').textContent = Math.round(s.effectsVolume * 100) + '%';
    progress();
  }
  for (const b of document.querySelectorAll('[data-theme]')) b.addEventListener('click', () => audition.select(b.dataset.theme));
  for (const b of document.querySelectorAll('[data-accent]')) b.addEventListener('click', () => void audition.accent(b.dataset.accent));
  byId('play').addEventListener('click', () => audition.mode === 'playing' || audition.mode === 'preparing' ? audition.pauseMusic() : void audition.play());
  byId('mute').addEventListener('click', () => audition.mute(!audition.muted));
  byId('music-volume').addEventListener('input', e => audition.volume('music', Number(e.target.value) / 100));
  byId('effects-volume').addEventListener('input', e => audition.volume('effects', Number(e.target.value) / 100));
  document.addEventListener('visibilitychange', () => audition.setHidden(document.hidden));
  addEventListener('pagehide', e => {audition.setHidden(true); if (!e.persisted) void audition.close();});
  addEventListener('pageshow', () => audition.setHidden(document.hidden));
  const textSize = () => document.body.classList.toggle('large-text', parseFloat(getComputedStyle(document.documentElement).fontSize) > 20);
  new ResizeObserver(textSize).observe(document.documentElement); textSize();
  // Controlled auxiliary visibility tests are distinct from native tab/device behavior.
  window.__audioStudy = {state: () => audition.snapshot(), setHidden: value => audition.setHidden(value), close: () => audition.close()};
  render();
})();
