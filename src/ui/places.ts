import {placesView,placeSearchKey} from '../game/places-view.ts';
import type {WorkshopState} from '../game/live-workshop.ts';
import type {Point, Room, Stop} from '../game/world.ts';
import {inkwoodMap,townMap,type MapResident} from './town-map.ts';

export function renderPlaces(body: HTMLElement, options: {
 room: Room; position: Point; stops: Stop[]; state: WorkshopState; goal: {id: string; destination?: string};
 now: number; savedHomes?:()=>void; wave?:()=>Promise<void>; peers?:readonly MapResident[]|null; neighborhood?: {districtId: string; ownerPlotId?: string}; walk: (stop: Stop) => void;
 outside?: {stops: readonly Stop[]; walk: (stop: Stop) => void};
}) {
 const view = placesView(options.room, options.stops, options.state, options.goal, options.now, options.neighborhood);
 const intro = document.createElement('p');
 intro.className = 'places-intro';
 intro.textContent = 'Choose a place to walk. Inspect or enter when you arrive.';
 body.append(intro);

 const appendStops = (host: HTMLElement, stops: readonly Stop[], route?: (stop: Stop) => void) => {
  for (const stop of stops) {
   const button = document.createElement('button');
   button.type = 'button';
   button.className = 'destination';
   button.textContent = route ? 'Walk outside to ' + stop.name + '\u00a0→' : 'Walk to ' + stop.name + ' →';
   button.dataset.destination = stop.id;
   button.onclick = () => (route ?? options.walk)(stop);
   host.append(button);
  }
 };

 const browse = document.createElement('div');
 if(options.room==='trail')browse.append(inkwoodMap(options.position,options.stops,options.walk));
 if(options.savedHomes){
  const saved=document.createElement('button');
  saved.type='button';saved.className='destination';saved.textContent='Saved home addresses';
  saved.onclick=options.savedHomes;
  browse.append(saved);
 }
 if (view.primary.length) {
  const heading = document.createElement('h3');
  heading.textContent = view.heading;
  const primary = document.createElement('section');
  primary.className = 'places-primary';
  primary.setAttribute('aria-label', view.heading);
  appendStops(primary, view.primary);
  browse.append(heading, primary);
 }
 for (const group of view.groups) {
  const detail = document.createElement('details');
  const summary = document.createElement('summary');
  detail.className = 'places-group';
  detail.dataset.placesGroup = group.id;
  summary.textContent = group.title + ' · ' + group.stops.length;
  detail.append(summary);
  appendStops(detail, group.stops);
  browse.append(detail);
 }
 if (options.outside?.stops.length) {
  const detail = document.createElement('details');
  const summary = document.createElement('summary');
  detail.className = 'places-group';
  summary.textContent = 'Outside the workshop';
  const hint = document.createElement('p');
  hint.textContent = 'Take the door and continue to your stop.';
  detail.append(summary, hint);
  appendStops(detail, options.outside.stops, options.outside.walk);
  browse.append(detail);
 }
 const map = options.room==='square'?townMap(options.position,options.stops,options.walk,options.peers,options.wave):undefined;
 if (map) browse.append(map.element);
 body.append(browse);

 // Chromium does not account for the sticky title when tabbing to a result.
 const keepFocusInView = (event: FocusEvent) => {
  const target = event.target;
  const dialog = body.closest('dialog');
  const header = dialog?.querySelector('.dialog-head');
  if (!(target instanceof HTMLElement) || !target.matches(':focus-visible') || !dialog || !header) return;
  const bounds = target.getBoundingClientRect();
  const top = header.getBoundingClientRect().bottom + 8;
  const bottom = dialog.getBoundingClientRect().bottom - 8;
  if (bounds.top < top) dialog.scrollTop += bounds.top - top;
  else if (bounds.bottom > bottom) dialog.scrollTop += bounds.bottom - bottom;
 };
 browse.addEventListener('focusin', keepFocusInView);

 if (!view.groups.length && !options.outside?.stops.length) return map?.updateResidents;
 const label = document.createElement('label');
 label.className = 'places-search';
 label.textContent = 'Find a place';
 const input = document.createElement('input');
 input.type = 'search';
 input.autocomplete = 'off';
 input.enterKeyHint = 'search';
 label.append(input);

 const status = document.createElement('p');
 status.className = 'places-search-status';
 status.setAttribute('role', 'status');
 const results = document.createElement('section');
 results.setAttribute('aria-label', 'Matching places');
 results.hidden = true;

 label.addEventListener('focusin', keepFocusInView);
 results.addEventListener('focusin', keepFocusInView);

 const searchable = options.stops.map(stop => ({stop, name: placeSearchKey(stop.name)}));
 const searchableOutside = (options.outside?.stops ?? []).map(stop => ({stop, name: placeSearchKey(stop.name)}));
 input.addEventListener('input', () => {
  const query = placeSearchKey(input.value).trim();
  browse.hidden = query.length > 0;
  results.hidden = !query;
  results.replaceChildren();
  if (!query) {
   status.textContent = '';
   return;
  }
  const terms = query.split(/\s+/);
  const matches = searchable.filter(({name}) => terms.every(term => name.includes(term)));
  const outsideMatches = searchableOutside.filter(({name}) => terms.every(term => name.includes(term)));
  const count = matches.length + outsideMatches.length;
  status.textContent = count === 0 ? 'No matching places here.' : count === 1 ? '1 place found' : count + ' places found';
  appendStops(results, matches.map(({stop}) => stop));
  if (options.outside) appendStops(results, outsideMatches.map(({stop}) => stop), options.outside.walk);
 });
 body.insertBefore(label, browse);
 body.insertBefore(status, browse);
 body.insertBefore(results, browse);
 return map?.updateResidents;
}
