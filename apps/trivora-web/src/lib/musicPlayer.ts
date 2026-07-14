"use client";

type NotePattern = {
  bpm: number;
  waveform: OscillatorType;
  gain: number;
  root: number;
  steps: (number | null)[];
};

const PATTERNS: Record<string, NotePattern> = {
  energique: {
    bpm: 150,
    waveform: "square",
    gain: 0.05,
    root: 261.63,
    steps: [0, 4, 7, 12, 7, 4, 0, null, 0, 4, 7, 12, 11, 7, 4, null],
  },
  suspense: {
    bpm: 90,
    waveform: "sine",
    gain: 0.06,
    root: 220,
    steps: [0, null, 0, null, -1, null, -1, null, -2, null, -2, null, -3, null, null, null],
  },
  decontracte: {
    bpm: 100,
    waveform: "triangle",
    gain: 0.05,
    root: 293.66,
    steps: [0, null, 4, null, 7, null, 4, null, 2, null, 4, null, 0, null, null, null],
  },
  epique: {
    bpm: 120,
    waveform: "sawtooth",
    gain: 0.045,
    root: 196,
    steps: [0, 3, 7, 10, 12, 10, 7, 3, 0, 3, 7, 12, 15, 12, 7, 3],
  },
};

function semitoneToFreq(root: number, semitones: number): number {
  return root * Math.pow(2, semitones / 12);
}

class MusicPlayer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private stepIndex = 0;
  private currentTheme: string | null = null;

  private ensureContext() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.7;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  play(themeKey: string) {
    if (themeKey === "none" || !PATTERNS[themeKey]) {
      this.stop();
      return;
    }
    if (this.currentTheme === themeKey && this.timer) return;
    this.stop();
    const ctx = this.ensureContext();
    const pattern = PATTERNS[themeKey];
    this.currentTheme = themeKey;
    const stepMs = (60_000 / pattern.bpm) / 2;
    this.stepIndex = 0;

    const playStep = () => {
      const semitone = pattern.steps[this.stepIndex % pattern.steps.length];
      if (semitone !== null && this.masterGain) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = pattern.waveform;
        osc.frequency.value = semitoneToFreq(pattern.root, semitone);
        gain.gain.setValueAtTime(pattern.gain, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + stepMs / 1000);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(ctx.currentTime + stepMs / 1000);
      }
      this.stepIndex += 1;
    };

    playStep();
    this.timer = setInterval(playStep, stepMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.currentTheme = null;
  }

  setMuted(muted: boolean) {
    if (this.masterGain) this.masterGain.gain.value = muted ? 0 : 0.7;
  }

  /** Plays a short suspense drumroll — used before the podium reveal. */
  playSuspenseRoll(durationMs: number) {
    const ctx = this.ensureContext();
    if (!this.masterGain) return;
    const start = ctx.currentTime;
    const stepMs = 90;
    const steps = Math.floor(durationMs / stepMs);
    for (let i = 0; i < steps; i += 1) {
      const t = start + (i * stepMs) / 1000;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 140 + i * 2;
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + stepMs / 1000);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + stepMs / 1000);
    }
  }

  /** Plays a short triumphant fanfare — used on podium winner reveal. */
  playFanfare() {
    const ctx = this.ensureContext();
    const masterGain = this.masterGain;
    if (!masterGain) return;
    const notes = [0, 4, 7, 12];
    const start = ctx.currentTime;
    notes.forEach((semitone, i) => {
      const t = start + i * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.value = semitoneToFreq(261.63, semitone);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.6);
    });
  }
}

export const musicPlayer = new MusicPlayer();
