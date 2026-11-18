/** Destructive fixtures require an explicit target before a Pool or socket exists. */
export function browserTarget(value: string | undefined, options: {ci?: string; container?: string},
  destination: 'ih2_browser' | 'ih2_cafe_browser' | 'ih2_neighborhood_browser' | 'ih2_housing_browser' | 'ih2_housing_review' = 'ih2_browser') {
  const refused = () => Error('Browser fixtures require an explicit matching disposable55434 or CI5432 target; protected55432 is refused.');
  let url: URL;
  try { if (!value) throw refused(); url = new URL(value); } catch { throw refused(); }
  const local = url.port === '55434' && options.container === 'idle-hands-2-cafe-candidate-pg';
  const ci = options.ci === 'true' && url.port === '5432' && /^[a-f0-9]{12,64}$/.test(options.container ?? '');
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['127.0.0.1', 'localhost'].includes(url.hostname) ||
    !['/ih2_browser', ...(destination === 'ih2_neighborhood_browser' ? ['/ih2_neighborhood_browser'] : [])].includes(url.pathname) ||
    url.search || url.hash || (!local && !ci)) throw refused();
  url.pathname = '/' + destination;
  return url.href;
}

export function browserEnvironmentTarget(destination?: Parameters<typeof browserTarget>[2], source = process.env.IH2_BROWSER_DATABASE_URL) {
  return browserTarget(source, {ci: process.env.CI, container: process.env.IH2_PG_CONTAINER}, destination);
}
