import {contribute, draft, jobs, newProject, phase, quote, tourAvailable} from './project-model.mjs';

const find = selector => document.querySelector(selector);
const resident = find('#resident');
const stage = find('#stage');
const progress = find('#progress');
const carried = find('#carried');
const status = find('.outcome');
const review = find('.review');
const tour = find('.tour');
const choices = find('#plant-choices');
const tourText = tour.querySelector('p');
const jobButtons = [...document.querySelectorAll('[data-work]')];
const pineAction = find('[data-work="frame"]');
const confirm = find('#confirm');
const draftActors = {
  avery: {pine: 0, stamps: 0, plant: null},
  morgan: {pine: 6, stamps: 0, plant: null},
  noor: {pine: 0, stamps: 3, plant: null},
  solo: {pine: 6, stamps: 3, plant: null},
};
const messages = {
  'visit-project': 'Visit the glasshouse before offering',
  'missing-field-notes': 'Needs three Inkwood stamps',
  'missing-pine': 'Needs two carried pine',
  'already-recorded': 'Recorded',
};
const stageTitles = {overgrown: 'Volunteer jobs', repair: 'Repairs underway', open: 'The glasshouse is open'};
let project = newProject();
let price = null;
let repairTimer;
let lastPhase;
const origin = Date.now();
const now = () => Math.max(0, Date.now() - origin) * 3600;

function info() {
  const actor = draftActors[resident.value];
  return {actor, facts: {atProject: true, pine: actor.pine, hasThreeInkwoodStamps: actor.stamps === 3, hasClaimedTour: actor.plant !== null}};
}

function text(node, value) {
  if (node.textContent !== value) node.textContent = value;
}

function paint() {
  const time = now(), current = phase(project, time);
  const {actor, facts} = info();
  text(stage, stageTitles[current]);
  text(carried, actor.pine + ' pine · ' + actor.stamps + ' Inkwood stamps' + (actor.plant ? ' · Kept ' + actor.plant : ''));
  if (current === 'repair') {
    const hours = Math.ceil((project.opensAt - time) / 3_600_000);
    text(progress, 'Opening in ' + hours + ' rehearsal ' + (hours === 1 ? 'hour.' : 'hours.'));
  } else if (current === 'open') {
    text(progress, 'No attendance required. Pick a first-tour keepsake whenever you arrive.');
  } else {
    const finished = jobs.filter(job => project.completed[job] !== null).length;
    text(progress, finished + ' of 3 jobs recorded.');
  }
  for (const button of jobButtons) {
    const next = quote(project, facts, button.dataset.work);
    const blocked = Boolean(next.blocked);
    if (button.disabled !== blocked) button.disabled = blocked;
    text(button, messages[next.blocked] ?? button.dataset.label);
  }
  tour.hidden = current !== 'open';
  choices.hidden = !tourAvailable(project, facts, time);
  text(tourText, actor.plant ? 'You kept ' + actor.plant + ' from your first tour.' :
    'Choose one keepsake for home. Fresh visitors and past volunteers pick from the same plants.');
  if (current === 'repair' && repairTimer === undefined) repairTimer = window.setInterval(paint, 250);
  if (current === 'open' && repairTimer !== undefined) {
    window.clearInterval(repairTimer);
    repairTimer = undefined;
    if (lastPhase === 'repair') status.textContent = 'The doors are open.';
  }
  lastPhase = current;
}

function commit(request) {
  const {actor, facts} = info();
  const result = contribute(project, facts, request, now());
  if (result.blocked) {
    status.textContent = messages[result.blocked] ?? 'Review the current contribution.';
  } else {
    project = result.project;
    actor.pine -= result.pineDebit;
    status.textContent = 'Job recorded for the town.';
  }
  review.hidden = true;
  price = null;
  paint();
  stage.tabIndex = -1;
  stage.focus();
}

for (const button of jobButtons) {
  button.dataset.label = button.textContent;
  button.addEventListener('click', () => {
    const {facts} = info(), request = quote(project, facts, button.dataset.work);
    if (request.blocked) return;
    if (!request.pineCost) {
      commit(request);
      return;
    }
    price = request;
    status.textContent = '';
    find('#review-price').textContent = 'Give ' + draft.pineCost + ' pine. You will keep ' + (facts.pine - draft.pineCost) + '.';
    review.hidden = false;
    find('#review-title').focus();
  });
}
resident.addEventListener('change', () => {
  price = null;
  review.hidden = true;
  status.textContent = '';
  paint();
});
confirm.addEventListener('click', () => { if (price) commit(price); });
find('#cancel').addEventListener('click', () => {
  price = null;
  review.hidden = true;
  status.textContent = 'Your pine stays in your Bag.';
  pineAction.focus();
});
for (const button of choices.querySelectorAll('button')) button.addEventListener('click', () => {
  const {actor, facts} = info();
  if (!tourAvailable(project, facts, now())) return;
  actor.plant = button.dataset.plant;
  status.textContent = actor.plant + ' kept in the rehearsal.';
  paint();
  stage.tabIndex = -1;
  stage.focus();
});
paint();
