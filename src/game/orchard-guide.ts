import {APPLES_PER_SNACK,ORCHARD_STOPS,SNACK_CAP,orchardBranchFromStop,type OrchardPantry} from './orchard.ts';

type Guide = {detail:string;to?:string;button?:string};
const table='commons-orchard';

export function orchardGuide(pantry:OrchardPantry,now:number,shared:boolean):Guide {
 if(pantry.parcel){
  if(pantry.parcel.readyAt<=now)return {
   detail:'Your packed snack is ready for collection. It will wait for you.',
   to:table,button:'Walk to the packing table',
  };
  return {
   detail:'The snack can finish on its own. The allotment has its own work while you wait.',
   to:'allotment',button:'Walk to the allotment',
  };
 }
 if(pantry.snacks>0&&(!pantry.tasted||pantry.snacks>=SNACK_CAP)){
  return {detail:'You have a packed snack. Try one at the packing table.',
   to:table,button:'Walk to the packing table'};
 }
 if(pantry.apples>=APPLES_PER_SNACK){
  return {detail:'You can start a snack with two apples. Packing takes thirty real minutes.',
   to:table,button:'Walk to the packing table'};
 }
 if(shared&&pantry.snacks>0){
  return {detail:'You can leave a packed snack for a neighbor at the café parcel shelf.',
   to:'cafe',button:'Walk to the café'};
 }
 const branch=ORCHARD_STOPS.find(stop=>pantry.ripeAt[orchardBranchFromStop(stop.id)!]<=now);
 if(branch){
  return {
   detail:pantry.apples===0?'Each marked branch has one apple when it ripens. Start with '+branch.name+'.':
    'You have one apple. '+branch.name+' has the next one.',
   to:branch.id,button:'Walk to '+branch.name,
  };
 }
 return {detail:'The three marked branches are ripening. Jun recommends an entirely different committee in the meantime.'};
}
