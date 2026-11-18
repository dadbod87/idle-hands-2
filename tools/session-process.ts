import {fork} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sessionTarget} from './session-target.ts';
import type {SessionMessage} from './session-child.ts';

export async function startSessionServer(options: {
  url: string | undefined; reset: string | undefined; container?: string; ci?: string; output: string; workload?: 'public';
}) {
  // Must precede fork and any file/socket/database work.
  const target = sessionTarget(options.url, options.reset, {ci: options.ci, container: options.container});
  if(options.workload==='public' && (options.ci!=='true'||new URL(target.url).port!=='5432'))throw Error('Public study child requires the explicit CI service.');
  const child = fork(fileURLToPath(new URL('./session-child.ts', import.meta.url)), [], {
    execPath: process.execPath, execArgv: ['--experimental-strip-types'],
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
    env: {PATH: process.env.PATH ?? '', TMPDIR: process.env.TMPDIR ?? '',
      IH2_SESSION_CHILD: '1', IH2_SESSION_WORKLOAD: options.workload ?? '', IH2_LOAD_DATABASE_URL: target.url, IH2_LOAD_RESET: '1',
      IH2_PG_CONTAINER: target.container, IH2_SESSION_OUT: resolve(options.output), CI: options.ci ?? ''},
  });
  let stderrBytes = 0, sequence = 0, stopped = false, forceTerminated = false;
  const stderrHash = createHash('sha256');
  child.stderr!.on('data', (value: Buffer) => {stderrBytes += value.length; stderrHash.update(value);});
  const pending = new Map<number, {resolve: (value: any) => void; reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>}>();
  const rejectPending = (error: Error) => {
    for (const entry of pending.values()) {clearTimeout(entry.timer); entry.reject(error);}
    pending.clear();
  };
  let readyResolve!: (value: {port: number; pid: number}) => void;
  let readyReject!: (error: Error) => void;
  const ready = new Promise<{port: number; pid: number}>((resolve, reject) => {readyResolve = resolve; readyReject = reject;});
  const startupTimer = setTimeout(() => readyReject(Error('Diagnostic child startup exceeded15seconds.')), 15000);
  const exited = new Promise<{code: number | null; signal: string | null}>(resolve => {
    // close follows stdio draining, so the stderr digest cannot race late data.
    child.once('close', (code, signal) => {
      clearTimeout(startupTimer);
      const error = Error(`Diagnostic child closed before a requested reply (code=${code}, signal=${signal}, stderrBytes=${stderrBytes}).`);
      readyReject(error); rejectPending(error); resolve({code, signal});
    });
    child.once('error', () => {
      clearTimeout(startupTimer);
      const error = Error('Diagnostic child could not start.');
      readyReject(error); rejectPending(error); resolve({code: null, signal: 'spawn_error'});
    });
  });
  child.on('message', (raw: any) => {
    if (raw?.kind === 'ready' && Number.isInteger(raw.port) && raw.port > 0 && raw.port < 65536 && raw.pid === child.pid && raw.pid !== process.pid) {
      clearTimeout(startupTimer); readyResolve({port: raw.port, pid: raw.pid});
    } else if (raw?.kind === 'reply' && Number.isSafeInteger(raw.id)) {
      const entry = pending.get(raw.id);
      if (entry) {pending.delete(raw.id); clearTimeout(entry.timer); entry.resolve(raw.result);}
    } else if (raw?.kind === 'fatal') {
      const code = typeof raw.errorCode === 'string' && /^[A-Z0-9_]{1,32}$/i.test(raw.errorCode) ? raw.errorCode : 'diagnostic_failure';
      const error = Error('Diagnostic child failed: ' + code);
      clearTimeout(startupTimer); readyReject(error); rejectPending(error);
    }
  });
  async function forceStop() {
    if (child.exitCode !== null || child.signalCode !== null) return exited;
    forceTerminated = true; child.kill('SIGTERM');
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([exited, new Promise<never>((_, reject) => {
        timer = setTimeout(() => {child.kill('SIGKILL'); reject(Error('Diagnostic child required forced shutdown.'));}, 2000);
      })]);
    } finally {if (timer) clearTimeout(timer);}
  }
  async function request(message: SessionMessage): Promise<any> {
    if (!child.connected) throw Error('Diagnostic IPC is closed.');
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {pending.delete(message.id); reject(Error('Diagnostic IPC reply exceeded15seconds.'));}, 15000);
      pending.set(message.id, {resolve, reject, timer});
      child.send(message, error => {
        if (error) {pending.delete(message.id); clearTimeout(timer); reject(Error('Diagnostic IPC send failed.'));}
      });
    });
  }
  try {
    const address = await ready;
    return {
      ...address, base: 'http://127.0.0.1:' + address.port,
      phase: (phase: 'setup' | 'load' | 'idle' | 'verification' | 'cleanup') => request({id: ++sequence, kind: 'phase', phase}),
      metrics: () => request({id: ++sequence, kind: 'metrics'}),
      checkpoint: () => request({id: ++sequence, kind: 'checkpoint'}),
      verify: () => request({id: ++sequence, kind: 'verify'}),
      forceStop,
      async stop(completed: boolean) {
        if (stopped) throw Error('Diagnostic child already stopped.');
        stopped = true;
        try {
          const report = await request({id: ++sequence, kind: 'stop', completed});
          let timer: ReturnType<typeof setTimeout> | undefined;
          const exit = await Promise.race([exited, new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(Error('Diagnostic process did not exit after cleanup.')), 5000);
          })]).finally(() => {if (timer) clearTimeout(timer);});
          return {report, exit, forceTerminated, stderrBytes, stderrSha256: stderrHash.digest('hex')};
        } catch (error) {await forceStop().catch(() => {}); throw error;}
      },
    };
  } catch (error) {await forceStop().catch(() => {}); throw error;}
}
