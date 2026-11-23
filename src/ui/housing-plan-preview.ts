import {contractPlan,yardAnchors} from '../design/housing-contract.ts';
import type {HousingPlan} from '../design/housing-options.ts';
import {furnishingIcon} from '../game/home-identity.ts';
import {PROPS} from '../game/live-workshop.ts';
import type {TownPlot} from './town-client.ts';
import {homeSlots} from '../game/live-home-layout.ts';
import {PARCELS} from '../game/neighborhood.ts';
import {worlds} from '../game/world.ts';

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, label?: string) {
  const node = document.createElement(tag);
  node.className = className;
  if (label) node.textContent = label;
  return node;
}

function position(node: HTMLElement, x: number, y: number, width: number, height: number) {
  node.style.left = `${100 * x / width}%`;
  node.style.top = `${100 * y / height}%`;
  return node;
}

export function housingPlanPreview(plan: HousingPlan) {
  const details = element('details', 'housing-preview');
  details.dataset.housingPreview = plan.id;
  details.append(element('summary', '', `Preview ${plan.name}`));
  const maps = element('div', 'housing-preview-maps');
  details.append(maps);

  const slots = homeSlots(plan.tier);
  const room = worlds[plan.tier === 2 ? 'home-expanded' : 'home'];
  const indoors = element('figure', '');
  const floor = element('div', 'housing-preview-floor');
  floor.style.aspectRatio = `${room.width} / ${room.height}`;
  floor.setAttribute('aria-hidden', 'true');
  if (plan.tier === 2) {
    const annex = element('span', 'housing-preview-annex');
    annex.style.left = `${100 * worlds.home.width / room.width}%`;
    floor.append(annex);
  }
  for (const slot of slots) {
    const nook = position(element('span', 'housing-preview-nook'), slot.x, slot.y, room.width, room.height);
    nook.title = slot.label;
    floor.append(nook);
  }
  const door = room.stops[0].point;
  floor.append(position(element('span', 'housing-preview-door'), door.x, door.y, room.width, room.height));
  indoors.append(floor, element('figcaption', '', `Inside · ${slots.length} furnishing nooks`));

  const outdoors = yardMap(plan);
  maps.append(indoors, outdoors);
  details.append(element('p', 'housing-preview-legend', 'Circles mark furnishing spots. The square marks the door.' +
    (plan.tier === 2 ? ' The dashed line marks the extra room.' : '')));
  return details;
}

function yardMap(plan: Pick<HousingPlan,'id'|'width'|'height'|'roof'>, home?: TownPlot) {
  const anchors = yardAnchors(plan.id);
  const parcel = PARCELS[0];
  const { width, height } = parcel.lot;
  const lot = element('div', 'housing-preview-lot');
  lot.style.aspectRatio = `${width} / ${height}`;
  lot.setAttribute('aria-hidden', 'true');
  const footprint = position(element('span', 'housing-preview-footprint'), width / 2, parcel.foot.y - parcel.lot.y, width, height);
  footprint.style.width = `${100 * plan.width / width}%`;
  footprint.style.height = `${100 * plan.height / height}%`;
  footprint.style.backgroundColor = plan.roof;
  lot.append(footprint, position(element('span', 'housing-preview-door'), parcel.foot.x - parcel.lot.x, parcel.foot.y - parcel.lot.y, width, height));
  let used = 0;
  for (const anchor of anchors) {
    const prop = home?.yard?.[anchor.slot];
    const spot = position(element('span', prop ? 'housing-preview-item' : 'housing-preview-nook'), anchor.x, anchor.y, width, height);
    const name = anchor.slot.replaceAll('-', ' ');
    spot.title = prop ? `${name} · ${PROPS[prop].name}` : name;
    if (home) spot.dataset.yardSpot = anchor.slot;
    if (prop) {
      used++;
      const image = document.createElement('img');
      image.alt = '';
      image.src = furnishingIcon(prop, home?.letterboxMotif ?? 'leaf');
      spot.append(image);
    }
    lot.append(spot);
  }
  const figure = element('figure', '');
  figure.append(lot, element('figcaption', '', home
    ? `${used} of ${anchors.length} yard spots used`
    : `Outside · ${anchors.length} yard spots`));
  return figure;
}

export function housingYardPreview(home: TownPlot, open: boolean, onToggle: (open: boolean) => void) {
  const plan = contractPlan(home.planId ?? (home.level===2?'legacy-home-expanded-exterior':'legacy-home-starter-exterior'));
  const details = element('details', 'housing-preview housing-yard-preview');
  details.open = open;
  details.append(element('summary', '', 'See your yard'), yardMap(plan, home));
  details.addEventListener('toggle', () => {
    if (details.isConnected) onToggle(details.open);
  });
  return details;
}
