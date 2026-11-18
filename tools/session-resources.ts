import {monitorEventLoopDelay, performance} from 'node:perf_hooks';

export class SessionResources {
  private started = performance.now();
  private cpuStarted = process.cpuUsage();
  private previousAt = this.started;
  private previousCpu = this.cpuStarted;
  private loop = monitorEventLoopDelay({resolution: 20});
  private samples: Array<{
    atMs: number; windowMs: number; phase: string; rss: number; heapUsed: number;
    external: number; cpuUserMs: number; cpuSystemMs: number;
  }> = [];
  private dropped = 0;
  private timer: ReturnType<typeof setInterval>;
  private phase: () => string;

  constructor(phase: () => string) {
    this.phase = phase;
    this.loop.enable();
    this.capture();
    this.timer = setInterval(() => this.capture(), 1000);
    this.timer.unref();
  }

  /** Mark the old phase before changing it; no SQL or process-wide GC. */
  capture() {
    const at = performance.now(), memory = process.memoryUsage(), cpu = process.cpuUsage();
    const row = {
      atMs: at - this.started, windowMs: at - this.previousAt, phase: this.phase(),
      rss: memory.rss, heapUsed: memory.heapUsed, external: memory.external,
      cpuUserMs: (cpu.user - this.previousCpu.user) / 1000,
      cpuSystemMs: (cpu.system - this.previousCpu.system) / 1000,
    };
    if (this.samples.length < 400) this.samples.push(row); else this.dropped++;
    this.previousAt = at;
    this.previousCpu = cpu;
  }

  finish() {
    clearInterval(this.timer);
    this.capture();
    this.loop.disable();
    const elapsedMs = performance.now() - this.started, cpu = process.cpuUsage(this.cpuStarted);
    return {
      pid: process.pid, parentPid: process.ppid, elapsedMs, node: process.version,
      cpuUserMs: cpu.user / 1000, cpuSystemMs: cpu.system / 1000,
      cpuPercentOfOneCore: (cpu.user + cpu.system) / 1000 / elapsedMs * 100,
      eventLoopP95Ms: this.loop.percentile(95) / 1e6,
      eventLoopMaxMs: this.loop.max / 1e6,
      rssPeakBytes: Math.max(...this.samples.map(s => s.rss)),
      heapPeakBytes: Math.max(...this.samples.map(s => s.heapUsed)),
      dropped: this.dropped, samples: this.samples,
      method: 'This Node process only, after module imports; setup/work/idle/verification/cleanup phases retained. CPU includes native threads and diagnostic sampling; RSS is sampled, not an unsampled peak. No forcedGC. Event-loop resolution20ms; no rendering/FPS or other-process attribution.',
    };
  }
}
