/* Original standalone study; generated from src/design/audio-audition.ts. */
(()=>{
/** Standalone, explicit-gesture audition controller. No game, storage or API calls. */


class AudioAudition {
  selected = 'town'; mode       = 'idle'; message = 'Ready when you are.';
  musicVolume = .3; effectsVolume = .25; muted = false; hidden = false;
          score       ;         factory                    ;         changed            ;
          defer                     ;         context               ;
          musicGain           ;         effectsGain           ;
          music                        ;         effect                        ;
          buffers = new Map                     ();
          musicEpoch = 0;         effectEpoch = 0;         startedAt = 0;
          elapsed = 0;         duration = 0;         disposed = false;
  constructor(score       , options                                                                                    = {}) {
    this.score = score; this.factory = options.factory ?? (() => new AudioContext());
    this.changed = options.changed ?? (() => {});
    this.defer = options.defer ?? (() => new Promise(resolve => setTimeout(resolve, 0)));
  }
          update() {if (!this.disposed) this.changed();}
          ensure() {
    if (this.disposed) throw Error('This audition is closed.');
    if (!this.context || this.context.state === 'closed') {
      const context = this.factory(); this.context = context;
      this.musicGain = context.createGain(); this.effectsGain = context.createGain();
      this.musicGain.connect(context.destination); this.effectsGain.connect(context.destination);
      this.musicGain.gain.value = this.musicVolume; this.effectsGain.gain.value = this.effectsVolume;
      context.onstatechange = () => {
        if (context !== this.context || this.disposed) return;
        if (context.state !== 'running' && (this.music || this.effect)) {
          this.pauseAll(); this.message = 'Sound paused. Press Play when you’re ready.';
        }
        this.update();
      };
    }
    return this.context;
  }
          stop(node                        ) {if (node) {node.onended = null; try {node.stop();} catch {/* Already ended. */} node.disconnect();}}
          stopMusic() {
    this.musicEpoch++; if (this.music && this.context) this.elapsed = Math.min(this.duration, this.context.currentTime - this.startedAt);
    this.stop(this.music); this.music = undefined;
  }
          stopEffect() {this.effectEpoch++; this.stop(this.effect); this.effect = undefined;}
          quietIfIdle() {
    if (!this.music && !this.effect && this.mode !== 'preparing' && this.context?.state === 'running') void this.context.suspend().catch(() => {});
  }
  select(id        ) {
    if (!this.score.THEMES.some(t => t.id === id)) throw Error('Unknown original theme.');
    if (id === this.selected) return;
    this.stopMusic(); this.selected = id; this.elapsed = 0; this.duration = 0; this.mode = 'idle';
    this.message = 'Press Play to hear this place.'; this.quietIfIdle(); this.update();
  }
          block() {return this.disposed || this.muted || this.hidden;}
  async play() {
    if (this.block()) return;
    this.stopMusic(); const epoch = this.musicEpoch, id = this.selected;
    this.mode = 'preparing'; this.message = 'Preparing music…'; this.update();
    try {
      const context = this.ensure(); await context.resume(); await this.defer();
      if (epoch !== this.musicEpoch || this.block()) {if (this.hidden || this.muted || !this.music && !this.effect && this.mode !== 'preparing') await context.suspend(); return;}
      let buffer = this.buffers.get(id);
      if (!buffer) {
        const samples = this.score.renderTheme(id); buffer = context.createBuffer(1, samples.length, this.score.AUDIO_RATE);
        buffer.copyToChannel(samples, 0); this.buffers.set(id, buffer);
        while (this.buffers.size > 2) this.buffers.delete(this.buffers.keys().next().value );
      } else {this.buffers.delete(id); this.buffers.set(id, buffer);}
      if (epoch !== this.musicEpoch || this.block()) return;
      const node = context.createBufferSource(); node.buffer = buffer; node.connect(this.musicGain );
      this.music = node; this.duration = buffer.duration; this.elapsed = 0; this.startedAt = context.currentTime;
      node.onended = () => {
        node.disconnect();
        if (this.music !== node) return;
        this.music = undefined; this.elapsed = this.duration; this.mode = 'idle';
        this.message = 'Sketch finished.'; this.quietIfIdle(); this.update();
      };
      node.start(); this.mode = 'playing'; this.message = 'Playing ' + this.score.THEMES.find(t => t.id === id) .place + '.'; this.update();
    } catch {
      if (epoch !== this.musicEpoch || this.disposed) return;
      this.stopMusic(); this.mode = 'error'; this.message = 'Sound didn’t start. Press Play to retry.'; this.quietIfIdle(); this.update();
    }
  }
  pauseMusic() {this.stopMusic(); this.mode = 'paused'; this.message = 'Paused. Play starts again.'; this.quietIfIdle(); this.update();}
  pauseAll() {this.pauseMusic(); this.stopEffect(); this.quietIfIdle(); this.update();}
  async accent(id        ) {
    if (!this.score.ACCENTS.some(a => a.id === id)) throw Error('Unknown original accent.');
    if (this.block()) return;
    this.stopEffect(); const epoch = this.effectEpoch;
    try {
      const context = this.ensure(); await context.resume();
      if (epoch !== this.effectEpoch || this.block()) {if (this.hidden || this.muted || !this.music && !this.effect && this.mode !== 'preparing') await context.suspend(); return;}
      const samples = this.score.renderAccent(id), buffer = context.createBuffer(1, samples.length, this.score.AUDIO_RATE);
      buffer.copyToChannel(samples, 0);
      const node = context.createBufferSource(); node.buffer = buffer; node.connect(this.effectsGain ); this.effect = node;
      node.onended = () => {node.disconnect(); if (this.effect === node) this.effect = undefined; this.quietIfIdle(); this.update();};
      node.start(); this.update();
    } catch {if (epoch === this.effectEpoch && !this.disposed) {this.message = 'That sound didn’t start. Try again.'; this.quietIfIdle(); this.update();}}
  }
  volume(kind                     , value        ) {
    if (!Number.isFinite(value) || value < 0 || value > 1) throw Error('Volume must be between zero and one.');
    if (kind === 'music') {this.musicVolume = value; if (this.musicGain) this.musicGain.gain.value = value;}
    else {this.effectsVolume = value; if (this.effectsGain) this.effectsGain.gain.value = value;}
    this.update();
  }
  mute(value         ) {
    this.muted = value;
    if (value) {this.pauseAll(); this.message = 'All sound muted.'; void this.context?.suspend().catch(() => {});}
    else this.message = 'Unmuted. Press Play to listen.';
    this.update();
  }
  setHidden(value         ) {
    this.hidden = value;
    if (value) {this.pauseAll(); this.message = 'Paused while away. Press Play again.'; void this.context?.suspend().catch(() => {});}
    this.update();
  }
  snapshot() {
    return {selected: this.selected, mode: this.mode, message: this.message, muted: this.muted, hidden: this.hidden,
      musicVolume: this.musicVolume, effectsVolume: this.effectsVolume, contextState: this.context?.state ?? 'none',
      appliedMusicGain: this.musicGain?.gain.value ?? null, appliedEffectsGain: this.effectsGain?.gain.value ?? null,
      musicVoices: Number(!!this.music), effectVoices: Number(!!this.effect), cachedThemes: this.buffers.size,
      cachedBytes: [...this.buffers.values()].reduce((n,b) => n+b.length*4,0),
      elapsed: this.music && this.context ? Math.min(this.duration,this.context.currentTime-this.startedAt) : this.elapsed,
      duration: this.duration};
  }
  async close() {
    this.pauseAll(); this.disposed = true; this.buffers.clear();
    if (this.context) {this.context.onstatechange = null; if (this.context.state !== 'closed') await this.context.close();}
  }
}

window.IH2Audition={AudioAudition};})();
