const MINUTE = 60_000;
export const LIFETIME = 15 * MINUTE;
export const COOLDOWN = 8 * 60 * MINUTE;
export const SIGNS = Object.freeze({
  meeting: { title: 'This meeting could have been a garden.', ink: 'green' },
  vacancy: { title: 'Help wanted. Must be able to stand on a porch.', ink: 'red' },
  forms: { title: 'All knocks require a form in triplicate.', ink: 'blue' },
});

export function freshDoorstep() {
  return {
    owner: 'harper', home: '12-thistle-row', revision: 0, allowed: false,
    sign: null, nextBySender: {}, nextForHome: 0, receipts: [],
  };
}

function complete(state, patch) {
  return { ok: true, state: { ...state, ...patch, revision: state.revision + 1 } };
}

function refuse(state, reason) {
  return { ok: false, state, reason };
}

function activeSign(state, now) {
  return state.sign && state.sign.expiresAt > now ? state.sign : null;
}

export function publicDoorstep(state, now) {
  const sign = state.allowed ? activeSign(state, now) : null;
  return sign ? { design: sign.design, expiresAt: sign.expiresAt } : null;
}

export function changeDoorstepPreference(state, actor, allowed, expectedRevision) {
  if (actor !== state.owner) return refuse(state, 'owner-required');
  if (state.revision !== expectedRevision) return refuse(state, 'review-again');
  if (state.allowed === allowed) return { ok: true, state };
  return complete(state, { allowed, sign: allowed ? state.sign : null });
}

export function removeDoorstepSign(state, actor, expectedRevision, now) {
  if (actor !== state.owner) return refuse(state, 'owner-required');
  if (state.revision !== expectedRevision) return refuse(state, 'review-again');
  if (!activeSign(state, now)) return { ok: true, state };
  return complete(state, { sign: null });
}

export function quoteDoorstep(state, actor, visitedHome, design, now) {
  if (actor === state.owner || visitedHome !== state.home) return refuse(state, 'visit-required');
  if (!Object.hasOwn(SIGNS, design)) return refuse(state, 'unknown-design');
  if (!state.allowed) return refuse(state, 'closed');
  if (activeSign(state, now)) return refuse(state, 'already-posted');
  if (state.nextForHome > now || (state.nextBySender[actor] ?? 0) > now) return refuse(state, 'cooldown');
  return { ok: true, quote: { home: state.home, sender: actor, design, revision: state.revision } };
}

export function postDoorstepSign(state, actor, visitedHome, quote, id, now) {
  if (actor === state.owner || visitedHome !== state.home || quote.home !== state.home || quote.sender !== actor) return refuse(state, 'visit-required');
  const previous = state.receipts.find(receipt => receipt.sender === actor && receipt.id === id);
  if (previous) {
    return previous.design === quote.design && previous.revision === quote.revision
      ? { ok: true, state, replayed: true }
      : refuse(state, 'receipt-conflict');
  }
  if (quote.revision !== state.revision) return refuse(state, 'review-again');
  const eligibility = quoteDoorstep(state, actor, visitedHome, quote.design, now);
  if (!eligibility.ok) return eligibility;

  return complete(state, {
    sign: { design: quote.design, sender: actor, expiresAt: now + LIFETIME },
    nextForHome: now + COOLDOWN,
    nextBySender: { ...state.nextBySender, [actor]: now + COOLDOWN },
    receipts: [...state.receipts, { sender: actor, id, design: quote.design, revision: quote.revision }],
  });
}
