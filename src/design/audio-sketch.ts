/** Original independent scores/synthesis for a standalone study; not game runtime. */
export const AUDIO_RATE = 22050;
export type Voice = 'pluck' | 'wind' | 'pad' | 'wood';
type Phrase = ReadonlyArray<readonly [number, number]>; // pitch (0 = rest), beats
type Theme = {id: string; place: string; title: string; note: string; bpm: number; lead: Voice;
  bars: ReadonlyArray<Phrase>; chords: ReadonlyArray<readonly [number, number, number]>};
export const THEMES: readonly Theme[] = [
  {id:'town',place:'Town square',title:'Business as unusual',note:'Warm strings. A town finding its feet.',bpm:78,lead:'wind',
    bars:[[[66,1],[69,.5],[71,.5],[74,1],[69,1]],[[67,1.5],[66,.5],[64,1],[62,1]],
      [[66,.5],[69,.5],[73,1],[71,1],[69,1]],[[64,1],[66,1],[69,1],[0,1]],
      [[74,1.5],[73,.5],[71,1],[66,1]],[[67,1],[71,1],[69,.5],[67,.5],[64,1]],
      [[66,1],[64,1],[62,1],[61,1]],[[62,2],[69,1],[66,.5],[62,.5]]],
    chords:[[50,54,57],[43,47,50],[47,50,54],[45,49,52],[50,54,57],[43,47,50],[45,49,52],[50,54,57]]},
  {id:'woodland',place:'Inkwood',title:'The trees have seniority',note:'A quieter path. Leave room for the forest.',bpm:66,lead:'wind',
    bars:[[[64,1.5],[67,.5],[71,1],[0,1]],[[69,1],[67,.5],[66,.5],[64,1],[0,1]],
      [[62,1.5],[64,.5],[67,1],[66,1]],[[64,2],[0,2]],
      [[71,1],[74,1],[72,1],[67,1]],[[69,1.5],[67,.5],[64,2]],
      [[62,1],[66,1],[67,1],[0,1]],[[64,3],[0,1]]],
    chords:[[40,43,47],[48,52,55],[43,47,50],[40,43,47],[48,52,55],[45,48,52],[47,50,54],[40,43,47]]},
  {id:'home',place:'Home & café',title:'Furniture, finally',note:'Soft plucks. A little room to exhale.',bpm:68,lead:'pluck',
    bars:[[[67,1],[71,1],[69,1],[62,1]],[[64,1.5],[67,.5],[69,1],[0,1]],
      [[71,1],[74,.5],[76,.5],[74,1],[71,1]],[[69,2],[67,1],[0,1]],
      [[64,1],[67,1],[71,1],[69,1]],[[67,1.5],[66,.5],[64,1],[62,1]],
      [[66,1],[69,1],[74,1],[72,1]],[[71,1],[69,1],[67,2]]],
    chords:[[43,47,50],[48,52,55],[43,47,50],[50,54,57],[48,52,55],[43,47,50],[50,54,57],[43,47,50]]},
];
export const ACCENTS = [
  {id:'door',name:'Wooden door',notes:[[48,0,.16,'wood']]},
  {id:'gather',name:'Material collected',notes:[[74,0,.2,'pluck'],[81,.13,.23,'pluck']]},
  {id:'craft',name:'Craft complete',notes:[[67,0,.35,'wood'],[71,.12,.35,'pluck'],[74,.24,.4,'pluck']]},
  {id:'opening',name:'Town opening',notes:[[55,0,1.2,'pad'],[60,.06,1.15,'wind'],[64,.12,1.1,'wind'],[67,.25,1,'pluck']]},
  {id:'return',name:'Coming home',notes:[[67,0,.35,'pluck'],[64,.2,.4,'pluck'],[60,.4,.5,'pluck']]},
  {id:'menu',name:'Menu tap',notes:[[72,0,.09,'wood']]},
] as const;

// Fixed millihertz for equal-tempered C2..C6. No soundfont, sampled recording,
// platform transcendental oscillator, randomness or external runtime service.
const HZ = [65406,69296,73416,77782,82407,87307,92499,97999,103826,110000,116541,123471,
  130813,138591,146832,155563,164814,174614,184997,195998,207652,220000,233082,246942,
  261626,277183,293665,311127,329628,349228,369994,391995,415305,440000,466164,493883,
  523251,554365,587330,622254,659255,698456,739989,783991,830609,880000,932328,987767,1046502];
