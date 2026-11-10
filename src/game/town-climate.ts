/** Cosmetic town clock only. Never use these values to settle jobs or award output. */
export const DAY_MS = 48 * 60_000;
export const WEATHER_SEGMENT_MS = 12 * 60_000;
export const PHASE_START_MS = { dawn: 0, day: 4 * 60_000, dusk: 32 * 60_000, night: 36 * 60_000 } as const;
export const PHASES = ['dawn', 'day', 'dusk', 'night'] as const;
export const WEATHER = ['clear', 'overcast', 'drizzle'] as const;
export type TownPhase = typeof PHASES[number];
export type TownWeather = typeof WEATHER[number];
export type TownClimate = {
  phase: TownPhase; minute: number; dayIndex: number; weather: TownWeather;
  tint: { color: number; alpha: number }; lampStrength: number; label: string;
};
const minuteMs = 60_000;
const weatherLabels: Record<TownWeather, string> = { clear: 'Clear skies', overcast: 'Overcast', drizzle: 'Light drizzle' };
const phaseLabels: Record<TownPhase, string> = { dawn: 'Dawn', day: 'Day', dusk: 'Dusk', night: 'Night' };
const weatherAlpha: Record<TownWeather, number> = { clear: 0, overcast: .035, drizzle: .06 };
const mod = (n: number, period: number) => ((n % period) + period) % period;
const safeTime = (n: number) => Number.isFinite(n) && Math.abs(n) <= Number.MAX_SAFE_INTEGER ? (n === 0 ? 0 : n) : 0;

function weatherAt(now: number): TownWeather {
  // Version-one 32-bit integer hash. Stable on reload and across clients; never
  // random or action-dependent. Ten buckets: six clear, three grey, one drizzle.
  let bits = Math.floor(now / WEATHER_SEGMENT_MS) >>> 0;
  bits = Math.imul(bits ^ 0x9e3779b9, 0x85ebca6b);
  bits = Math.imul(bits ^ (bits >>> 13), 0xc2b2ae35);
  const bucket = ((bits ^ (bits >>> 16)) >>> 0) % 10;
  return bucket < 6 ? 'clear' : bucket < 9 ? 'overcast' : 'drizzle';
}

function compositeTint(color: number, alpha: number, weather: TownWeather) {
  // Composite one neutral weather wash over the phase wash, then issue ONE
  // bounded overlay. Keeping tint bounded preserves readable art and HUDs.
  const grey = 0x687579, greyAlpha = weatherAlpha[weather];
  const combined = greyAlpha + alpha * (1 - greyAlpha);
  if (!combined) return { color: 0xf8f1df, alpha: 0 };
  let result = 0;
  for (const shift of [16, 8, 0]) {
    const component = (((grey >>> shift) & 255) * greyAlpha + ((color >>> shift) & 255) * alpha * (1 - greyAlpha)) / combined;
    result |= Math.round(component) << shift;
  }
  return { color: result, alpha: Math.min(.40, combined) };
}

function blendColor(from: number, to: number, amount: number) {
  let result = 0;
  for (const shift of [16, 8, 0]) result |= Math.round(((from >>> shift) & 255) * (1 - amount) + ((to >>> shift) & 255) * amount) << shift;
  return result;
}

function appearance(phase: TownPhase, progress: number, weather: TownWeather) {
  const nightColor = 0x263659;
  // Dusk first warms, then blends into blue; the last quarter of night fades
  // toward dawn. Equal endpoint composites avoid a visible phase-boundary snap.
  const lateDusk = Math.max(0, (progress - .5) * 2);
  const base = phase === 'dawn' ? { color: 0xf0b97b, alpha: Math.sin(progress * Math.PI) * .09, lamps: 1 - progress }
    : phase === 'dusk' ? { color: blendColor(0xd29a7f, nightColor, lateDusk), alpha: progress <= .5 ? Math.sin(progress * Math.PI) * .18 : .18 + .18 * lateDusk, lamps: progress }
      : phase === 'night' ? { color: nightColor, alpha: .36 * Math.min(1, (1 - progress) / .25), lamps: 1 }
        : { color: 0xf8f1df, alpha: 0, lamps: 0 };
  return {
    tint: compositeTint(base.color, base.alpha, weather),
    lampStrength: Math.max(base.lamps, weather === 'drizzle' ? .25 : weather === 'overcast' ? .15 : 0),
    label: phaseLabels[phase] + ' · ' + weatherLabels[weather]
  };
}

export function climateAt(nowMs: number): TownClimate {
  const now = safeTime(nowMs), inDay = mod(now, DAY_MS);
  const phase: TownPhase = inDay < PHASE_START_MS.day ? 'dawn'
    : inDay < PHASE_START_MS.dusk ? 'day'
      : inDay < PHASE_START_MS.night ? 'dusk' : 'night';
  const end = phase === 'dawn' ? PHASE_START_MS.day : phase === 'day' ? PHASE_START_MS.dusk : phase === 'dusk' ? PHASE_START_MS.night : DAY_MS;
  const progress = (inDay - PHASE_START_MS[phase]) / (end - PHASE_START_MS[phase]);
  // A deliberately nonlinear visual clock: dawn 06–08, day 08–18, dusk
  // 18–20, night 20–06. Labels lead; this clock is not elapsed production time.
  const virtualStart = { dawn: 360, day: 480, dusk: 1080, night: 1200 }[phase];
  const virtualDuration = { dawn: 120, day: 600, dusk: 120, night: 600 }[phase];
  const weather = weatherAt(now);
  return { phase, minute: mod(Math.floor(virtualStart + progress * virtualDuration), 1440), dayIndex: Math.floor(now / DAY_MS), weather, ...appearance(phase, progress, weather) };
}

/** Explicit visual QA only; does not replace Date.now or change any game state. */
export function climateFixture(params: URLSearchParams): TownClimate | null {
  if (params.get('sky-study') !== '1') return null;
  const rawPhase = params.get('phase'), rawWeather = params.get('weather');
  const phase = PHASES.find(value => value === rawPhase) ?? 'day';
  const weather = WEATHER.find(value => value === rawWeather) ?? 'clear';
  const midpoint: Record<TownPhase, number> = { dawn: 2, day: 18, dusk: 34, night: 42 };
  return { ...climateAt(midpoint[phase] * minuteMs), weather, ...appearance(phase, .5, weather) };
}
