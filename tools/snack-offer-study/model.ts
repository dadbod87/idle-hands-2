import {SNACK_CAP} from '../../src/game/orchard.ts';

export const OFFER_WINDOW = 24 * 60 * 60_000;
type Offer = {
 sender:string; recipient:string; placedAt:number; expiresAt:number;
 state:'waiting'|'declined'|'accepted'|'returned';
};
type Request = {id:string} & (
 {kind:'offer'; offerId:string; recipient:string} |
 {kind:'accept'|'decline'|'reclaim'; offerId:string} |
 {kind:'collect'|'taste'}
);
type Study = {
 observedAt:number;
 available:Record<string,number>;
 offers:Record<string,Offer>;
 receipts:Record<string,{fingerprint:string;ok:boolean;message:string}>;
 made:number;
 tasted:number;
};

export function start(people:Record<string,number>, at=0):Study{
 if(!Number.isSafeInteger(at)||at<0||!Object.values(people).every(n=>Number.isInteger(n)&&n>=0&&n<=SNACK_CAP))throw new Error('Invalid fictional snack pouch.');
 return {observedAt:at,available:{...people},offers:{},receipts:{},made:Object.values(people).reduce((a,b)=>a+b,0),tasted:0};
}

const held=(offer:Offer)=>offer.state==='waiting'||offer.state==='declined';
const reservations=(s:Study,id:string)=>Object.values(s.offers).filter(offer=>offer.sender===id&&held(offer)).length;
const occupied=(s:Study,id:string)=>s.available[id]+reservations(s,id);
const idOK=(id:string)=>/^[a-z0-9-]{1,60}$/u.test(id);
const from=(s:Study,id:string)=>Object.hasOwn(s.available,id);

export function offerStep(state:Study, actor:string, request:Request, now:number){
 const invalid=(message:string)=>({ok:false,state,message,replayed:false} as const);
 if(!from(state,actor)||!idOK(actor)||!idOK(request.id)||!Number.isSafeInteger(now)||now<state.observedAt||
    !Number.isSafeInteger(now+OFFER_WINDOW))return invalid('The request or clock could not be confirmed.');
 const key=actor+'/'+request.id;
 const fingerprint=request.kind==='offer'?[request.kind,request.offerId,request.recipient].join('/') :
  'offerId' in request?[request.kind,request.offerId].join('/'):request.kind;
 const receipt=Object.hasOwn(state.receipts,key)?state.receipts[key]:undefined;
 if(receipt)return receipt.fingerprint===fingerprint?
  {ok:receipt.ok,state,message:receipt.message,replayed:true} as const:
  invalid('This request ID was already used.');
 const reject=(message:string)=>({
  ok:false,replayed:false,message,
  state:{...state,receipts:{...state.receipts,[key]:{fingerprint,ok:false,message}}},
 } as const);
 const next=structuredClone(state);
 next.observedAt=now;
 if(request.kind==='collect'){
  if(occupied(state,actor)>=SNACK_CAP)return reject('Your pouch is full. Offered snacks still hold their place.');
  next.available[actor]++;
  next.made++;
 }else if(request.kind==='taste'){
  if(!state.available[actor])return reject('There is no snack in your pouch.');
  next.available[actor]--;
  next.tasted++;
 }else if(request.kind==='offer'){
  if(!idOK(request.offerId)||Object.hasOwn(state.offers,request.offerId)||!from(state,request.recipient)||
     request.recipient===actor)return reject('Choose another resident.');
  if(!state.available[actor]||reservations(state,actor))return reject('Finish the first offer or collect another snack.');
  next.available[actor]--;
  next.offers[request.offerId]={sender:actor,recipient:request.recipient,placedAt:now,expiresAt:now+OFFER_WINDOW,state:'waiting'};
 }else{
  const offer=Object.hasOwn(next.offers,request.offerId)?next.offers[request.offerId]:undefined;
  if(!offer)return reject('That snack parcel is unavailable.');
  if(request.kind==='reclaim'){
   if(offer.sender!==actor||!held(offer))return reject('This parcel cannot be returned to your pouch.');
   offer.state='returned';
   next.available[actor]++;
  }else{
   if(offer.recipient!==actor||offer.state!=='waiting'||now>=offer.expiresAt)return reject('This offer is no longer waiting for you.');
   if(request.kind==='accept'){
    if(occupied(state,actor)>=SNACK_CAP)return reject('Make room in your snack pouch first.');
    offer.state='accepted';
    next.available[actor]++;
   }else offer.state='declined';
  }
 }
 const message='Parcel recorded.';
 next.receipts[key]={fingerprint,ok:true,message};
 return {ok:true,state:next,message,replayed:false} as const;
}

export function parcelLedger(state:Study){
 const available=Object.values(state.available).reduce((a,b)=>a+b,0);
 const reserved=Object.values(state.offers).filter(held).length;
 return {available,reserved,tasted:state.tasted,made:state.made,conserved:available+reserved+state.tasted===state.made};
}

export function privateParcelView(state:Study,actor:string){
 if(!from(state,actor))return [];
 return Object.entries(state.offers).filter(([,o])=>o.recipient===actor||o.sender===actor)
  .map(([id,o])=>({id,...o}));
}
