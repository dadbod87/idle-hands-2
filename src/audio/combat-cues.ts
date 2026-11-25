export const FIELD_CUES=['lunge','splash','swing','thud','block','bell'] as const;
export type FieldCue=typeof FIELD_CUES[number];

const shape:Record<FieldCue,{body:number;tail:number;seconds:number;noise:number;gain:number}>={
 lunge:{body:145,tail:225,seconds:.17,noise:.24,gain:.09},
 splash:{body:199,tail:285,seconds:.17,noise:.68,gain:.11},
 swing:{body:238,tail:104,seconds:.12,noise:.44,gain:.11},
 thud:{body:114,tail:67,seconds:.15,noise:.31,gain:.18},
 block:{body:345,tail:194,seconds:.11,noise:.13,gain:.13},
 bell:{body:724,tail:701,seconds:.175,noise:.05,gain:.08},
};

/** Short original cues, synthesized once when game effects are enabled. */
export function renderFieldCue(cue:FieldCue,rate:number){
 const {body,tail,seconds,noise,gain}=shape[cue];
 const frames=Math.round(rate*seconds),clip=new Float32Array(frames);
 let phase=0,seed=9137;
 for(let i=0;i<frames;i++){
  const part=i/(frames-1);
  const fade=Math.min(i/Math.max(1,.007*rate),1)*(1-part)**2;
  phase+=2*Math.PI*(body+(tail-body)*part)/rate;
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const grain=(seed/4294967296-.5)*2;
  clip[i]=fade*gain*(Math.sin(phase)*(1-noise)+grain*noise);
 }
 return clip;
}
