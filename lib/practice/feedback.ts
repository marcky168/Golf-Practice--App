/** Web Audio + HTML5 audio cues for practice — works offline as PWA; tuned for iOS */

type AudioCtxGlobal = typeof AudioContext;

function getAudioContextCtor(): AudioCtxGlobal | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: AudioCtxGlobal }).webkitAudioContext ||
    null
  );
}

export function isIosLikeDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function setPlaybackAudioSession() {
  try {
    const nav = navigator as Navigator & {
      audioSession?: { type: string };
    };
    if (nav.audioSession) {
      nav.audioSession.type = "playback";
    }
  } catch {
    // ignore
  }
}

let sharedCtx: AudioContext | null = null;
let htmlGo: HTMLAudioElement | null = null;
let htmlTick: HTMLAudioElement | null = null;

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
  return sharedCtx;
}

async function resumeAudioContext(): Promise<AudioContext | null> {
  const ctx = ensureAudioContext();
  if (!ctx) return null;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return null;
    }
  }
  return ctx.state === "running" ? ctx : null;
}

/** Encode mono float samples as WAV for HTMLAudioElement (iOS-friendly fallback) */
function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return buffer;
}

function renderToneAudio(freq: number, durationSec: number, peakGain: number): HTMLAudioElement | null {
  const Ctx = getAudioContextCtor();
  if (!Ctx || typeof window === "undefined") return null;
  const sampleRate = 44100;
  const length = Math.floor(sampleRate * durationSec);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-5 * t / durationSec);
    samples[i] = Math.sin(2 * Math.PI * freq * t) * peakGain * env;
  }
  const wav = encodeWav(samples, sampleRate);
  const blob = new Blob([wav], { type: "audio/wav" });
  const audio = new Audio(URL.createObjectURL(blob));
  audio.preload = "auto";
  audio.setAttribute("playsinline", "true");
  return audio;
}

function ensureHtmlFallbacks() {
  if (!htmlGo) htmlGo = renderToneAudio(880, 0.28, 0.85);
  if (!htmlTick) htmlTick = renderToneAudio(620, 0.12, 0.55);
}

async function playHtmlFallback(kind: "go" | "tick") {
  ensureHtmlFallbacks();
  const el = kind === "go" ? htmlGo : htmlTick;
  if (!el) return;
  try {
    el.currentTime = 0;
    await el.play();
  } catch {
    // ignore
  }
}

function playOscillator(
  ctx: AudioContext,
  opts: { freq: number; duration: number; gain: number; type?: OscillatorType; freqEnd?: number }
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = opts.type ?? "sine";
  osc.connect(gain);
  gain.connect(ctx.destination);
  const t0 = ctx.currentTime;
  osc.frequency.setValueAtTime(opts.freq, t0);
  if (opts.freqEnd != null) {
    osc.frequency.setValueAtTime(opts.freqEnd, t0 + opts.duration * 0.4);
  }
  gain.gain.setValueAtTime(opts.gain, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + opts.duration);
  osc.start(t0);
  osc.stop(t0 + opts.duration);
}

async function withRunningContext(
  run: (ctx: AudioContext) => void,
  fallback: "go" | "tick" | "block" | null
) {
  const ctx = await resumeAudioContext();
  if (ctx) {
    try {
      run(ctx);
      return;
    } catch {
      // fall through to HTML audio
    }
  }
  if (fallback === "go" || fallback === "tick") {
    await playHtmlFallback(fallback);
  } else if (fallback === "block") {
    await playHtmlFallback("go");
  }
}

/**
 * Call from a user-gesture handler (Start Session, Mark Shot, etc.).
 * iOS requires an audible play + resumed context during the tap.
 */
export function unlockPracticeAudio(): void {
  setPlaybackAudioSession();
  void (async () => {
    const ctx = await resumeAudioContext();
    ensureHtmlFallbacks();
    if (ctx) {
      try {
        playOscillator(ctx, { freq: 523, duration: 0.12, gain: 0.12, type: "sine" });
      } catch {
        // ignore
      }
    }
    await playHtmlFallback("tick");
  })();
}

export function playBlockCompleteSound() {
  void withRunningContext(
    ctx => {
      playOscillator(ctx, {
        freq: 523.25,
        freqEnd: 659.25,
        duration: 0.38,
        gain: 0.22,
        type: "sine",
      });
    },
    "block"
  );
}

export function playRestCompleteSound() {
  void withRunningContext(
    ctx => {
      playOscillator(ctx, { freq: 880, duration: 0.28, gain: 0.38, type: "sine" });
    },
    "go"
  );
}

export function playCadenceTick() {
  void withRunningContext(
    ctx => {
      playOscillator(ctx, { freq: 620, duration: 0.1, gain: 0.14, type: "triangle" });
    },
    "tick"
  );
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

export function notifyRestComplete() {
  playRestCompleteSound();
  vibrateRestComplete();
}

export function notifyCadenceTick() {
  playCadenceTick();
  vibrateCadenceTick();
}

/** Resume audio before starting a rest timer (helps iOS between shots) */
export function primePracticeAudio(): void {
  void resumeAudioContext();
}
