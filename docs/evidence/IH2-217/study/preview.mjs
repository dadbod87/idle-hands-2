import {
  LIFETIME, SIGNS, changeDoorstepPreference, freshDoorstep,
  postDoorstepSign, publicDoorstep, quoteDoorstep, removeDoorstepSign,
} from './doorstep-model.mjs';

const owner = document.querySelector('#owner');
const visitor = document.querySelector('#visitor');
const sign = document.querySelector('#yard-sign');
const controls = document.querySelector('#controls');
const status = document.querySelector('#status');
const advance = document.querySelector('#advance');
const messages = {
  closed: 'This porch is closed to visitor notices.',
  'review-again': 'The porch setting changed. Review the sign again.',
  'already-posted': 'This porch already has a temporary notice.',
  cooldown: 'This porch is on a quiet break. Come back later.',
};
let state = freshDoorstep();
let actor = state.owner;
let now = 0;
let selected = null;
let review = null;
let nextReceipt = 0;

function text(tag, value) {
  const element = document.createElement(tag);
  element.textContent = value;
  return element;
}

function action(label, id, onClick, primary = false) {
  const button = text('button', label);
  button.type = 'button';
  button.id = id;
  if (primary) button.className = 'primary';
  button.onclick = onClick;
  return button;
}

function update(result, success, focus) {
  state = result.state;
  status.textContent = result.ok ? success : messages[result.reason] ?? 'The notice did not change.';
  render(focus);
}

function render(focus) {
  const current = publicDoorstep(state, now);
  const isOwner = actor === state.owner;
  owner.setAttribute('aria-pressed', String(isOwner));
  visitor.setAttribute('aria-pressed', String(!isOwner));
  advance.hidden = !current;
  const drawing = current?.design ?? review?.design;
  sign.hidden = !drawing;
  sign.textContent = drawing ? SIGNS[drawing].title : '';
  sign.dataset.ink = drawing ? SIGNS[drawing].ink : '';
  sign.dataset.preview = String(!current && !!review);
  controls.replaceChildren();

  if (isOwner) {
    controls.append(
      text('h2', state.allowed ? 'Visitor notices are allowed' : 'Visitor notices are off'),
      text('p', current
        ? 'Ellis posted this. It will come down in 15 minutes.'
        : 'Allow a temporary joke sign beside your door. Only people at your home can see it.'),
    );
    const prefer = action(state.allowed ? 'Turn notices off' : 'Allow visitor notices', 'preference', () => {
      const allowed = !state.allowed;
      update(changeDoorstepPreference(state, actor, allowed, state.revision),
        allowed ? 'Your visitors can now review a notice.' : 'Notices are off. The porch is clear.', 'preference');
    }, !state.allowed);
    controls.append(prefer);
    if (current) controls.append(action('Take down this sign', 'take-down', () => {
      update(removeDoorstepSign(state, actor, state.revision, now), 'Sign removed. Visitor permission is still on.', 'preference');
    }));
  } else if (current || !state.allowed || state.nextForHome > now) {
    controls.append(
      text('h2', current ? 'A sign is already up' : state.allowed ? 'This porch is on a break' : 'This porch is closed to notices'),
      text('p', current ? 'The owner can remove it. Anyone visiting this home can read it.' : 'You can still visit the house.'),
    );
  } else if (review) {
    controls.append(
      text('h2', 'Review your sign'),
      text('p', 'Visitors to 12 Thistle Row will see it for 15 minutes. Harper can take it down anytime.'),
    );
    const row = document.createElement('div');
    row.className = 'actions';
    row.append(
      action('Post this sign', 'post', () => {
        const result = postDoorstepSign(state, actor, state.home, review, 'notice-' + (++nextReceipt), now);
        review = null;
        update(result, 'Sign posted for 15 minutes.', 'visitor');
      }, true),
      action('Cancel preview', 'cancel', () => {
        review = null;
        status.textContent = 'Preview closed. Nothing was posted.';
        render('review');
      }),
    );
    controls.append(row);
  } else {
    const list = document.createElement('fieldset');
    list.append(text('legend', 'Choose a sign'));
    const inspect = action('Review sign', 'review', () => {
      if (!selected) return;
      const result = quoteDoorstep(state, actor, state.home, selected, now);
      if (!result.ok) {
        status.textContent = messages[result.reason] ?? 'This sign could not be reviewed.';
        return;
      }
      review = result.quote;
      status.textContent = 'Preview only.';
      render('post');
    }, true);
    inspect.disabled = !selected;
    for (const [id, design] of Object.entries(SIGNS)) {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'sign';
      input.value = id;
      input.checked = id === selected;
      input.onchange = () => { selected = id; inspect.disabled = false; };
      label.append(input, text('span', design.title));
      list.append(label);
    }
    controls.append(list, inspect);
  }
  if (focus) document.getElementById(focus)?.focus({ preventScroll: true });
}

function chooseRole(next) {
  actor = next;
  review = null;
  status.textContent = '';
  render();
}
owner.onclick = () => chooseRole('harper');
visitor.onclick = () => chooseRole('ellis');
advance.onclick = () => {
  now += LIFETIME;
  status.textContent = 'The notice expired. The quiet period is still in effect.';
  render(actor === state.owner ? 'preference' : 'visitor');
};
render();
