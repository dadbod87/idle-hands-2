import {renderAccent} from '../design/audio-sketch.ts';
import {addPluck} from './pluck.ts';
import {SCORE_FRAMES,SCORE_RATE} from './score.ts';

type RegionalScore='mossbank'|'pumpworks';

const mossbank=[
 {root:50,notes:[[69,.35],[72,1.15],[74,2]]},
 {root:48,notes:[[67,0],[69,1.6]]},
 {root:55,notes:[[71,.4],[74,1.15],[69,2.1]]},
 {root:53,notes:[[69,0],[67,1.8]]},
 {root:50,notes:[[65,.35],[69,1.4],[72,2.2]]},
 {root:57,notes:[[76,0],[74,1.8]]},
 {root:48,notes:[[67,.4],[72,1.35],[69,2.2]]},
 {root:50,notes:[[65,.4],[62,1.9]]},
] as const;

const pumpworks=[
 {root:45,notes:[[60,1.5],[64,2.6]]},
 {root:45,notes:[[57,2.5]]},
 {root:41,notes:[[60,1],[65,2.65]]},
 {root:43,notes:[[62,1.35],[59,2.85]]},
 {root:45,notes:[[64,1.3],[67,2.4]]},
 {root:48,notes:[[60,1.9]]},
 {root:43,notes:[[62,1.35],[59,2.5]]},
 {root:45,notes:[[57,1.4]]},
] as const;

export function renderRegionalScore(score:RegionalScore){
 const sawmill=score==='mossbank';
 const bars=sawmill?mossbank:pumpworks;
 const beats=sawmill?3:4;
 const beat=60/(sawmill?66:72);
 const source=renderAccent(sawmill?'gather':'return');
 const samplePitch=sawmill?74:67;
 const voice=source.subarray(0,Math.floor(SCORE_RATE*(sawmill?.145:.11)));
 const release=Math.ceil(SCORE_RATE*.035);
 const phrase=new Float32Array(SCORE_FRAMES[score]);
 const add=(pitch:number,at:number,gain:number)=>{
  addPluck(phrase,voice,Math.round(at*beat*SCORE_RATE),2**((pitch-samplePitch)/12),gain,release);
 };
 for(const [index,bar] of bars.entries()){
  const start=index*beats;
  add(bar.root,start,sawmill?.54:.49);
  add(bar.root+12,start+beats/2,sawmill?.25:.21);
  for(const [pitch,time] of bar.notes)add(pitch,start+time,sawmill?.62:.42);
 }
 return phrase;
}
