import {renderAccent} from '../design/audio-sketch.ts';
import {SCORE_FRAMES,SCORE_RATE} from './score.ts';

const beat=60/70;
const pitches=[
 [72,76,79,76], [71,74,77,74], [69,72,76,72], [67,72,74,0],
 [64,67,72,76], [69,74,77,74], [67,71,74,71], [72,67,72,0],
] as const;
const roots=[48,50,45,43,48,50,43,48] as const;
const melodyTimes=[0,.75,1.5,2.25] as const;

// Fixed ratios for the pitches in this original arrangement. The source
// pluck comes from the first note of the game's existing original gather cue.
const ratio:Record<number,number>={
 43:.166855,45:.187288,48:.222725,50:.25,55:.333710,57:.374577,
 60:.445449,62:.5,64:.561231,67:.667420,69:.749154,
 71:.840896,72:.890899,74:1,76:1.122462,77:1.189207,79:1.334840,
};

export function renderOrchardScore(){
 const phrase=new Float32Array(SCORE_FRAMES.orchard);
 const voice=renderAccent('gather').subarray(0,Math.floor(SCORE_RATE*.125));
 function pluck(pitch:number,at:number,level:number){
  if(!pitch)return;
  const start=Math.round(at*beat*SCORE_RATE);
  const transpose=ratio[pitch];
  const length=Math.floor((voice.length-1)/transpose);
  const release=Math.ceil(SCORE_RATE*.02);
  for(let i=0;i<length;i++){
   const source=i*transpose,index=Math.floor(source),blend=source-index;
   const sample=(voice[index]*(1-blend)+voice[index+1]*blend)*level*Math.min(1,(length-1-i)/release);
   phrase[start+i]+=sample;
  }
 }
 for(const [bar,notes] of pitches.entries()){
  const start=bar*3;
  pluck(roots[bar],start,.60);
  pluck(roots[bar]+12,start+1.5,.34);
  for(const [index,pitch] of notes.entries()){
   pluck(pitch,start+melodyTimes[index],index===0?.82:.66);
  }
 }
 return phrase;
}
