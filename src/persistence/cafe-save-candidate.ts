import { z } from 'zod';
import {
  CAFE_PRESENTATIONS, migrateCafeCandidate, serveLocalCafeCandidate,
  type CafeWorkshopCandidate
} from '../game/cafe-candidate.ts';

/** Isolated persistence candidate, not imported by the live UI or server.
 * Keys deliberately match the existing writer; there is no second town key.
 * Live integration must share its lifetime lock, never nest a new acquisition. */
export const CAFE_SAVE_KEY = 'ih2:workshop:v2';
export const CAFE_LEGACY_KEY = 'ih2:workshop:v1';
export const CAFE_WRITER_LOCK = 'ih2:workshop-writer';
export interface CafeStorage {
  getItem(key: string): string | null;
  /** Native synchronous Web Storage semantics: a failed setItem is atomic. */
  setItem(key: string, value: string): void;
}
export interface CafeWriterLocks {
  request<T>(name: string, options: { ifAvailable: true }, callback: (lock: { name: string } | null) => Promise<T>): Promise<T>;
}
const intentSchema = z.object({ expectedRevision: z.number().int().min(0).max(1_000_000), presentation: z.enum(CAFE_PRESENTATIONS) }).strict();
type Intent = z.infer<typeof intentSchema>;
type Pending = { kind: 'load' } | { kind: 'serve'; intent: Intent };
export type CafeSaveStatus = 'ready' | 'saved' | 'blocked' | 'stale' | 'busy' | 'no-pending' | 'invalid'
  | 'missing' | 'unreadable' | 'storage-unavailable' | 'lock-unavailable' | 'clock-unavailable' | 'migration-required' | 'save-failed';
export type CafeSaveOutcome = {
  status: CafeSaveStatus; message: string;
  /** Always a detached confirmed snapshot, never the unpersisted candidate.
   * current=false means this is last-known data, not a fresh storage read. */
  state: CafeWorkshopCandidate | null; current: boolean;
  canRetry: boolean; teapotAwarded: boolean
};

/** Local exactly-once spending uses the original expectedRevision plus a fresh
 * locked reload on EVERY retry. It does not offer durable UUID replay receipts,
 * server authority, or browser-eviction/power-loss protection. */
export class CafeSaveCandidate {
  private confirmed: CafeWorkshopCandidate | null = null;
  private pending: Pending | null = null;
  private running = false;

  private storage: CafeStorage;
  private locks: CafeWriterLocks | undefined;
  private now: () => number;
  constructor(storage: CafeStorage, locks: CafeWriterLocks | undefined, now: () => number) {
    this.storage = storage; this.locks = locks; this.now = now;
  }

  snapshot(): CafeWorkshopCandidate | null { return this.confirmed ? structuredClone(this.confirmed) : null; }
  canRetry(): boolean { return this.pending !== null && !this.running; }
  isBusy(): boolean { return this.running; }

