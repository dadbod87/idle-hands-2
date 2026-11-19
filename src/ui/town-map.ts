import {COMMONS_PATHS, COMMONS_PONDS, COMMONS_STOPS, COMMONS_TREES, TOWN_SIZE, townDistrict} from '../game/town-expansion.ts';
import type {Point, Stop} from '../game/world.ts';

const x = (value: number) => 100 * value / TOWN_SIZE.width + '%';
const y = (value: number) => 100 * value / TOWN_SIZE.height + '%';

function placed(className: string, left: number, top: number) {
 const element = document.createElement('span');
 element.className = className;
 element.style.left = x(left);
 element.style.top = y(top);
 return element;
}

function rectangle(className: string, left: number, top: number, width: number, height: number) {
 const element = placed(className, left, top);
 element.style.width = x(width);
 element.style.height = y(height);
 return element;
}

/** Use the same current room stops and walk callback as every other Places control. */
export function townMap(position: Point, stops: Stop[], walk: (stop: Stop) => void) {
 const details = document.createElement('details');
 details.className = 'places-group places-map';
 const summary = document.createElement('summary');
 summary.textContent = 'Town map';
 details.append(summary);
 details.addEventListener('toggle', () => {
  if (!details.open || details.childElementCount > 1) return;
  const figure = document.createElement('figure');
  const sketch = document.createElement('div');
  sketch.className = 'town-map-sketch';
  sketch.setAttribute('role', 'img');
  sketch.setAttribute('aria-label', 'Town map, north at the top. Town square is west of East Commons and the orchard. The riverwalk runs along the north. Willow meadow, the pond and South meadow are to the south.');

  sketch.append(rectangle('town-map-river', 0, 10, TOWN_SIZE.width, 2.6));
  sketch.append(rectangle('town-map-path', 14, 21, 24, 9));
  sketch.append(rectangle('town-map-path', 23, 12.6, 3, 33));
  for (const [left,top,width,height] of COMMONS_PATHS) {
   sketch.append(rectangle('town-map-path', left, top, width, height));
  }
  for (const [left,top,width,height] of COMMONS_PONDS) {
   sketch.append(rectangle('town-map-pond', left, top, width, height));
  }
  for (const tree of COMMONS_TREES) sketch.append(placed('town-map-tree', tree.x, tree.y));
  const pins = new Map<string, HTMLSpanElement>();
  const [pondLeft, pondTop, pondWidth, pondHeight] = COMMONS_PONDS[1];
  for (const {id,name,point} of [
   {id:'square',name:'Town square',point:{x:24,y:25}},
   ...COMMONS_STOPS.map(stop => ({
    id:stop.id,name:stop.name,
    point:stop.id==='commons-pond'?{x:pondLeft+pondWidth/2,y:pondTop+pondHeight/2}:stop.point,
   })),
  ]) {
   const pin = placed('town-map-landmark', point.x + .5, point.y + .5);
   pin.dataset.landmark = id;
   pin.textContent = name;
   pins.set(id, pin);
   sketch.append(pin);
  }
  const here = placed('town-map-player', position.x + .5, position.y + .5);
  sketch.append(here);
  const north = document.createElement('span');
  north.className = 'town-map-north';
  north.textContent = '↑ N';
  sketch.append(north);

  const caption = document.createElement('figcaption');
  caption.textContent = 'You are here · ' + townDistrict(position).name;
  figure.append(sketch, caption);
  details.append(figure);
  const landmarks = stops.filter(stop => pins.has(stop.id));
  if (landmarks.length) {
   const controls = document.createElement('div');
   controls.className = 'town-map-route';
   const label = document.createElement('label');
   label.textContent = 'Map destination';
   const select = document.createElement('select');
   select.add(new Option('Choose a landmark', ''));
   for (const stop of landmarks) select.add(new Option(stop.name, stop.id));
   label.append(select);

   const button = document.createElement('button');
   button.type = 'button';
   button.textContent = 'Walk there';
   button.className = 'primary';
   button.disabled = true;

   let selected: Stop | undefined;
   select.onchange = () => {
    if (selected) pins.get(selected.id)?.classList.remove('map-destination');
    selected = landmarks.find(stop => stop.id === select.value);
    if (selected) pins.get(selected.id)?.classList.add('map-destination');
    button.disabled = !selected;
   };
   button.onclick = () => { if (selected) walk(selected); };
   controls.append(label, button);
   details.append(controls);
  }
  const dialog = details.closest('dialog');
  const header = dialog?.querySelector('.dialog-head');
  if (dialog && header) dialog.scrollTop += summary.getBoundingClientRect().top - header.getBoundingClientRect().bottom - 8;
 });
 return details;
}
