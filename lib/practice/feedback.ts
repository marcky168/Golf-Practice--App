/** Web Audio cues for practice — no asset files; works offline as PWA */

type AudioCtxGlobal = typeof AudioContext;

function getAudioContextCtor(): AudioCtxGlobal | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: AudioCtxGlobal }).webkitAudioContext ||
    null
  );
}

/**
 * Singleton AudioContext.
 * iOS Safari requires the context to be created/resumed from a user gesture,
 * so we lazily allocate and let `unlockPracticeAudio()` warm it up.
 */
let sharedCtx: AudioContext | null = null;

function ensureAudioContext(): AudioContext | null {
  const Ctx = getAudioContextCtor();
  if (!Ctx) return null;
  if (!sharedCtx) {
    try {
      sharedCtx = new Ctx();
    } catch {
      sharedCtx = null;
      return null;
    }
  }
  if (sharedCtx.state === "suspended") {
    void sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

function withAudioContext(run: (ctx: AudioContext) => void) {
  const ctx = ensureAudioContext();
  if (ctx) run(ctx);
}

/**
 * Call from a user-gesture handler (e.g. "Start Session" tap) so the first
 * scheduled tone actually plays on iOS Safari. Silent / inaudible.
 */
export function unlockPracticeAudio(): void {
  const ctx = ensureAudioContext();
  if (!ctx) return;
  try {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch {
    // ignore
  }
}

/** Two-tone chime when a full block ends */
export function playBlockCompleteSound() {
  withAudioContext(ctx => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  });
}

/** Single "go" tone when the between-shot rest timer hits zero */
export function playRestCompleteSound() {
  withAudioContext(ctx => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.22);
  });
}

/** Quiet tick for the last few seconds of rest cadence — eyes-off awareness */
export function playCadenceTick() {
  withAudioContext(ctx => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(620, ctx.currentTime);
    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.09);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  });
}

export function vibrateBlockComplete() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([80, 40, 80]);
  }
}

export function vibrateRestComplete() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(120);
  }
}

export function vibrateCadenceTick() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(25);
  }
}

export function celebrateBlockComplete() {
  playBlockCompleteSound();
  vibrateBlockComplete();
}

/** Rest cadence finished — time for the next shot */
export function notifyRestComplete() {
  playRestCompleteSound();
  vibrateRestComplete();
}

/** Last 3 seconds of rest — quiet tick + tiny haptic */
export function notifyCadenceTick() {
  playCadenceTick();
  vibrateCadenceTick();
}