function wave(phase: number) {
  const p = (phase >>> 0) / 4294967296, x = p < .5 ? p * 2 : (p - 1) * 2;
  const s = 4 * x * (1 - Math.abs(x));
  return s + .225 * (s * Math.abs(s) - s);
}
function note(target: Float32Array, pitch: number, start: number, seconds: number, voice: Voice, gain: number, seed: number) {
  if (!Number.isInteger(pitch) || pitch < 36 || pitch > 84 || !Number.isFinite(seconds) || seconds <= 0 ||
    !Number.isFinite(start) || start < 0 || !Number.isFinite(gain) || gain < 0 || gain > 1) throw Error('Invalid original audio note.');
  const first = Math.round(start * AUDIO_RATE), count = Math.round(seconds * AUDIO_RATE);
  if (first + count > target.length) throw Error('Audio note exceeds its bounded clip.');
  const step = Math.round(HZ[pitch - 36] / 1000 / AUDIO_RATE * 4294967296);
  let noise = seed >>> 0 || 1, air = 0;
  for (let n = 0; n < count; n++) {
    const phase = (n * step) >>> 0, progress = n / count;
    noise ^= noise << 13; noise ^= noise >>> 17; noise ^= noise << 5;
    air = air * .85 + ((noise >>> 0) / 4294967296 * 2 - 1) * .15;
    const attack = Math.min(1, n / (AUDIO_RATE * (voice === 'pad' ? .3 : .012)));
    const release = Math.min(1, (count - 1 - n) / (AUDIO_RATE * (voice === 'pad' ? .4 : .07)));
    const decay = voice === 'pluck' || voice === 'wood' ? (1 - progress) * (1 - progress) : .8 + .2 * (1 - progress);
    const tone = voice === 'pluck' ? wave(phase) + .24 * wave(phase * 2) + .07 * wave(phase * 3)
      : voice === 'wind' ? wave(phase) + .12 * wave(phase * 2) + .025 * air
      : voice === 'wood' ? wave(phase) + .15 * wave(phase * 3) + .15 * air
      : wave(phase) + .08 * wave(phase * 2);
    target[first + n] += tone * attack * release * decay * gain;
  }
}
function finish(samples: Float32Array<ArrayBuffer>, ceiling: number) {
  // Small deterministic room tail, reading dry samples only; bounded and mono.
  const dry = samples.slice();
  for (const [delay, gain] of [[.083,.13],[.157,.07]] as const) {
    const shift = Math.round(delay * AUDIO_RATE);
    for (let i = shift; i < samples.length; i++) samples[i] += dry[i - shift] * gain;
  }
  let peak = 0; for (const value of samples) peak = Math.max(peak, Math.abs(value));
  const attenuation = peak > ceiling ? ceiling / peak : 1, edge = Math.round(AUDIO_RATE * .015);
  for (let i = 0; i < samples.length; i++) samples[i] *= attenuation * Math.min(1, i / edge, (samples.length - 1 - i) / edge);
  return samples;
}
export function renderTheme(id: string) {
  const theme = THEMES.find(t => t.id === id); if (!theme) throw Error('Unknown original theme.');
  const beat = 60 / theme.bpm, samples = new Float32Array(Math.ceil((32 * beat + 1.2) * AUDIO_RATE));
  for (const [bar, phrase] of theme.bars.entries()) {
    if (phrase.reduce((n, p) => n + p[1], 0) !== 4) throw Error('Original score bar must contain four beats.');
    let at = bar * 4;
    for (const [index, [pitch, beats]] of phrase.entries()) {
      if (pitch) note(samples, pitch, at * beat, beats * beat * .9, theme.lead, theme.lead === 'pluck' ? .18 : .13, bar * 101 + index + 1);
      at += beats;
    }
    const chord = theme.chords[bar];
    for (const [index, pitch] of chord.entries()) note(samples, pitch, bar * 4 * beat, 4 * beat, 'pad', .024, 17 + index);
    for (const [index, offset] of [0,1,2,3].entries()) {
      const pitch = chord[index % 3] + 12;
      note(samples, pitch, (bar * 4 + offset) * beat, beat * 1.1, 'pluck', theme.id === 'woodland' ? .045 : .07, bar * 17 + index + 3);
    }
  }
  return finish(samples, .22);
}
export function renderAccent(id: string) {
  const accent = ACCENTS.find(a => a.id === id); if (!accent) throw Error('Unknown original accent.');
  const duration = Math.max(...accent.notes.map(n => n[1] + n[2])) + .25;
  const samples = new Float32Array(Math.ceil(duration * AUDIO_RATE));
  for (const [index, [pitch, start, duration, voice]] of accent.notes.entries()) note(samples, pitch, start, duration, voice, .16, index + 71);
  return finish(samples, .28);
}
export function audioMetrics(samples: Float32Array) {
  let peak = 0, square = 0, sum = 0, delta = 0;
  for (let i = 0; i < samples.length; i++) {
    const value = samples[i]; if (!Number.isFinite(value)) throw Error('Nonfinite audio sample.');
    peak = Math.max(peak, Math.abs(value)); square += value * value; sum += value;
    if (i) delta = Math.max(delta, Math.abs(value - samples[i - 1]));
  }
  return {rate: AUDIO_RATE, frames: samples.length, seconds: samples.length / AUDIO_RATE,
    peak, rms: Math.sqrt(square / samples.length), dc: sum / samples.length, maximumAdjacentDelta: delta,
    first: samples[0], last: samples.at(-1)};
}
export function wav(samples: Float32Array) {
  const data = new Uint8Array(44 + samples.length * 2), view = new DataView(data.buffer);
  const text = (at: number, value: string) => {for (let i = 0; i < value.length; i++) data[at + i] = value.charCodeAt(i);};
  text(0,'RIFF'); view.setUint32(4, data.length - 8, true); text(8,'WAVE'); text(12,'fmt ');
  view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,1,true);
  view.setUint32(24,AUDIO_RATE,true); view.setUint32(28,AUDIO_RATE*2,true); view.setUint16(32,2,true); view.setUint16(34,16,true);
  text(36,'data'); view.setUint32(40,samples.length*2,true);
  for (let i = 0; i < samples.length; i++) view.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),true);
  return data;
}
