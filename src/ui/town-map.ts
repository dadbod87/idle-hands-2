import {COMMONS_PATHS, COMMONS_PONDS, COMMONS_STOPS, COMMONS_TREES, TOWN_SIZE, townDistrict} from '../game/town-expansion.ts';
import type {Point} from '../game/world.ts';

const titles: Record<(typeof COMMONS_STOPS)[number]['id'],string> = {
 'commons-riverwalk': 'Riverwalk',
 'commons-green': 'East Commons',
 'commons-orchard': 'Orchard',
 'commons-pond': 'Pond',
 'commons-west': 'Willow meadow',
 'commons-meadow': 'South meadow',
};

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

/** Optional paper-map view built once. Movement authority stays with the Places list. */
export function townMap(position: Point) {
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
  const [pondLeft, pondTop, pondWidth, pondHeight] = COMMONS_PONDS[1];
  for (const {id,name,point} of [
   {id:'square',name:'Town square',point:{x:24,y:25}},
   ...COMMONS_STOPS.map(stop => ({
    id:stop.id,name:titles[stop.id],
    point:stop.id==='commons-pond'?{x:pondLeft+pondWidth/2,y:pondTop+pondHeight/2}:stop.point,
   })),
  ]) {
   const pin = placed('town-map-landmark', point.x + .5, point.y + .5);
   pin.dataset.landmark = id;
   pin.textContent = name;
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
  const dialog = details.closest('dialog');
  const header = dialog?.querySelector('.dialog-head');
  if (dialog && header) dialog.scrollTop += summary.getBoundingClientRect().top - header.getBoundingClientRect().bottom - 8;
 });
 return details;
}
