import { routesFrom, stops, walkingSpeed } from '../../IH2-213/study/layout.mjs';

const HOUR = 3_600_000;
export const WILLOW = Object.freeze({ yardCap: 4, carryCap: 8, refillEvery: 6 * HOUR, cost: 3, weaveMs: 6 * HOUR });
export const DESTINATIONS = ['gate', 'notice', 'woodYard', 'canal', 'quay', 'homes'];

export function firstVisit(now) {
  return {
    place: 'gate', revision: 0, time: now, nextWillowAt: now + WILLOW.refillEvery,
    yard: WILLOW.yardCap, held: 0, job: null, basket: null,
  };
}

export function willowView(state, now) {
  const restored = now < state.nextWillowAt ? 0 : 1 + Math.floor((now - state.nextWillowAt) / WILLOW.refillEvery);
  const ready = state.job ? now >= state.job.readyAt : false;
  return {
    available: Math.min(state.yard + restored, WILLOW.yardCap),
    ready,
    remaining: state.job ? Math.max(0, state.job.readyAt - now) : null,
  };
}

function reject(state, message) {
  return { ok: false, state, message };
}
function accept(state, now, changes, message) {
  return { ok: true, state: { ...state, ...changes, time: now, revision: state.revision + 1 }, message };
}

export function millAction(state, action, now, northOpen = false) {
  if (!Number.isSafeInteger(now) || now < state.time) return reject(state, 'The mill clock has not caught up.');
  const view = willowView(state, now);
  switch (action.kind) {
    case 'walk': {
      if (!DESTINATIONS.includes(action.destination) || action.destination === state.place) return reject(state, 'Choose another known stop.');
      const route = routesFrom(state.place, northOpen).get(action.destination);
      if (!route) return reject(state, 'This stop has no open route.');
      const seconds = Math.round(route.tiles / walkingSpeed);
      return accept(state, now, { place: action.destination }, 'Reached ' + stops[action.destination].name + ' · about ' + seconds + ' seconds on the map.');
    }
    case 'gather': {
      if (state.place !== 'woodYard') return reject(state, 'Use the willow yard.');
      const gathered = Math.min(view.available, WILLOW.carryCap - state.held);
      if (!gathered) return reject(state, view.available ? 'The willow pocket is full.' : 'No prepared willow yet.');
      const nextWillowAt = view.available === WILLOW.yardCap
        ? now + WILLOW.refillEvery
        : state.nextWillowAt + WILLOW.refillEvery * (view.available - state.yard);
      return accept(state, now, {
        yard: view.available - gathered, held: state.held + gathered, nextWillowAt,
      }, gathered + ' willow switches added to the study Bag.');
    }
    case 'weave':
      if (state.place !== 'woodYard' || action.revision !== state.revision) return reject(state, 'Review the basket again at the yard.');
      if (state.basket || state.job) return reject(state, 'This first basket is already accounted for.');
      if (state.held < WILLOW.cost) return reject(state, 'The basket needs three willow switches.');
      return accept(state, now, { held: state.held - WILLOW.cost, job: { startedAt: now, readyAt: now + WILLOW.weaveMs } },
        'Basket started. The mill rack is yours to revisit.');
    case 'collect':
      if (state.place !== 'woodYard' || !view.ready) return reject(state, 'Collect at the yard once the basket is ready.');
      return accept(state, now, { basket: 'bag', job: null }, 'One basket in the study Bag.');
    case 'display':
      if (state.place !== 'homes' || state.basket !== 'bag') return reject(state, 'Bring the basket to the sample home yard.');
      return accept(state, now, { basket: 'yard' }, 'Basket placed. The porch has accepted its first delivery.');
    default:
      return reject(state, 'This step is unavailable.');
  }
}
