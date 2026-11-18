/** Standalone, explicit-gesture audition controller. No game, storage or API calls. */
type Score = typeof import('./audio-sketch.ts');
type Mode = 'idle' | 'preparing' | 'playing' | 'paused' | 'error';
export class AudioAudition {
  selected = 'town'; mode: Mode = 'idle'; message = 'Ready when you are.';
  musicVolume = .3; effectsVolume = .25; muted = false; hidden = false;
  private score: Score; private factory: () => AudioContext; private changed: () => void;
  private defer: () => Promise<void>; private context?: AudioContext;
  private musicGain?: GainNode; private effectsGain?: GainNode;
  private music?: AudioBufferSourceNode; private effect?: AudioBufferSourceNode;
  private buffers = new Map<string, AudioBuffer>();
  private musicEpoch = 0; private effectEpoch = 0; private startedAt = 0;
  private elapsed = 0; private duration = 0; private disposed = false;
  constructor(score: Score, options: {factory?: () => AudioContext; changed?: () => void; defer?: () => Promise<void>} = {}) {
    this.score = score; this.factory = options.factory ?? (() => new AudioContext());
    this.changed = options.changed ?? (() => {});
    this.defer = options.defer ?? (() => new Promise(resolve => setTimeout(resolve, 0)));
  }
  private update() {if (!this.disposed) this.changed();}
  private ensure() {
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
  private stop(node?: AudioBufferSourceNode) {if (node) {node.onended = null; try {node.stop();} catch {/* Already ended. */} node.disconnect();}}
  private stopMusic() {
    this.musicEpoch++; if (this.music && this.context) this.elapsed = Math.min(this.duration, this.context.currentTime - this.startedAt);
    this.stop(this.music); this.music = undefined;
  }
  private stopEffect() {this.effectEpoch++; this.stop(this.effect); this.effect = undefined;}
  private quietIfIdle() {
    if (!this.music && !this.effect && this.mode !== 'preparing' && this.context?.state === 'running') void this.context.suspend().catch(() => {});
  }
  select(id: string) {
    if (!this.score.THEMES.some(t => t.id === id)) throw Error('Unknown original theme.');
    if (id === this.selected) return;
    this.stopMusic(); this.selected = id; this.elapsed = 0; this.duration = 0; this.mode = 'idle';
    this.message = 'Press Play to hear this place.'; this.quietIfIdle(); this.update();
  }
  private block() {return this.disposed || this.muted || this.hidden;}
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
        while (this.buffers.size > 2) this.buffers.delete(this.buffers.keys().next().value!);
      } else {this.buffers.delete(id); this.buffers.set(id, buffer);}
      if (epoch !== this.musicEpoch || this.block()) return;
      const node = context.createBufferSource(); node.buffer = buffer; node.connect(this.musicGain!);
      this.music = node; this.duration = buffer.duration; this.elapsed = 0; this.startedAt = context.currentTime;
      node.onended = () => {
        node.disconnect();
        if (this.music !== node) return;
        this.music = undefined; this.elapsed = this.duration; this.mode = 'idle';
        this.message = 'Sketch finished.'; this.quietIfIdle(); this.update();
      };
      node.start(); this.mode = 'playing'; this.message = 'Playing ' + this.score.THEMES.find(t => t.id === id)!.place + '.'; this.update();
    } catch {
      if (epoch !== this.musicEpoch || this.disposed) return;
      this.stopMusic(); this.mode = 'error'; this.message = 'Sound didn’t start. Press Play to retry.'; this.quietIfIdle(); this.update();
    }
  }
  pauseMusic() {this.stopMusic(); this.mode = 'paused'; this.message = 'Paused. Play starts again.'; this.quietIfIdle(); this.update();}
  pauseAll() {this.pauseMusic(); this.stopEffect(); this.quietIfIdle(); this.update();}
  async accent(id: string) {
    if (!this.score.ACCENTS.some(a => a.id === id)) throw Error('Unknown original accent.');
    if (this.block()) return;
    this.stopEffect(); const epoch = this.effectEpoch;
    try {
      const context = this.ensure(); await context.resume();
      if (epoch !== this.effectEpoch || this.block()) {if (this.hidden || this.muted || !this.music && !this.effect && this.mode !== 'preparing') await context.suspend(); return;}
      const samples = this.score.renderAccent(id), buffer = context.createBuffer(1, samples.length, this.score.AUDIO_RATE);
      buffer.copyToChannel(samples, 0);
      const node = context.createBufferSource(); node.buffer = buffer; node.connect(this.effectsGain!); this.effect = node;
      node.onended = () => {node.disconnect(); if (this.effect === node) this.effect = undefined; this.quietIfIdle(); this.update();};
      node.start(); this.update();
    } catch {if (epoch === this.effectEpoch && !this.disposed) {this.message = 'That sound didn’t start. Try again.'; this.quietIfIdle(); this.update();}}
  }
  volume(kind: 'music' | 'effects', value: number) {
    if (!Number.isFinite(value) || value < 0 || value > 1) throw Error('Volume must be between zero and one.');
    if (kind === 'music') {this.musicVolume = value; if (this.musicGain) this.musicGain.gain.value = value;}
    else {this.effectsVolume = value; if (this.effectsGain) this.effectsGain.gain.value = value;}
    this.update();
  }
  mute(value: boolean) {
    this.muted = value;
    if (value) {this.pauseAll(); this.message = 'All sound muted.'; void this.context?.suspend().catch(() => {});}
    else this.message = 'Unmuted. Press Play to listen.';
    this.update();
  }
  setHidden(value: boolean) {
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
