import { currentBubble, limits, residents, sendLine } from './town-chat.mjs';

const byId = id => document.getElementById(id);
const world = document.querySelector('.world');
const dialog = document.querySelector('dialog');
const speech = document.querySelector('.speech');
const historyView = document.querySelector('.history');
const announcement = document.querySelector('.announcement');
const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
let room = 'square';
let history = [];
let nextId = 0;
let bubbleTimer;

function textNode(tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}

function showBubble() {
  clearTimeout(bubbleTimer);
  const now = Date.now();
  const line = currentBubble(history, room, now, byId('quiet').checked);
  speech.hidden = !line;
  if (!line) return;
  speech.dataset.speaker = line.sender;
  speech.querySelector('.speaker').textContent = residents[line.sender];
  speech.querySelector('.words').textContent = line.text;
  bubbleTimer = setTimeout(showBubble, Math.max(0, line.at + limits.bubbleMs - now));
}

function showHistory(follow = false) {
  const current = new Set(history.map(line => line.id));
  const keepBottom = follow || historyView.scrollHeight - historyView.clientHeight - historyView.scrollTop < 4;
  for (const row of [...historyView.children]) {
    if (!current.has(row.dataset.lineId)) row.remove();
  }
  const painted = new Set([...historyView.children].map(row => row.dataset.lineId));
  for (const line of history) {
    if (painted.has(line.id)) continue;
    const row = document.createElement('li');
    row.dataset.lineId = line.id;
    const who = textNode('strong', residents[line.sender]);
    const timestamp = textNode('time', time.format(line.at));
    timestamp.dateTime = new Date(line.at).toISOString();
    row.append(who, timestamp, textNode('p', line.text));
    historyView.append(row);
  }
  if (keepBottom) historyView.scrollTop = historyView.scrollHeight;
}

function post(sender, message, fromRoom = room) {
  const result = sendLine(history, {
    id: String(++nextId), sender, room: fromRoom, message, at: Date.now(),
  });
  if (result.error) return result.error;
  history = result.history;
  announcement.textContent = residents[sender] + ' says ' + history.at(-1).text;
  showBubble();
  showHistory();
  return '';
}

byId('open-chat').onclick = () => {
  dialog.showModal();
  showHistory(true);
  byId('message').focus();
};
byId('close-chat').onclick = () => dialog.close();
dialog.addEventListener('close', () => byId('open-chat').focus());
byId('composer').addEventListener('submit', event => {
  event.preventDefault();
  const input = byId('message');
  const error = post('ellis', input.value);
  byId('chat-status').textContent = error || 'Sent to Town.';
  if (!error) input.value = '';
  input.focus();
});
byId('quiet').addEventListener('change', showBubble);
byId('example').onclick = () => post('pip', 'The bench is free. Its complaint form is occupied.', 'square');
byId('change-room').onclick = () => {
  room = room === 'square' ? 'workshop' : 'square';
  world.dataset.room = room;
  world.querySelector('.location').textContent = room === 'square' ? 'Town square' : 'Workshop';
  byId('change-room').textContent = room === 'square' ? 'Enter workshop' : 'Return to the square';
  showBubble();
};
document.addEventListener('visibilitychange', showBubble);
post('marlow', 'The workshop is open. The minutes have been postponed.', 'square');
