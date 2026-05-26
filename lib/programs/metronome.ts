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
  private mode: "beat" | "tour-tempo" = "beat";
  private isRunning = false;
  private nextTickTime = 0;
  private cycleBeat = 0;
  private schedulerId: number | null = null;
  private readonly LOOKAHEAD_MS = 25;       // how often the scheduler runs
  private readonly SCHEDULE_AHEAD_SEC = 0.1; // schedule this far into the future
  private readonly TOUR_TEMPO_CYCLE_LENGTH = 4; // 3 beats backswing + 1 downswing; beats 1-2 are silent
  private readonly TOUR_TEMPO_TRANSITION_BEAT = 3; // index 3 in a 4-beat cycle

  constructor(bpm: number = 60, mode: "beat" | "tour-tempo" = "beat") {
    this.bpm = bpm;
    this.mode = mode;
  }

  setBPM(bpm: number) {
    this.bpm = Math.max(30, Math.min(240, bpm));
  }

  getBPM(): number {
    return this.bpm;
  }

  setMode(mode: "beat" | "tour-tempo") {
    this.mode = mode;
  }

  getMode(): "beat" | "tour-tempo" {
    return this.mode;
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
    this.cycleBeat = 0;
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
    if (this.mode === "tour-tempo") {
      this.scheduleTourTempoTick(time);
      return;
    }
    this.scheduleBeatTick(time);
  }

  private scheduleBeatTick(time: number) {
    this.scheduleTone(time, {
      type: "square",
      frequency: 1000,
      gain: 0.18,
      duration: 0.05,
      stopAt: 0.06,
    });
  }

  private scheduleTourTempoTick(time: number) {
    const isBackswingStart = this.cycleBeat === 0;
    const isTransition = this.cycleBeat === this.TOUR_TEMPO_TRANSITION_BEAT;

    if (isBackswingStart) {
      this.scheduleTone(time, {
        type: "triangle",
        frequency: 1480,
        gain: 0.24,
        duration: 0.06,
        stopAt: 0.07,
      });
    } else if (isTransition) {
      this.scheduleTone(time, {
        type: "sine",
        frequency: 860,
        gain: 0.2,
        duration: 0.04,
        stopAt: 0.05,
      });
    } else {
      // Keep a quiet guide click so low-BPM cycles never feel silent.
      this.scheduleTone(time, {
        type: "square",
        frequency: 760,
        gain: 0.06,
        duration: 0.02,
        stopAt: 0.03,
      });
    }

    this.cycleBeat = (this.cycleBeat + 1) % this.TOUR_TEMPO_CYCLE_LENGTH;
  }

  private scheduleTone(
    time: number,
    opts: {
      type: OscillatorType;
      frequency: number;
      gain: number;
      duration: number;
      stopAt: number;
    }
  ) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = opts.type;
    osc.frequency.setValueAtTime(opts.frequency, time);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(opts.gain, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.001, time + opts.duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + opts.stopAt);
  }
}
