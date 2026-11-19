import {advanceOpening, FACINGS, LOOKS, newOpening, STORIES} from './opening.mjs';

const arrival = document.querySelector('#arrival');
const lodging = document.querySelector('#lodging');
const street = document.querySelector('#street');
const nameField = document.querySelector('#resident-name');
const nameError = document.querySelector('#name-error');
const preview = document.querySelector('#preview');
const looks = document.querySelector('#looks');
const story = document.querySelector('#story');
const wake = document.querySelector('#wake');
const door = document.querySelector('#door');
const roomPerson = document.querySelector('#room-person');
const streetPerson = document.querySelector('#street-person');
let facing = 0;
let state = newOpening();

function renderPreview() {
 preview.dataset.look = arrival.elements.look.value;
 preview.style.setProperty('--facing', (-448 * facing) + 'px');
 preview.setAttribute('aria-label', 'Resident preview, ' + FACINGS[facing].toLowerCase());
}

for (const [index, look] of LOOKS.entries()) {
 const label = document.createElement('label');
 const radio = document.createElement('input');
 radio.type = 'radio';
 radio.name = 'look';
 radio.value = look;
 radio.checked = index === 0;
 radio.setAttribute('aria-label', 'Appearance ' + (index + 1));
 const tile = document.createElement('span');
 tile.className = 'look-tile';
 tile.setAttribute('aria-hidden', 'true');
 const sprite = document.createElement('span');
 sprite.className = 'sprite';
 sprite.dataset.look = look;
 tile.append(sprite);
 label.append(radio, tile);
 looks.append(label);
}
for (const [key, value] of Object.entries(STORIES)) story.add(new Option(value.title, key));

document.querySelector('#turn').addEventListener('click', () => {
 facing = (facing + 1) % FACINGS.length;
 renderPreview();
});
looks.addEventListener('change', renderPreview);
function clearNameError() {
 nameError.hidden = true;
 nameError.textContent = '';
 nameField.removeAttribute('aria-invalid');
}
nameField.addEventListener('input', clearNameError);

arrival.addEventListener('submit', event => {
 event.preventDefault();
 const draft = {name: nameField.value, look: arrival.elements.look.value, story: story.value};
 const next = advanceOpening(state, {kind: 'confirm', draft});
 if (next === state) {
  nameError.hidden = false;
  nameError.textContent = 'Enter a name up to 24 characters with letters or numbers.';
  nameField.setAttribute('aria-invalid', 'true');
  nameField.focus();
  return;
 }
 state = next;
 arrival.hidden = true;
 lodging.hidden = false;
 wake.hidden = false;
 door.hidden = true;
 roomPerson.classList.remove('standing');
 roomPerson.dataset.look = state.resident.look;
 document.querySelector('#welcome').textContent = 'Good morning, ' + state.resident.name + '.';
 document.querySelector('#story-note').textContent = STORIES[state.resident.story].note;
 document.querySelector('#room-title').focus();
});

wake.addEventListener('click', () => {
 state = advanceOpening(state, {kind: 'wake'});
 if (state.phase !== 'standing') return;
 roomPerson.classList.add('standing');
 door.hidden = false;
 wake.hidden = true;
 door.focus();
});

door.addEventListener('click', () => {
 state = advanceOpening(state, {kind: 'exit'});
 if (state.phase !== 'street') return;
 lodging.hidden = true;
 street.hidden = false;
 streetPerson.dataset.look = state.resident.look;
 document.querySelector('#street-title').focus();
});

document.querySelector('#restart').addEventListener('click', () => {
 state = newOpening();
 facing = 0;
 arrival.reset();
 clearNameError();
 renderPreview();
 street.hidden = true;
 arrival.hidden = false;
 nameField.focus();
});
renderPreview();
