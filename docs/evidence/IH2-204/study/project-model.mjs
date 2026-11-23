/** Standalone design model. The game does not import this file. */
export const jobs = Object.freeze(['entrance', 'frame', 'chart']);
export const draft = Object.freeze({pineCost: 2, readyDelayMs: 12 * 60 * 60 * 1000});

export function newProject(version = 1) {
  return {
    version,
    completed: {entrance: null, frame: null, chart: null},
    lastCompletedAt: 0,
    opensAt: null,
  };
}

export function phase(project, now) {
  if (project.opensAt === null) return 'overgrown';
  return Number.isSafeInteger(now) && now >= project.opensAt ? 'open' : 'repair';
}

/** In a future transaction, actor facts come from server-owned state. */
export function quote(project, facts, job) {
  if (!jobs.includes(job)) return {blocked: 'unknown-job'};
  if (!facts.atProject) return {blocked: 'visit-project'};
  if (project.completed[job] !== null) return {blocked: 'already-recorded'};
  if (job === 'chart' && !facts.hasThreeInkwoodStamps) return {blocked: 'missing-field-notes'};
  const pineCost = job === 'frame' ? draft.pineCost : 0;
  if (pineCost && (!Number.isSafeInteger(facts.pine) || facts.pine < pineCost)) return {blocked: 'missing-pine'};
  return {version: project.version, job, pineCost};
}

/**
 * Model a transaction deciding one job in isolation.
 * The future store must commit the debit and project state together.
 * Replays in storage also need a stable per-resident command receipt.
 */
export function contribute(project, currentFacts, request, now) {
  const unchanged = blocked => ({project, pineDebit: 0, blocked});
  if (!Number.isSafeInteger(now) || now < project.lastCompletedAt || now > Number.MAX_SAFE_INTEGER - draft.readyDelayMs) {
    return unchanged('invalid-clock');
  }
  if (!request || typeof request !== 'object') return unchanged('review-again');
  const current = quote(project, currentFacts, request.job);
  if (current.blocked) return unchanged(current.blocked);
  if (request.version !== current.version || request.pineCost !== current.pineCost) return unchanged('review-again');

  const completed = {...project.completed, [request.job]: now};
  const complete = jobs.every(job => completed[job] !== null);
  const next = {
    ...project,
    completed,
    lastCompletedAt: now,
    opensAt: complete ? now + draft.readyDelayMs : null,
  };
  return {project: next, pineDebit: current.pineCost, blocked: null};
}

export function tourAvailable(project, currentFacts, now) {
  return currentFacts.atProject && !currentFacts.hasClaimedTour && phase(project, now) === 'open';
}
