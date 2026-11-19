import {SNACK_CAP} from '../../src/game/orchard.ts';
import {OFFER_WINDOW, offerStep, privateParcelView, start} from './model.ts';

const residents = {sorrel: 'Sorrel', flint: 'Flint', jun: 'Jun'} as const;
type Resident = keyof typeof residents;
type Scenario = 'leave'|'receive'|'full'|'return';
type ShelfRequest = Parameters<typeof offerStep>[2];

const clockStart = 1_795_177_400_000;
const work = document.querySelector<HTMLElement>('#work')!;
const count = document.querySelector<HTMLElement>('#pouch-count')!;
const receipt = document.querySelector<HTMLElement>('#receipt')!;
const scenarioControl = document.querySelector<HTMLSelectElement>('#scenario')!;
const actor: Resident = 'sorrel';
let scenario: Scenario;
let clock: number;
let counter = 0;
let state: ReturnType<typeof start>;

function messages(title: string, details: string) {
 const heading = document.createElement('h2');
 heading.id = 'work-title';
 heading.textContent = title;
 const body = document.createElement('p');
 body.textContent = details;
 work.replaceChildren(heading, body);
}

function action(label: string, run: () => void, primary = false) {
 const control = document.createElement('button');
 control.type = 'button';
 control.textContent = label;
 if (primary) control.className = 'primary';
 control.addEventListener('click', run);
 return control;
}

function act(request: ShelfRequest, message: string) {
 const result = offerStep(state, actor, request, clock);
 state = result.state;
 paint();
 receipt.textContent = result.ok ? message : result.message;
 receipt.tabIndex = -1;
 receipt.focus();
}

function paint() {
 const available = state.available[actor];
 const parcels = privateParcelView(state, actor);
 const outgoing = parcels.find(item => item.sender === actor && (item.state === 'waiting' || item.state === 'declined'));
 const incoming = parcels.find(item => item.recipient === actor && item.state === 'waiting' && clock < item.expiresAt);
 count.textContent = available + ' of ' + SNACK_CAP + ' snacks' + (outgoing ? ' · 1 parcel held' : '');
 const actions = document.createElement('div');
 actions.className = 'actions';

 if (outgoing) {
  const name = residents[outgoing.recipient as Resident];
  const expired = clock >= outgoing.expiresAt;
  messages(expired ? 'Parcel expired' : outgoing.state === 'declined' ? 'Parcel declined' : 'Waiting for ' + name,
   'Your snack still has a place in your pouch. You can bring it back.');
  actions.append(action('Take back snack', () => act({kind:'reclaim',id:'take-'+ ++counter,offerId:outgoing.id},
   'Snack returned to your pouch.'), true));
 } else if (incoming) {
  const name = residents[incoming.sender as Resident];
  const hours = Math.ceil((incoming.expiresAt-clock)/3_600_000);
  messages('A snack from ' + name, '“The committee saved you lunch.” · ' + hours + ' h to collect');
  const full = available >= SNACK_CAP;
  const accept = action('Accept snack', () => act({kind:'accept',id:'accept-'+ ++counter,offerId:incoming.id},
   'Snack added to your pouch.'), true);
  accept.disabled = full;
  if (full) {
   const help = document.createElement('p');
   help.textContent = 'Your pouch is full. The parcel can wait while you make room.';
   work.append(help);
   actions.append(action('Taste a snack', () => act({kind:'taste',id:'taste-'+ ++counter},
    'Snack tasted. There’s room to accept the parcel now.')));
  }
  actions.prepend(accept);
  actions.append(action('Decline', () => act({kind:'decline',id:'decline-'+ ++counter,offerId:incoming.id},
   name + ' can take the snack back.')));
 } else if (scenario === 'leave') {
  messages('Leave one packed snack', 'They have 24 hours to pick it up. You can take it back until they do.');
  const picker = document.createElement('select');
  picker.id = 'recipient';
  for (const [id,name] of Object.entries(residents)) {
   if (id !== actor) picker.append(new Option(name,id));
  }
  const label = document.createElement('label');
  label.htmlFor = picker.id;
  label.textContent = 'For';
  work.append(label,picker);
  actions.append(action('Leave snack', () => {
   const recipient = picker.value as Resident;
   const number = ++counter;
   act({kind:'offer',id:'send-'+number,offerId:'offer-'+number,recipient},'Snack left for ' + residents[recipient] + '.');
  }, true));
 } else {
  messages('The shelf is clear', 'New parcels will wait for you here.');
 }
 if (actions.childElementCount) work.append(actions);
}

function reset() {
 scenario = scenarioControl.value as Scenario;
 state = start({sorrel:scenario==='full'?3:2,flint:1,jun:0},clockStart);
 clock = clockStart;
 if (scenario === 'receive' || scenario === 'full') {
  state = offerStep(state,'flint',{kind:'offer',id:'fixture-send',offerId:'fixture',recipient:actor},clockStart).state;
  clock += 16 * 3_600_000;
 } else if (scenario === 'return') {
  state = offerStep(state,actor,{kind:'offer',id:'fixture-send',offerId:'fixture',recipient:'flint'},clockStart).state;
  clock += OFFER_WINDOW;
 }
 receipt.textContent = '';
 paint();
}
scenarioControl.addEventListener('change',reset);
reset();
