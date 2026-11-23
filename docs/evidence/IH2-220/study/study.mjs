import { stops } from '../../IH2-213/study/layout.mjs';
import { DESTINATIONS, firstVisit, millAction, willowView, WILLOW } from './willow.mjs';

const HOUR = 3_600_000;
const byId = (id) => document.getElementById(id);
const placeNames = { homes: 'Sample yard' };
const placeName = (id) => placeNames[id] ?? stops[id].name;
const descriptions = {
  gate: 'Follow the south crossing to reach the mill. The North Walk repair can wait.',
  notice: 'The mill recommends the long way round. The long way round has filed no objections.',
  woodYard: 'Prepared willow is on the counter. Leave a basket on the rack while you explore.',
  canal: 'Something is floating past. The mill board would like to know if it is official.',
  quay: 'The ferry is “back shortly.” There is no date on the sign.',
  homes: 'A demonstration porch with a spot for one decoration.',
};

let now = Date.now();
let state = firstVisit(now);
let review = null;
const destination = byId('destination');
const receipt = byId('receipt');

function act(action) {
  const result = millAction(state, action, now);
  state = result.state;
  review = null;
  draw();
  receipt.textContent = result.message;
}

function moveFocus() {
  (byId('actions').querySelector('button') ?? byId('action-heading')).focus();
}

function button(label, onClick, secondary = false) {
  const control = document.createElement('button');
  control.type = 'button';
  control.textContent = label;
  if (secondary) control.className = 'secondary';
  control.addEventListener('click', () => {
    onClick();
    if (!control.isConnected) moveFocus();
  });
  byId('actions').append(control);
}

function walkTo(id) {
  act({ kind: 'walk', destination: id });
}

function rackLabel(view) {
  if (view.ready) return 'Ready to collect';
  if (view.remaining != null) return 'Ready in ' + Math.ceil(view.remaining / HOUR) + 'h';
  return 'Empty';
}

function nextAction(view) {
  const { place, held, job, basket } = state;
  if (basket === 'yard') return ['On the porch', 'Your basket is displayed in the sample yard.'];
  if (basket === 'bag') {
    if (place !== 'homes') {
      button('Walk to sample yard', () => walkTo('homes'));
      return ['A place for the basket', 'Take it to the porch to try displaying it.'];
    }
    button('Place basket on porch', () => act({ kind: 'display' }));
    return ['Try it on the porch', 'Your basket stays in the Bag until you place it.'];
  }
  if (view.ready) {
    if (place === 'woodYard') button('Collect basket', () => act({ kind: 'collect' }));
    else button('Return to willow yard', () => walkTo('woodYard'));
    return ['Basket ready', 'One basket is waiting at the rack.'];
  }
  if (job) {
    if (place !== 'canal') button('Walk to canal steps', () => walkTo('canal'));
    if (place !== 'quay') button('Visit the ferry berth', () => walkTo('quay'), true);
    return ['While you wait', 'The same basket deadline follows you between stops.'];
  }
  if (place !== 'woodYard') {
    button('Walk to willow yard', () => walkTo('woodYard'));
    return ['Try millwork', 'You can reach the willow yard today.'];
  }
  if (review !== null) {
    button('Start basket · 3 willow', () => act({ kind: 'weave', revision: review }));
    button('Keep the willow', () => { review = null; draw(); }, true);
    return ['Review willow basket', 'Uses 3 willow switches. Pick up 1 basket in 6 hours.'];
  }
  if (view.available && held < WILLOW.carryCap) {
    button('Gather willow', () => act({ kind: 'gather' }), held >= WILLOW.cost);
  }
  if (held >= WILLOW.cost) button('Review basket', () => { review = state.revision; draw(); });
  return ['Weave a willow basket', view.available + ' prepared willow at the yard. The basket takes 3.'];
}

function draw() {
  const view = willowView(state, now);
  byId('place').textContent = placeName(state.place);
  byId('description').textContent = descriptions[state.place];
  byId('contents').textContent = state.held + ' willow · ' + Number(state.basket === 'bag') + ' basket';
  byId('rack').textContent = rackLabel(view);
  byId('basket-caption').textContent = state.basket === 'yard' ? 'On display' : state.basket === 'bag'
    ? 'Packed basket' : view.ready ? 'At the rack' : state.job ? 'Design in progress' : 'Sample basket';
  byId('placed-basket').hidden = state.basket !== 'yard' || state.place !== 'homes';
  const selected = destination.value;
  const options = DESTINATIONS.filter((id) => id !== state.place);
  destination.replaceChildren(...options.map((id) => new Option(placeName(id), id)));
  if (options.includes(selected)) destination.value = selected;
  byId('actions').replaceChildren();
  const [title, hint] = nextAction(view);
  byId('action-heading').textContent = title;
  byId('hint').textContent = hint;
}

destination.form.addEventListener('submit', (event) => {
  event.preventDefault();
  walkTo(destination.value);
});
byId('advance').addEventListener('click', () => {
  now += HOUR;
  review = null;
  draw();
  receipt.textContent = willowView(state, now).ready ? 'The basket is ready at the mill.' : 'One study hour passed.';
});
draw();
