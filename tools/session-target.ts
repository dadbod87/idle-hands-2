import {profileTarget} from './load-profile.ts';

/** No socket, Pool, Docker command or child may exist before this returns. */
export function sessionTarget(value: string | undefined, reset: string | undefined,
  options: {ci?: string; container?: string}) {
  if (reset !== '1') throw Error('Session diagnostic requires explicit disposable reset opt-in.');
  if (!value) throw Error('Session diagnostic requires an explicit isolated load target.');
  let url: URL;
  try { url = new URL(profileTarget(value)); }
  catch { throw Error('Session diagnostic requires a valid loopback ih2_load URL without routing overrides.'); }
  const container = options.container;
  const local = url.port === '55434' && container === 'idle-hands-2-cafe-candidate-pg';
  const ci = options.ci === 'true' && url.port === '5432' && /^[a-f0-9]{12,64}$/.test(container ?? '');
  if (!local && !ci) throw Error('Session diagnostic accepts only the matching disposable55434 or explicit CI5432 container.');
  return {url: url.href, container: container!};
}

export function safeDiagnosticError(error: unknown) {
  const code = (error as {code?: unknown})?.code;
  return typeof code === 'string' && /^[A-Z0-9_]{1,32}$/.test(code) ? code : 'diagnostic_failure';
}
