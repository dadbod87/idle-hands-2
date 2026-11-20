import { renderAccent } from '../design/audio-sketch.ts';
import { addPluck } from './pluck.ts';
import { SCORE_FRAMES, SCORE_RATE } from './score.ts';

const beat = 60 / 56;
const bars = [
 { bass:48, notes:[[64,0],[67,1.5],[72,2]] },
 { bass:45, notes:[[69,0],[67,1.5],[64,2]] },
 { bass:50, notes:[[62,0],[65,1],[69,2]] },
 { bass:48, notes:[[67,0],[64,1.5],[60,2]] },
 { bass:41, notes:[[65,0],[69,1],[72,2],[69,3]] },
 { bass:48, notes:[[67,0],[64,1],[60,2]] },
] as const;

// Fixed equal-tempered ratios relative to the original return cue's G4.
const ratio: Record<number, number> = {
 41:.222725,45:.280616,48:.333710,50:.374577,53:.445449,57:.561231,
 60:.667420,62:.749154,64:.840896,65:.890899,67:1,69:1.122462,72:1.334840,
};

export function renderLodgingScore() {
 const phrase = new Float32Array(SCORE_FRAMES.lodging);
 const voice = renderAccent('return').subarray(0, Math.floor(SCORE_RATE * .18));
 const release = Math.ceil(SCORE_RATE * .06);
 const pluck = (pitch: number, time: number, gain: number) =>
  addPluck(phrase, voice, Math.round(time * beat * SCORE_RATE), ratio[pitch], gain, release);

 for (const [index, { bass, notes }] of bars.entries()) {
  const start = index * 4;
  pluck(bass, start, .5);
  pluck(bass + 12, start + 2, .3);
  for (const [pitch, time] of notes) pluck(pitch, start + time, .66);
 }
 return phrase;
}
