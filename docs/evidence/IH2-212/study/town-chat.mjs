export const limits = Object.freeze({ characters: 160, lines: 24, bubbleMs: 5500 });
export const residents = Object.freeze({
  ellis: 'Ellis',
  marlow: 'Marlow',
  pip: 'Pip',
});

export function sendLine(history, { id, sender, room, message, at }) {
  if (!Object.hasOwn(residents, sender) || !['square', 'workshop'].includes(room) ||
      typeof id !== 'string' || !id || typeof message !== 'string' ||
      !Number.isSafeInteger(at) || at < 0) {
    return { history, error: 'This line could not be recorded.' };
  }
  if (history.some(line => line.id === id)) return { history, error: null };

  const text = message.replace(/\s+/gu, ' ').trim();
  if (!text) return { history, error: 'Write a message first.' };
  if (Array.from(text).length > limits.characters) {
    return { history, error: `Keep Town messages to ${limits.characters} characters.` };
  }
  const line = { id, sender, room, channel: 'Town', text, at };
  return { history: [...history, line].slice(-limits.lines), error: null };
}

export function currentBubble(history, room, now, quiet) {
  if (quiet) return null;
  return history.findLast(line =>
    line.room === room && line.at <= now && now < line.at + limits.bubbleMs
  ) ?? null;
}
