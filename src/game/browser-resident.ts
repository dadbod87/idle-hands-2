import {RESIDENT_IDS, type ResidentId} from '../art/variety.ts';

export const BROWSER_RESIDENT_KEY = 'ih2:browser-resident:v1';
export type BrowserResident = {version: 1; name: string; look: ResidentId};
type ProfileStorage = Pick<Storage, 'getItem' | 'setItem'>;
export type BrowserResidentRead =
 | {status: 'ready'; raw: string | null; resident: BrowserResident | null}
 | {status: 'unreadable' | 'unavailable'; resident: null};
const graphemes = typeof Intl.Segmenter==='function'?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null;

export function browserResident(name: string, look: string): BrowserResident | null {
 if (typeof name !== 'string' || name.length > 120 || !RESIDENT_IDS.includes(look as ResidentId)) return null;
 const value = name.normalize('NFC').trim().replace(/ +/g,' ');
 if (/[\p{Cc}\p{Cf}]/u.test(name) || !/^(?:\p{L}|\p{N})[\p{L}\p{M}\p{N} .’'-]*$/u.test(value) ||
     [...(graphemes?.segment(value)??value)].length > 24) return null;
 return {version:1,name:value,look:look as ResidentId};
}

export function readBrowserResident(storage: ProfileStorage): BrowserResidentRead {
 let raw: string | null;
 try { raw=storage.getItem(BROWSER_RESIDENT_KEY); }
 catch { return {status:'unavailable',resident:null}; }
 if (raw===null) return {status:'ready',raw,resident:null};
 if (raw.length>512) return {status:'unreadable',resident:null};
 try {
  const copy=JSON.parse(raw);
  if (copy?.version===1 && Object.keys(copy).length===3) {
   const resident=browserResident(copy.name,copy.look);
   if (resident) return {status:'ready',raw,resident};
  }
 } catch { /* Leave unrecognized records untouched. */ }
 return {status:'unreadable',resident:null};
}

export function saveBrowserResident(storage:ProfileStorage, expectedRaw:string|null, name:string, look:string) {
 const resident=browserResident(name,look);
 if (!resident) return {status:'invalid'} as const;
 const current=readBrowserResident(storage);
 if (current.status!=='ready') return {status:current.status};
 if (current.raw!==expectedRaw) return {status:'changed'} as const;
 const raw=JSON.stringify(resident);
 if (raw!==current.raw) {
  try { storage.setItem(BROWSER_RESIDENT_KEY,raw); }
  catch { return {status:'save-failed'} as const; }
 }
 return {status:'saved',resident,raw} as const;
}
