export type WorldCue = 'door' | 'gather' | 'craft';

export function rewardCue(command: Record<string, unknown>): WorldCue | undefined {
  const action = (value: unknown) => (value as { action?: string } | undefined)?.action;
  switch (command.kind) {
    case 'gather': return 'gather';
    case 'claim':
    case 'stamp-trail': return 'craft';
    case 'garden':
      if (action(command.gardenAction) === 'harvest') return 'gather';
      if (action(command.gardenAction) === 'submit-request') return 'craft';
      break;
    case 'carpentry':
      if (action(command.carpentryAction) === 'gather-pine') return 'gather';
      if (action(command.carpentryAction) === 'claim-easel') return 'craft';
      break;
    case 'commission':
      if (action(command.commissionAction) === 'complete') return 'craft';
      break;
  }
}

export class WorldSounds {
  volume = 0.55;
  enabled = false;
  error = false;
  private context?: AudioContext;
  private gain?: GainNode;
  private voice?: AudioBufferSourceNode;
  private readonly clips = new Map<WorldCue, AudioBuffer>();

  constructor(private readonly changed: () => void) {}

  setVolume(value: number) {
    if (!Number.isFinite(value) || value < 0 || value > 1) return;
    this.volume = value;
    if (this.gain) this.gain.gain.value = value;
    this.changed();
  }

  async toggle() {
    if (this.context) {
      this.disable();
      return;
    }
    if (document.hidden) return;
    let context: AudioContext | undefined;
    this.error = false;
    try {
      context = new AudioContext();
      this.context = context;
      const [, { AUDIO_RATE, renderAccent }] = await Promise.all([
        context.resume(),
        import('../design/audio-sketch.ts'),
      ]);
      if (this.context !== context) return;
      if (context.state !== 'running' || document.hidden) {
        this.disable();
        return;
      }
      const gain = context.createGain();
      gain.gain.value = this.volume;
      gain.connect(context.destination);
      this.gain = gain;
      for (const cue of ['door', 'gather', 'craft'] as const) {
        const samples = renderAccent(cue);
        const buffer = context.createBuffer(1, samples.length, AUDIO_RATE);
        buffer.copyToChannel(samples, 0);
        this.clips.set(cue, buffer);
      }
      context.onstatechange = () => {
        if (this.context === context && context?.state !== 'running') this.disable();
      };
      this.enabled = true;
      this.changed();
    } catch {
      if (!context || this.context === context) {
        this.error = true;
        this.disable();
      }
    }
  }

  play(cue: WorldCue) {
    const context = this.context;
    const clip = this.clips.get(cue);
    if (!this.enabled || !this.volume || document.hidden || context?.state !== 'running' || !clip || !this.gain) return;
    try {
      this.stopVoice();
      const voice = context.createBufferSource();
      this.voice = voice;
      voice.buffer = clip;
      voice.connect(this.gain);
      voice.onended = () => {
        if (this.voice === voice) this.voice = undefined;
        voice.disconnect();
      };
      voice.start();
    } catch {
      this.error = true;
      this.disable();
    }
  }

  private stopVoice() {
    const voice = this.voice;
    this.voice = undefined;
    if (!voice) return;
    voice.onended = null;
    try { voice.stop(); } catch { /* The source may not have started. */ }
    voice.disconnect();
  }

  disable() {
    this.enabled = false;
    this.stopVoice();
    this.gain?.disconnect();
    this.gain = undefined;
    const context = this.context;
    this.context = undefined;
    if (context) {
      context.onstatechange = null;
      if (context.state !== 'closed') void context.close().catch(() => {});
    }
    this.changed();
  }
}
