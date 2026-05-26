/**
 * Simple metronome built on Web Audio API.
 *
 * Uses look-ahead scheduling for tight timing — setInterval drifts badly on
 * mobile when the browser throttles tabs. Look-ahead schedules ticks ahead of
 * time on the audio clock so the rhythm stays exact even if JS lags.
 */

export class Metronome {
  private ctx: AudioContext | null = null;
  private bpm: number = 60;
  private isRunning = false;
  private nextTickTime = 0;
  private schedulerId: number | null = null;
  private readonly LOOKAHEAD_MS = 25;       // how often the scheduler runs
  private readonly SCHEDULE_AHEAD_SEC = 0.1; // schedule this far into the future

  constructor(bpm: number = 60) {
    this.bpm = bpm;
  }

  setBPM(bpm: number) {
    this.bpm = Math.max(30, Math.min(240, bpm));
  }

  getBPM(): number {
    return this.bpm;
  }

  isPlaying(): boolean {
    return this.isRunning;
  }

  start() {
    if (this.isRunning) return;
    if (typeof window === "undefined") return;
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;

    if (!this.ctx) this.ctx = new Ctx();
    // Resume if suspended (iOS / inactive tab)
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }

    this.isRunning = true;
    this.nextTickTime = this.ctx.currentTime + 0.05;
    this.schedulerLoop();
  }

  stop() {
    this.isRunning = false;
    if (this.schedulerId != null) {
      window.clearTimeout(this.schedulerId);
      this.schedulerId = null;
    }
  }

  destroy() {
    this.stop();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }

  private schedulerLoop = () => {
    if (!this.isRunning || !this.ctx) return;
    const interval = 60 / this.bpm;
    // Schedule any ticks that fall within the lookahead window
    while (this.nextTickTime < this.ctx.currentTime + this.SCHEDULE_AHEAD_SEC) {
      this.scheduleTick(this.nextTickTime);
      this.nextTickTime += interval;
    }
    this.schedulerId = window.setTimeout(this.schedulerLoop, this.LOOKAHEAD_MS);
  };

  private scheduleTick(time: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(1000, time);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.18, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.06);
  }
}
