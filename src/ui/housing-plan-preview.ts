import {yardAnchors} from '../design/housing-contract.ts';
import type {HousingPlan} from '../design/housing-options.ts';
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

  const anchors = yardAnchors(plan.id);
  const parcel = PARCELS[0];
  const {width, height} = parcel.lot;
  const lot = element('div', 'housing-preview-lot');
  lot.style.aspectRatio = `${width} / ${height}`;
  lot.setAttribute('aria-hidden', 'true');
  const footprint = position(element('span', 'housing-preview-footprint'), width / 2, parcel.foot.y - parcel.lot.y, width, height);
  footprint.style.width = `${100 * plan.width / width}%`;
  footprint.style.height = `${100 * plan.height / height}%`;
  footprint.style.backgroundColor = plan.roof;
  lot.append(footprint, position(element('span', 'housing-preview-door'), parcel.foot.x - parcel.lot.x, parcel.foot.y - parcel.lot.y, width, height));
  for (const anchor of anchors) {
    const spot = position(element('span', 'housing-preview-nook'), anchor.x, anchor.y, width, height);
    spot.title = anchor.slot.replaceAll('-', ' ');
    lot.append(spot);
  }
  const outdoors = element('figure', '');
  outdoors.append(lot, element('figcaption', '', `Outside · ${anchors.length} yard spots`));
  maps.append(indoors, outdoors);
  details.append(element('p', 'housing-preview-legend', 'Circles mark furnishing spots. The square marks the door.' +
    (plan.tier === 2 ? ' The dashed line marks the extra room.' : '')));
  return details;
}
