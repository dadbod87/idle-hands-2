import {LODGING_BEDSIDE, LODGING_FRONT} from './lodging.ts';
import {Session, type SavedPosition} from './session.ts';

export const FIRST_MORNING_KEY = 'ih2:first-morning:v1';
type Phase = 'bed' | 'awake' | 'finished';
type FirstMorning = {version:1; phase:Phase; saved:SavedPosition};
type StorageAccess = Pick<Storage, 'getItem' | 'setItem'>;
type Action = {kind:'start'|'wake'|'leave'} | {kind:'position'; saved:SavedPosition};

export type MorningRead =
  | {status:'ready'; raw:string|null; record:FirstMorning|null}
  | {status:'unreadable'|'unavailable'; record:null};

const besideBed:SavedPosition = {version:1,room:'lodging',position:LODGING_BEDSIDE};
const outside:SavedPosition = {version:1,room:'square',position:LODGING_FRONT};

function isSavedPosition(value: unknown): value is SavedPosition {
  if (!value || typeof value!=='object' || Object.keys(value).length!==3) return false;
  const position=value as Partial<SavedPosition>;
  if(position.version!==1 || !position.position || Object.keys(position.position).length!==2) return false;
  const restored=new Session(position,undefined,true).save();
  return restored.room===position.room && restored.position.x===position.position.x && restored.position.y===position.position.y;
}

export function readFirstMorning(storage:StorageAccess):MorningRead {
  let raw:string|null;
  try{raw=storage.getItem(FIRST_MORNING_KEY);}catch{return{status:'unavailable',record:null};}
  if(raw===null)return{status:'ready',raw,record:null};
  if(raw.length<=480){
    try{
      const record=JSON.parse(raw);
      if(record?.version===1 && Object.keys(record).length===3 && isSavedPosition(record.saved)){
        const bedside=record.saved.room==='lodging' && record.saved.position.x===LODGING_BEDSIDE.x &&
          record.saved.position.y===LODGING_BEDSIDE.y;
        if(record.phase==='finished' || ((record.phase==='bed'||record.phase==='awake') && bedside)){
          return{status:'ready',raw,record};
        }
      }
    }catch{/* An unreadable optional record keeps its original bytes. */}
  }
  return{status:'unreadable',record:null};
}

function nextMorning(record:FirstMorning|null, action:Action):FirstMorning|null {
  switch(action.kind){
    case 'start':
      return record?null:{version:1,phase:'bed',saved:besideBed};
    case 'wake':
      return record?.phase==='bed'?{...record,phase:'awake'}:null;
    case 'leave':
      return record?.phase==='awake'?{...record,phase:'finished',saved:outside}:null;
    case 'position':
      return record?.phase==='finished' && isSavedPosition(action.saved)?{...record,saved:action.saved}:null;
  }
}

/** Atomically record the phase and the associated feet in one browser entry. */
export function saveFirstMorning(storage:StorageAccess, expected:string|null, action:Action){
  const current=readFirstMorning(storage);
  if(current.status!=='ready')return{status:current.status} as const;
  if(current.raw!==expected)return{status:'changed'} as const;
  const record=nextMorning(current.record,action);
  if(!record)return{status:'invalid'} as const;
  const raw=JSON.stringify(record);
  if(raw!==current.raw){
    try{storage.setItem(FIRST_MORNING_KEY,raw);}catch{return{status:'save-failed'} as const;}
  }
  return{status:'saved',raw,record} as const;
}
