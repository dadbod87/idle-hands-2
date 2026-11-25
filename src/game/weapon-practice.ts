// These are cumulative practice marks. Higher ranks take longer even when a
// future encounter offers the same marks per hit.
export const WEAPON_RANK_MARKS=[0,4,11,22,38,62,95,141,204,289,405] as const;
export const MAX_WEAPON_RANK=WEAPON_RANK_MARKS.length-1;
export const PUMPWORKS_TRAINING_RANK=4;
export const PUMPWORKS_TRAINING_MARKS=WEAPON_RANK_MARKS[PUMPWORKS_TRAINING_RANK];
export const WEAPON_SKILL_NAMES={rod:'Rodwork',bow:'Archery',staff:'Staffcraft'} as const;

export function weaponRank(marks:number){
 let rank=0;
 while(rank<MAX_WEAPON_RANK&&marks>=WEAPON_RANK_MARKS[rank+1]!)rank++;
 return rank;
}

export function practiceGain(marks:number,action:'strike'|'counter'){
 if(marks>=PUMPWORKS_TRAINING_MARKS)return marks;
 return Math.min(PUMPWORKS_TRAINING_MARKS,marks+(action==='counter'?2:1));
}

export function learnedCounter(marks:number){
 const rank=weaponRank(marks);
 return rank>=7?2:rank>=2?1:0;
}

export function learnedReach(marks:number){
 const rank=weaponRank(marks);
 return rank>=8?.3:rank>=3?.15:0;
}
