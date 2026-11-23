/** Tiny WebAudio synth — no audio files, no network, still feels like chess.com. */
let ctx: AudioContext | null = null;
const MUTE_KEY = 'puzzle-arena.muted';

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function blip(opts: {
  freq: number;
  to?: number;
  duration?: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
}) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + (opts.delay ?? 0);
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(opts.freq, t0);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + (opts.duration ?? 0.12));
  const peak = opts.gain ?? 0.08;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + (opts.duration ?? 0.12));
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + (opts.duration ?? 0.12) + 0.02);
}

export const sound = {
  get muted(): boolean {
    try {
      return localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      return false;
    }
  },
  setMuted(muted: boolean) {
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      /* ignore */
    }
  },
  move() {
    if (this.muted) return;
    blip({ freq: 320, to: 200, duration: 0.07, type: 'triangle', gain: 0.07 });
  },
  capture() {
    if (this.muted) return;
    blip({ freq: 190, to: 90, duration: 0.11, type: 'square', gain: 0.05 });
    blip({ freq: 420, to: 160, duration: 0.09, type: 'triangle', gain: 0.05, delay: 0.01 });
  },
  check() {
    if (this.muted) return;
    blip({ freq: 660, duration: 0.08, type: 'square', gain: 0.05 });
    blip({ freq: 880, duration: 0.1, type: 'square', gain: 0.05, delay: 0.09 });
  },
  correct() {
    if (this.muted) return;
    blip({ freq: 523, duration: 0.1, type: 'sine', gain: 0.06 });
    blip({ freq: 784, duration: 0.14, type: 'sine', gain: 0.06, delay: 0.08 });
  },
  solved() {
    if (this.muted) return;
    [523, 659, 784, 1047].forEach((f, i) =>
      blip({ freq: f, duration: 0.16, type: 'sine', gain: 0.06, delay: i * 0.07 }),
    );
  },
  wrong() {
    if (this.muted) return;
    blip({ freq: 200, to: 120, duration: 0.22, type: 'sawtooth', gain: 0.06 });
  },
  start() {
    if (this.muted) return;
    [392, 523, 659].forEach((f, i) => blip({ freq: f, duration: 0.12, type: 'triangle', gain: 0.05, delay: i * 0.06 }));
  },
  tick() {
    if (this.muted) return;
    blip({ freq: 880, duration: 0.04, type: 'sine', gain: 0.035 });
  },
  end() {
    if (this.muted) return;
    [523, 392, 330].forEach((f, i) => blip({ freq: f, duration: 0.2, type: 'sine', gain: 0.06, delay: i * 0.12 }));
  },
};