  load(): Promise<CafeSaveOutcome> { return this.begin({ kind: 'load' }); }
  serve(raw: unknown): Promise<CafeSaveOutcome> {
    const parsed = intentSchema.safeParse(raw);
    if (!parsed.success) return Promise.resolve({ ...this.outcome('invalid', 'That tasting request is not valid. Nothing changed.'), canRetry: !this.running && this.pending !== null });
    return this.begin({ kind: 'serve', intent: parsed.data });
  }
  retry(): Promise<CafeSaveOutcome> {
    if (this.running) return Promise.resolve({ ...this.outcome('busy', 'A save is still being confirmed.'), canRetry: false });
    if (!this.pending) return Promise.resolve(this.outcome('no-pending', 'There is no unresolved save to retry.'));
    return this.run();
  }
  /** Explicitly abandon an unresolved intent without touching storage. */
  discardRetry(): boolean {
    if (this.running) return false;
    this.pending = null; return true;
  }
  private begin(operation: Pending): Promise<CafeSaveOutcome> {
    if (this.running || this.pending) return Promise.resolve({ ...this.outcome('busy', 'Retry or cancel the unresolved save before starting another.'), canRetry: !this.running && this.pending !== null });
    this.pending = structuredClone(operation);
    return this.run();
  }
  private outcome(status: CafeSaveStatus, message: string, current = false, teapotAwarded = false): CafeSaveOutcome {
    return { status, message, state: this.snapshot(), current, canRetry: this.pending !== null, teapotAwarded };
  }
  private finish(status: CafeSaveStatus, message: string, current = false, teapotAwarded = false): CafeSaveOutcome {
    this.pending = null;
    return this.outcome(status, message, current, teapotAwarded);
  }
  private async run(): Promise<CafeSaveOutcome> {
    this.running = true;
    try {
      if (!this.locks) return this.outcome('lock-unavailable', 'This browser cannot coordinate local saves. No progress was changed.');
      return await this.locks.request(CAFE_WRITER_LOCK, { ifAvailable: true }, async lock => {
        if (!lock || lock.name !== CAFE_WRITER_LOCK) return this.outcome('busy', 'Another tab owns this save. Close it or retry later.');
        return this.locked();
      });
    } catch {
      return this.outcome('lock-unavailable', 'The local writer lock could not be confirmed. Retry the same request.');
    } finally { this.running = false; }
  }
  /** Synchronous from storage read through write and confirmation: no await,
   * callbacks to UI, or new timestamps between the debit and persisted root. */
  private locked(): CafeSaveOutcome {
    const operation = this.pending!;
    let text: string | null, fromLegacy = false;
    try {
      text = this.storage.getItem(CAFE_SAVE_KEY);
      if (text === null) { fromLegacy = true; text = this.storage.getItem(CAFE_LEGACY_KEY); }
    }
    catch { return this.outcome('storage-unavailable', 'Local saves cannot be read. Your last confirmed progress is kept.'); }
    if (text === null) return this.finish('missing', 'No workshop save was found. No replacement progress was created.');
    let raw: unknown;
    try { raw = JSON.parse(text); }
    catch { return this.finish('unreadable', 'The original save is unreadable and has been left untouched.'); }
    const loaded = migrateCafeCandidate(raw);
    if (!loaded.ok) return this.finish('unreadable', 'This save is unsupported or incomplete. Its original text is kept read-only.');
    if (loaded.migrated || fromLegacy) {
      if (operation.kind !== 'load') return this.finish('migration-required', 'Reload and save the supported upgrade before confirming a tasting.');
      return this.write(loaded.state, 'ready', 'Workshop save upgraded. Review the tasting before serving.');
    }
    // This root was read from durable storage, not merely approved by a reducer.
    this.confirmed = loaded.state;
    if (operation.kind === 'load') return this.finish('ready', 'Confirmed workshop save loaded.', true);
    if (operation.intent.expectedRevision !== loaded.state.revision) {
      return this.finish('stale', 'The save changed in another tab or already committed. Review the confirmed progress before serving again.', true);
    }
    let now: number;
    try { now = this.now(); }
    catch { return this.outcome('clock-unavailable', 'The local clock could not be read. Retry the same request.', true); }
    const result = serveLocalCafeCandidate(loaded.state, operation.intent, now);
    if (!result.ok) return this.finish('blocked', result.message, true);
    return this.write(result.state, 'saved', result.message, result.teapotAwarded);
  }
  private write(state: CafeWorkshopCandidate, status: 'ready' | 'saved', message: string, teapotAwarded = false): CafeSaveOutcome {
    try { this.storage.setItem(CAFE_SAVE_KEY, JSON.stringify(state)); }
    catch { return this.outcome('save-failed', 'Could not save. No new tasting, cost, cooldown or reward is confirmed. Retry the same request.'); }
    // A successful native write is the confirmation boundary.
    this.confirmed = state;
    return this.finish(status, message, true, teapotAwarded);
  }
}
