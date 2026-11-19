import { SCORE_FRAMES, SCORE_RATE, type PlaceScore } from './score.ts';

export type MusicStatus = 'off' | 'preparing' | 'playing' | 'paused' | 'unavailable';

export class PlaceMusic {
  status: MusicStatus = 'off';
  score: PlaceScore;
  volume = 0.45;

  private context?: AudioContext;
  private gain?: GainNode;
  private voice?: AudioBufferSourceNode;
  private worker?: Worker;
  private preparationTimer?: ReturnType<typeof setTimeout>;
  private readonly cache = new Map<PlaceScore, AudioBuffer>();

  constructor(score: PlaceScore, private readonly changed: () => void) {
    this.score = score;
  }

  get active() {
    return this.status === 'playing' || this.status === 'preparing';
  }

  setPlace(score: PlaceScore) {
    if (score === this.score) return;
    this.score = score;
    if (this.context?.state === 'running' && this.active) this.prepare(this.context);
    else this.changed();
  }

  setVolume(volume: number) {
    if (!Number.isFinite(volume) || volume < 0 || volume > 1) return;
    this.volume = volume;
    if (this.gain) this.gain.gain.value = volume;
    this.changed();
  }

  async play() {
    if (this.active || document.hidden) return;
    let context: AudioContext | undefined;
    try {
      context = new AudioContext();
      this.context = context;
      this.gain = context.createGain();
      this.gain.gain.value = this.volume;
      this.gain.connect(context.destination);
      this.status = 'preparing';
      this.changed();
      const started = context;
      this.preparationTimer = setTimeout(() => {
        if (this.context === started) this.stop('unavailable');
      }, 5000);
      await started.resume();
      if (context !== this.context) return;
      if (context.state !== 'running' || document.hidden) {
        this.pause();
        return;
      }
      context.onstatechange = () => {
        if (this.context === started && started.state !== 'running') this.pause();
      };
      this.prepare(context);
    } catch {
      if (!context || context === this.context) this.stop('unavailable');
    }
  }

  pause() {
    if (this.active) this.stop('paused');
  }

  private prepare(context: AudioContext) {
    this.stopVoice();
    this.cancelPreparation();
    const score = this.score;
    const cached = this.cache.get(score);
    if (cached) {
      this.cache.delete(score);
      this.cache.set(score, cached);
      this.startVoice(context, cached);
      return;
    }
    this.status = 'preparing';
    this.changed();
    try {
      const worker = new Worker(new URL('./score-worker.ts', import.meta.url), { type: 'module' });
      this.worker = worker;
      const fail = () => {
        if (this.worker === worker) this.stop('unavailable');
      };
      this.preparationTimer = setTimeout(fail, 5000);
      worker.onerror = fail;
      worker.onmessageerror = fail;
      worker.onmessage = ({ data }) => {
        if (this.worker !== worker || this.context !== context) return;
        if (document.hidden || context.state !== 'running') {
          this.pause();
          return;
        }
        if (data?.score !== score || data.rate !== SCORE_RATE ||
            !(data.pcm instanceof ArrayBuffer) || data.pcm.byteLength !== SCORE_FRAMES[score] * 4) {
          fail();
          return;
        }
        this.cancelPreparation();
        try {
          // Give each phrase room to breathe before it repeats.
          const buffer = context.createBuffer(1, SCORE_FRAMES[score] + 8 * SCORE_RATE, SCORE_RATE);
          buffer.copyToChannel(new Float32Array(data.pcm), 0);
          while (this.cache.size >= 2) this.cache.delete(this.cache.keys().next().value!);
          this.cache.set(score, buffer);
          this.startVoice(context, buffer);
        } catch {
          this.stop('unavailable');
        }
      };
      worker.postMessage(score);
    } catch {
      this.stop('unavailable');
    }
  }

  private startVoice(context: AudioContext, buffer: AudioBuffer) {
    try {
      const voice = context.createBufferSource();
      this.voice = voice;
      voice.buffer = buffer;
      voice.loop = true;
      voice.connect(this.gain!);
      voice.start();
      this.status = 'playing';
      this.changed();
    } catch {
      this.stop('unavailable');
    }
  }

  private cancelPreparation() {
    clearTimeout(this.preparationTimer);
    this.preparationTimer = undefined;
    const worker = this.worker;
    this.worker = undefined;
    if (worker) {
      worker.onmessage = worker.onmessageerror = worker.onerror = null;
      worker.terminate();
    }
  }

  private stopVoice() {
    const voice = this.voice;
    this.voice = undefined;
    if (!voice) return;
    try { voice.stop(); } catch { /* The source may not have started. */ }
    voice.disconnect();
  }

  private stop(status: MusicStatus) {
    this.cancelPreparation();
    this.stopVoice();
    const context = this.context;
    this.context = undefined;
    this.gain?.disconnect();
    this.gain = undefined;
    if (context) {
      context.onstatechange = null;
      if (context.state !== 'closed') void context.close().catch(() => {});
    }
    this.status = status;
    this.changed();
  }
}
