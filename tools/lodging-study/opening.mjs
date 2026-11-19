export const LOOKS = ['aster', 'bea', 'casey', 'devon'];
export const FACINGS = ['Front', 'Back', 'Right', 'Left'];
export const STORIES = {
 transferred: {
  title: 'Transferred for Outstanding Ambiguity',
  note: 'Your transfer was approved by a committee that does not remember meeting.',
 },
 maker: {
  title: 'Independent Maker',
  note: 'Your tools were cleared for entry. The committee has asked what they do.',
 },
 returning: {
  title: 'Returning Local',
  note: 'Welcome back. We have renamed three streets and done very little else.',
 },
};
const graphemes = new Intl.Segmenter(undefined, {granularity: 'grapheme'});

export function readDraft(draft) {
 if (typeof draft?.name !== 'string' || draft.name.length > 120 ||
     !LOOKS.includes(draft.look) || !Object.hasOwn(STORIES, draft.story)) return null;
 const name = draft.name.normalize('NFC').trim().replace(/ +/g, ' ');
 if (/[\p{Cc}\p{Cf}]/u.test(draft.name) ||
     !/^(?:\p{L}|\p{N})[\p{L}\p{M}\p{N} .’'-]*$/u.test(name) ||
     [...graphemes.segment(name)].length > 24) return null;
 return {name, look: draft.look, story: draft.story};
}

export const newOpening = () => ({phase: 'arrival', resident: null});

/** Rehearsal only. The game does not import this model or trust it as authority. */
export function advanceOpening(state, action) {
 if (state.phase === 'arrival' && action.kind === 'confirm') {
  const resident = readDraft(action.draft);
  return resident ? {phase: 'bed', resident} : state;
 }
 if (state.phase === 'bed' && action.kind === 'wake') return {...state, phase: 'standing'};
 if (state.phase === 'standing' && action.kind === 'exit') return {...state, phase: 'street'};
 return state;
}
