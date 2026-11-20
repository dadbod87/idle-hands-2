import {isHeadwear,type Headwear} from '../art/headwear.ts';
import {isArrivalStory,type ArrivalStory} from './arrival-stories.ts';
import {RESIDENT_IDS, type ResidentId} from '../art/variety.ts';

export const BROWSER_RESIDENT_KEY = 'ih2:browser-resident:v1';
type ResidentAppearance = {name:string; look:ResidentId};
export type BrowserResident = ResidentAppearance & (
 | {version:1}
 | {version:2;headwear:Headwear}
 | {version:3;headwear:Headwear|null;story:ArrivalStory}
);
type ProfileStorage = Pick<Storage, 'getItem' | 'setItem'>;
export type BrowserResidentRead =
 | {status: 'ready'; raw: string | null; resident: BrowserResident | null}
 | {status: 'unreadable' | 'unavailable'; resident: null};
const graphemes = typeof Intl.Segmenter==='function'?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null;

export function browserResident(name: string, look: string, headwear:unknown=null, story:unknown=null): BrowserResident | null {
 if ((headwear!==null&&!isHeadwear(headwear))||(story!==null&&!isArrivalStory(story)))return null;
 if (typeof name !== 'string' || name.length > 120 || !RESIDENT_IDS.includes(look as ResidentId)) return null;
 const value = name.normalize('NFC').trim().replace(/ +/g,' ');
 if (/[\p{Cc}\p{Cf}]/u.test(name) || !/^(?:\p{L}|\p{N})[\p{L}\p{M}\p{N} .’'-]*$/u.test(value) ||
     [...(graphemes?.segment(value)??value)].length > 24) return null;
 const appearance={name:value,look:look as ResidentId};
 if(isArrivalStory(story))return {version:3,...appearance,headwear:isHeadwear(headwear)?headwear:null,story};
 return isHeadwear(headwear)?{version:2,...appearance,headwear}:{version:1,...appearance};
}

export function readBrowserResident(storage: ProfileStorage): BrowserResidentRead {
 let raw: string | null;
 try { raw=storage.getItem(BROWSER_RESIDENT_KEY); }
 catch { return {status:'unavailable',resident:null}; }
 if (raw===null) return {status:'ready',raw,resident:null};
 if (raw.length>512) return {status:'unreadable',resident:null};
 try {
  const copy=JSON.parse(raw);
  const legacy=copy?.version===1&&Object.keys(copy).length===3;
  const equipped=copy?.version===2&&Object.keys(copy).length===4&&isHeadwear(copy.headwear);
  const withStory=copy?.version===3&&Object.keys(copy).length===5&&isArrivalStory(copy.story)
   &&(copy.headwear===null||isHeadwear(copy.headwear));
  if (legacy||equipped||withStory) {
   const resident=browserResident(copy.name,copy.look,equipped||withStory?copy.headwear:null,withStory?copy.story:null);
   if (resident) return {status:'ready',raw,resident};
  }
 } catch { /* Leave unrecognized records untouched. */ }
 return {status:'unreadable',resident:null};
}

export function saveBrowserResident(storage:ProfileStorage, expectedRaw:string|null, name:string, look:string, headwear:Headwear|null=null, story?:ArrivalStory|null) {
 const proposed=browserResident(name,look,headwear,story??null);
 if (!proposed) return {status:'invalid'} as const;
 const current=readBrowserResident(storage);
 if (current.status!=='ready') return {status:current.status};
 if (current.raw!==expectedRaw) return {status:'changed'} as const;
 // Existing callers that only edit appearance keep the current story.
 const resident=story===undefined&&current.resident?.version===3
  ?{version:3 as const,name:proposed.name,look:proposed.look,headwear,story:current.resident.story}
  :proposed;
 const raw=JSON.stringify(resident);
 if (raw!==current.raw) {
  try { storage.setItem(BROWSER_RESIDENT_KEY,raw); }
  catch { return {status:'save-failed'} as const; }
 }
 return {status:'saved',resident,raw} as const;
}
