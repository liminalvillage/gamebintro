// SPDX-License-Identifier: AGPL-3.0-or-later
//
// A small synthesizer. Music: each place has a mood (music.ts) that a
// lookahead sequencer plays as a generative loop — pad, bass, plucked
// arpeggios, a breathy lead, bells, drums — over an ambience bed (wind,
// birds, fire, river, city, space), all through one shared reverb and echo.
// Moods crossfade when the scene changes. Sounds: character voices, UI
// ticks, footsteps, pickups, the parasite's growl. Nothing is sampled; it
// all runs on the Web Audio API so the app stays a single small bundle.
// Starts only after a user gesture (browser autoplay rules) and can be
// muted with M.

import {
  MOODS,
  beatSeconds,
  chordDegrees,
  degreeHz,
  drumBar,
  type Ambience,
  type Mood,
  type MoodId,
} from "./music";

const LOOKAHEAD = 0.18;
const TICK_MS = 30;
const MASTER = 0.55;

type Track = {
  id: MoodId;
  mood: Mood;
  out: GainNode;
  timer: number;
  next: number;
  step: number;
  bar: number;
  seed: number;
  /** Lead phrase: degrees by sixteenth step for the current bar. */
  phrase: (number | null)[];
  sources: AudioScheduledSourceNode[];
};

export class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private musicLp: BiquadFilterNode | null = null;
  private sfxBus: GainNode | null = null;
  private reverb: GainNode | null = null;
  private echo: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private track: Track | null = null;
  private wanted: MoodId | null = null;
  private lastBlip = 0;
  private lastTalk = 0;
  private lastStep = 0;
  muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem("initiation.muted") === "1";
    } catch {
      /* storage may be unavailable; sound stays on */
    }
  }

  /** Call from the first user gesture. Safe to call repeatedly. */
  start(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.25;
    comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : MASTER;
    this.master.connect(comp);

    // a shared hall: stereo decaying noise as the impulse
    const conv = ctx.createConvolver();
    conv.buffer = this.impulse(2.6, 2.4);
    this.reverb = ctx.createGain();
    this.reverb.gain.value = 0.5;
    this.reverb.connect(conv).connect(this.master);

    // a soft echo, darkened on every repeat
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.36;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const dark = ctx.createBiquadFilter();
    dark.type = "lowpass";
    dark.frequency.value = 2200;
    this.echo = ctx.createGain();
    this.echo.gain.value = 0.35;
    this.echo.connect(delay);
    delay.connect(dark).connect(fb).connect(delay);
    dark.connect(this.master);
    dark.connect(this.reverb);

    this.musicLp = ctx.createBiquadFilter();
    this.musicLp.type = "lowpass";
    this.musicLp.frequency.value = 18000;
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.8;
    this.musicBus.connect(this.musicLp).connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 1;
    this.sfxBus.connect(this.master);

    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    document.addEventListener("visibilitychange", () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    });

    // a scene may have asked for music before the first gesture
    if (this.wanted) {
      const w = this.wanted;
      this.wanted = null;
      this.music(w);
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master && this.ctx)
      this.master.gain.setTargetAtTime(
        this.muted ? 0 : MASTER,
        this.ctx.currentTime,
        0.05,
      );
    try {
      localStorage.setItem("initiation.muted", this.muted ? "1" : "0");
    } catch {
      /* ignore */
    }
    return this.muted;
  }

  // ─── music ─────────────────────────────────────────────────────────────

  /** Crossfade to a mood; the same mood keeps playing without a seam. */
  music(id: MoodId, fade = 1.6): void {
    if (!this.ctx || !this.musicBus) {
      this.wanted = id;
      return;
    }
    if (this.track?.id === id) return;
    this.stopMusic(fade);
    const ctx = this.ctx;
    const mood: Mood = MOODS[id];
    const out = ctx.createGain();
    out.gain.value = 0.0001;
    out.gain.setTargetAtTime(1, ctx.currentTime, fade / 3);
    out.connect(this.musicBus);
    const tr: Track = {
      id,
      mood,
      out,
      timer: 0,
      next: ctx.currentTime + 0.1,
      step: 0,
      bar: 0,
      seed: (Math.random() * 2 ** 31) | 0,
      phrase: [],
      sources: [],
    };
    this.ambience(tr);
    tr.timer = window.setInterval(() => this.schedule(tr), TICK_MS);
    this.schedule(tr);
    this.track = tr;
  }

  stopMusic(release = 0.8): void {
    const tr = this.track;
    this.wanted = null;
    if (!tr || !this.ctx) return;
    this.track = null;
    window.clearInterval(tr.timer);
    const now = this.ctx.currentTime;
    tr.out.gain.cancelScheduledValues(now);
    tr.out.gain.setTargetAtTime(0, now, Math.max(0.02, release / 3));
    const end = now + release + 0.3;
    for (const s of tr.sources) {
      try {
        s.stop(end);
      } catch {
        /* already stopped */
      }
    }
    window.setTimeout(() => tr.out.disconnect(), (release + 3) * 1000);
  }

  /** Dull the music as the parasite closes in (0 = clear, 1 = smothered). */
  muffle(k: number): void {
    if (!this.ctx || !this.musicLp || !this.musicBus) return;
    const c = Math.max(0, Math.min(1, k));
    const now = this.ctx.currentTime;
    this.musicLp.frequency.setTargetAtTime(18000 * Math.pow(0.03, c), now, 0.2);
    this.musicBus.gain.setTargetAtTime(0.8 - 0.35 * c, now, 0.2);
  }

  private rand(tr: Track): number {
    tr.seed = (tr.seed * 1103515245 + 12345) & 0x7fffffff;
    return tr.seed / 0x7fffffff;
  }

  private schedule(tr: Track): void {
    const ctx = this.ctx;
    if (!ctx || this.track !== tr) return;
    const sixteenth = beatSeconds(tr.mood) / 4;
    while (tr.next < ctx.currentTime + LOOKAHEAD) {
      this.playStep(tr, tr.next, sixteenth);
      tr.next += sixteenth;
      tr.step++;
      if (tr.step === 16) {
        tr.step = 0;
        tr.bar++;
      }
    }
  }

  private playStep(tr: Track, t: number, sx: number): void {
    const m = tr.mood;
    const s = tr.step;
    const chordRoot = m.chords[tr.bar % m.chords.length]!;
    const chord = chordDegrees(chordRoot, m.scale.length > 5);
    const bar = sx * 16;

    if (s === 0) {
      if (m.pad > 0)
        this.pad(
          tr,
          chord.map((d) => degreeHz(m, d, 1)),
          t,
          bar,
          m.pad,
        );
      if (m.bass > 0)
        this.bass(tr, degreeHz(m, chordRoot, 0), t, sx * 6, m.bass);
      this.newPhrase(tr, chord);
    }
    if (s === 8 && m.bass > 0 && this.rand(tr) < 0.7)
      this.bass(
        tr,
        degreeHz(m, chordRoot + (this.rand(tr) < 0.5 ? 4 : 0), 0),
        t,
        sx * 6,
        m.bass * 0.8,
      );

    // arpeggio on the eighths, sometimes on an off-sixteenth
    if (m.pluck > 0) {
      const on = s % 2 === 0 ? m.density : m.density * 0.25;
      if (this.rand(tr) < on) {
        const i = Math.floor(this.rand(tr) * chord.length);
        const up = this.rand(tr) < 0.4 ? 1 : 0;
        this.pluck(tr, degreeHz(m, chord[i]!, 2 + up), t, m.pluck);
      }
    }

    const lead = tr.phrase[s];
    if (lead !== null && lead !== undefined && m.lead > 0) {
      let len = 1;
      while (s + len < 16 && tr.phrase[s + len] === null && len < 6) len++;
      this.flute(tr, degreeHz(m, lead, 2), t, sx * len * 0.95, m.lead);
    }

    if (m.bell > 0 && (s === 0 || s === 6 || s === 10)) {
      if (this.rand(tr) < m.bell * (s === 0 ? 0.8 : 0.35)) {
        const d = chord[Math.floor(this.rand(tr) * chord.length)]!;
        this.bell(degreeHz(m, d, 3), t, 0.05 * m.bell, tr.out);
      }
    }

    const hit = drumBar(m.drums, tr.bar)[s] ?? "";
    for (const v of hit) this.drum(tr, m.drums, v, t);

    // ambience events that are not a continuous bed
    if (m.ambience.includes("birds") && this.rand(tr) < 0.035)
      this.bird(tr, t + this.rand(tr) * sx);
    if (m.ambience.includes("fire") && this.rand(tr) < 0.35)
      this.crackle(tr.out, t + this.rand(tr) * sx, 0.04);
  }

  /** A lead phrase for this bar: a few steps near the chord, with rests. */
  private newPhrase(tr: Track, chord: number[]): void {
    tr.phrase = Array<number | null>(16).fill(null);
    if (tr.mood.lead <= 0 || this.rand(tr) > 0.55) return;
    let d = chord[Math.floor(this.rand(tr) * chord.length)]!;
    const starts = [0, 4, 6, 8, 10, 12];
    for (const st of starts) {
      if (this.rand(tr) < 0.35) continue;
      tr.phrase[st] = d;
      d += [-2, -1, 1, 1, 2, 0][Math.floor(this.rand(tr) * 6)]!;
    }
  }

  private ambience(tr: Track): void {
    const ctx = this.ctx!;
    const add = (a: Ambience) => {
      switch (a) {
        case "wind": {
          const src = this.noiseSource();
          const bp = ctx.createBiquadFilter();
          bp.type = "bandpass";
          bp.frequency.value = 500;
          bp.Q.value = 0.7;
          const g = ctx.createGain();
          g.gain.value = 0.05;
          const lfo = ctx.createOscillator();
          lfo.frequency.value = 0.09;
          const lg = ctx.createGain();
          lg.gain.value = 300;
          lfo.connect(lg).connect(bp.frequency);
          const lfo2 = ctx.createOscillator();
          lfo2.frequency.value = 0.13;
          const lg2 = ctx.createGain();
          lg2.gain.value = 0.03;
          lfo2.connect(lg2).connect(g.gain);
          src.connect(bp).connect(g).connect(tr.out);
          lfo.start();
          lfo2.start();
          src.start();
          tr.sources.push(src, lfo, lfo2);
          break;
        }
        case "river": {
          const src = this.noiseSource();
          const lp = ctx.createBiquadFilter();
          lp.type = "bandpass";
          lp.frequency.value = 900;
          lp.Q.value = 0.4;
          const g = ctx.createGain();
          g.gain.value = 0.035;
          const lfo = ctx.createOscillator();
          lfo.frequency.value = 0.4;
          const lg = ctx.createGain();
          lg.gain.value = 250;
          lfo.connect(lg).connect(lp.frequency);
          src.connect(lp).connect(g).connect(tr.out);
          lfo.start();
          src.start();
          tr.sources.push(src, lfo);
          break;
        }
        case "fire": {
          const src = this.noiseSource();
          const lp = ctx.createBiquadFilter();
          lp.type = "lowpass";
          lp.frequency.value = 280;
          const g = ctx.createGain();
          g.gain.value = 0.07;
          src.connect(lp).connect(g).connect(tr.out);
          src.start();
          tr.sources.push(src);
          break;
        }
        case "city": {
          const o = ctx.createOscillator();
          o.type = "sawtooth";
          o.frequency.value = 50;
          const lp = ctx.createBiquadFilter();
          lp.type = "lowpass";
          lp.frequency.value = 140;
          const g = ctx.createGain();
          g.gain.value = 0.05;
          const src = this.noiseSource();
          const nlp = ctx.createBiquadFilter();
          nlp.type = "lowpass";
          nlp.frequency.value = 400;
          const ng = ctx.createGain();
          ng.gain.value = 0.03;
          o.connect(lp).connect(g).connect(tr.out);
          src.connect(nlp).connect(ng).connect(tr.out);
          o.start();
          src.start();
          tr.sources.push(o, src);
          break;
        }
        case "space": {
          const base = tr.mood.root * 8;
          [1, 1.5, 2.01].forEach((k, i) => {
            const o = ctx.createOscillator();
            o.type = "sine";
            o.frequency.value = base * k;
            const g = ctx.createGain();
            g.gain.value = 0.006;
            const lfo = ctx.createOscillator();
            lfo.frequency.value = 0.1 + i * 0.07;
            const lg = ctx.createGain();
            lg.gain.value = 0.006;
            lfo.connect(lg).connect(g.gain);
            o.connect(g).connect(tr.out);
            g.connect(this.reverb!);
            o.start();
            lfo.start();
            tr.sources.push(o, lfo);
          });
          break;
        }
        case "birds":
          break; // scheduled per step
      }
    };
    for (const a of tr.mood.ambience) add(a);
  }

  // ─── instruments ───────────────────────────────────────────────────────

  private pad(
    tr: Track,
    freqs: number[],
    t: number,
    dur: number,
    level: number,
  ): void {
    const ctx = this.ctx!;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(500, t);
    lp.frequency.linearRampToValueAtTime(1100, t + dur * 0.5);
    lp.frequency.linearRampToValueAtTime(600, t + dur);
    lp.Q.value = 0.5;
    const g = ctx.createGain();
    const peak = 0.035 * level;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + Math.min(1.2, dur * 0.4));
    g.gain.setValueAtTime(peak, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.9);
    lp.connect(g);
    g.connect(tr.out);
    g.connect(this.reverb!);
    for (const f of freqs)
      for (const det of [-7, 7]) {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = f;
        o.detune.value = det;
        o.connect(lp);
        o.start(t);
        o.stop(t + dur + 1);
      }
  }

  private bass(
    tr: Track,
    f: number,
    t: number,
    dur: number,
    level: number,
  ): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = f;
    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.value = f / 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12 * level, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.03 * level, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    sub.connect(g);
    g.connect(tr.out);
    o.start(t);
    sub.start(t);
    o.stop(t + dur + 0.05);
    sub.stop(t + dur + 0.05);
  }

  private pluck(tr: Track, f: number, t: number, level: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = f;
    const o2 = ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.value = f * 3;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.3, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(f * 6, t);
    lp.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07 * level, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(lp);
    o2.connect(g2).connect(lp);
    lp.connect(g);
    g.connect(tr.out);
    g.connect(this.echo!);
    g.connect(this.reverb!);
    o.start(t);
    o2.start(t);
    o.stop(t + 1);
    o2.stop(t + 0.2);
  }

  private flute(
    tr: Track,
    f: number,
    t: number,
    dur: number,
    level: number,
  ): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const vib = ctx.createOscillator();
    vib.frequency.value = 5.2;
    const vg = ctx.createGain();
    vg.gain.setValueAtTime(0, t);
    vg.gain.linearRampToValueAtTime(f * 0.006, t + Math.min(0.4, dur));
    vib.connect(vg).connect(o.frequency);
    const breath = this.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = f * 2;
    bp.Q.value = 6;
    const bg = ctx.createGain();
    bg.gain.value = 0.25;
    const g = ctx.createGain();
    const peak = 0.06 * level;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.07);
    g.gain.setValueAtTime(peak * 0.85, t + Math.max(0.08, dur - 0.08));
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.15);
    o.connect(g);
    breath.connect(bp).connect(bg).connect(g);
    g.connect(tr.out);
    g.connect(this.reverb!);
    g.connect(this.echo!);
    const end = t + dur + 0.2;
    o.start(t);
    vib.start(t);
    breath.start(t);
    o.stop(end);
    vib.stop(end);
    breath.stop(end);
  }

  private bell(f: number, t: number, level: number, dest: AudioNode): void {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.value = 1;
    g.connect(dest);
    g.connect(this.reverb!);
    g.connect(this.echo!);
    for (const [k, a, d] of [
      [1, 1, 2.2],
      [2.76, 0.4, 1.1],
      [5.4, 0.2, 0.5],
    ] as const) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f * k;
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(level * a, t + 0.004);
      og.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + d + 0.05);
    }
  }

  private drum(tr: Track, kind: Mood["drums"], v: string, t: number): void {
    const ctx = this.ctx!;
    if (v === "k") {
      const [hi, lo, dur, lvl] =
        kind === "heart"
          ? [90, 40, 0.25, 0.35]
          : kind === "hand"
            ? [170, 85, 0.22, 0.3]
            : kind === "soft"
              ? [110, 50, 0.3, 0.25]
              : [150, 42, 0.28, 0.4];
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(hi, t);
      o.frequency.exponentialRampToValueAtTime(lo, t + dur * 0.6);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(lvl, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(tr.out);
      o.start(t);
      o.stop(t + dur + 0.02);
      return;
    }
    const src = this.noiseSource();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    let dur = 0.05;
    let lvl = 0.06;
    if (v === "s") {
      if (kind === "hand") {
        f.type = "bandpass";
        f.frequency.value = 1400;
        f.Q.value = 1.5;
        dur = 0.08;
        lvl = 0.14;
        const o = ctx.createOscillator();
        o.type = "triangle";
        o.frequency.setValueAtTime(380, t);
        o.frequency.exponentialRampToValueAtTime(260, t + 0.06);
        const og = ctx.createGain();
        og.gain.setValueAtTime(0.12, t);
        og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
        o.connect(og).connect(tr.out);
        o.start(t);
        o.stop(t + 0.12);
      } else {
        f.type = "highpass";
        f.frequency.value = 1200;
        dur = 0.14;
        lvl = 0.12;
      }
      g.connect(this.reverb!);
    } else {
      f.type = "highpass";
      f.frequency.value = kind === "hand" ? 5000 : 7000;
      dur = kind === "hand" ? 0.06 : 0.03;
      lvl = kind === "machine" ? 0.04 : 0.035;
    }
    g.gain.setValueAtTime(lvl, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(tr.out);
    src.start(t, Math.random());
    src.stop(t + dur + 0.02);
  }

  private bird(tr: Track, t: number): void {
    const ctx = this.ctx!;
    const base = 2200 + this.rand(tr) * 1800;
    const notes = 2 + Math.floor(this.rand(tr) * 3);
    for (let i = 0; i < notes; i++) {
      const s = t + i * 0.09;
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(base, s);
      o.frequency.exponentialRampToValueAtTime(base * 1.35, s + 0.05);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.018, s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.07);
      o.connect(g);
      g.connect(tr.out);
      g.connect(this.reverb!);
      o.start(s);
      o.stop(s + 0.08);
    }
  }

  private crackle(dest: AudioNode, t: number, level: number): void {
    const ctx = this.ctx!;
    const src = this.noiseSource();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1500 + Math.random() * 2500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
    src.connect(hp).connect(g).connect(dest);
    src.start(t, Math.random());
    src.stop(t + 0.02);
  }

  // ─── sound effects ─────────────────────────────────────────────────────

  /** UI tick — rate-limited so a fast reveal doesn't buzz. */
  blip(hz = 880): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const t = ctx.currentTime;
    if (t - this.lastBlip < 0.045) return;
    this.lastBlip = t;
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(hz, t);
    o.frequency.exponentialRampToValueAtTime(hz * 1.12, t + 0.04);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + 0.08);
  }

  /**
   * A character speaking: one syllable per letter, the pitch wandering a
   * little around their voice so a line sounds like speech, not a beep.
   */
  talk(hz: number, letter = "a"): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const t = ctx.currentTime;
    if (t - this.lastTalk < 0.06) return;
    this.lastTalk = t;
    const code = letter.toLowerCase().charCodeAt(0) || 97;
    const vowel = "aeiouy".includes(letter.toLowerCase());
    const steps = [0, 2, 4, 7, 9, -3];
    const f = hz * Math.pow(2, steps[code % steps.length]! / 12);
    const growl = hz < 250;
    const o = ctx.createOscillator();
    o.type = growl ? "sawtooth" : "triangle";
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(
      f * (vowel ? 0.96 : 1.04),
      t + 0.07,
    );
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = growl ? 500 : f * (vowel ? 1.5 : 2.5);
    bp.Q.value = growl ? 0.8 : 1.4;
    const g = ctx.createGain();
    const lvl = growl ? 0.16 : 0.11;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(lvl, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (vowel ? 0.09 : 0.06));
    o.connect(bp).connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + 0.1);
  }

  /** Confirmation / gift chime: a little bell arpeggio in the hall. */
  chime(): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const t = ctx.currentTime;
    [784, 988, 1175, 1568].forEach((hz, i) =>
      this.bell(hz, t + i * 0.07, 0.07, this.sfxBus!),
    );
  }

  /** The parasite: a distorted, falling growl with a thump under it. */
  sting(): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const t = ctx.currentTime;
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i / 255) * 2 - 1;
      curve[i] = Math.tanh(x * 4);
    }
    shaper.curve = curve;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(1400, t);
    lp.frequency.exponentialRampToValueAtTime(180, t + 1.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    for (const [hz, det] of [
      [196, 0],
      [207, 0],
      [98, 12],
    ] as const) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(hz, t);
      o.frequency.exponentialRampToValueAtTime(hz / 4, t + 1.4);
      o.detune.value = det;
      o.connect(shaper);
      o.start(t);
      o.stop(t + 1.7);
    }
    const n = this.noiseSource();
    const nlp = ctx.createBiquadFilter();
    nlp.type = "lowpass";
    nlp.frequency.value = 700;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.3, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    n.connect(nlp).connect(ng).connect(shaper);
    n.start(t);
    n.stop(t + 1);
    shaper.connect(lp).connect(g);
    g.connect(this.sfxBus);
    g.connect(this.reverb!);
    this.thump(t, 0.4);
  }

  /** A footstep: a soft, slightly random scuff. */
  step(): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const t = ctx.currentTime;
    if (t - this.lastStep < 0.12) return;
    this.lastStep = t;
    const src = this.noiseSource();
    const lp = ctx.createBiquadFilter();
    lp.type = "bandpass";
    lp.frequency.value = 500 + Math.random() * 400;
    lp.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    src.connect(lp).connect(g).connect(this.sfxBus);
    src.start(t, Math.random());
    src.stop(t + 0.07);
  }

  /** A hop. */
  jump(): void {
    this.sweep(260, 620, 0.12, "square", 0.04);
  }

  /** Picking something up — each one in a run climbs the scale. */
  pickup(n = 0): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const t = ctx.currentTime;
    const penta = [0, 2, 4, 7, 9, 12, 14, 16];
    const base = 660 * Math.pow(2, penta[n % penta.length]! / 12);
    [base, base * 1.5].forEach((hz, i) => {
      const o = ctx.createOscillator();
      o.type = "square";
      o.frequency.value = hz;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 3000;
      const g = ctx.createGain();
      const s = t + i * 0.06;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.05, s + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.12);
      o.connect(lp).connect(g);
      g.connect(this.sfxBus!);
      g.connect(this.echo!);
      o.start(s);
      o.stop(s + 0.14);
    });
  }

  /** Gold: bright, and a semitone sour — Game A's pull. */
  coin(): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const t = ctx.currentTime;
    for (const [hz, at, det] of [
      [988, 0, 0],
      [1319, 0.07, 0],
      [1319, 0.07, 100],
    ] as const) {
      const o = ctx.createOscillator();
      o.type = "square";
      o.frequency.value = hz;
      o.detune.value = det;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + at);
      g.gain.exponentialRampToValueAtTime(0.045, t + at + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.3);
      o.connect(g).connect(this.sfxBus);
      o.start(t + at);
      o.stop(t + at + 0.32);
    }
  }

  /** Hit by something: a crunch and a drop. */
  hurt(): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const t = ctx.currentTime;
    this.sweep(330, 70, 0.25, "square", 0.06);
    const src = this.noiseSource();
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    src.connect(g).connect(this.sfxBus);
    src.start(t, Math.random());
    src.stop(t + 0.16);
  }

  /** Something taking root and growing: a rising, ringing arpeggio. */
  grow(): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const t = ctx.currentTime;
    [523, 659, 784, 1047, 1319].forEach((hz, i) =>
      this.bell(hz, t + i * 0.05, 0.035, this.sfxBus!),
    );
    this.sweep(180, 520, 0.4, "sine", 0.05);
  }

  /** The fire taking a new log: a whoomp and a shower of crackles. */
  fireUp(): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const t = ctx.currentTime;
    const src = this.noiseSource();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(200, t);
    lp.frequency.exponentialRampToValueAtTime(1800, t + 0.25);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    src.connect(lp).connect(g).connect(this.sfxBus);
    src.start(t);
    src.stop(t + 0.75);
    for (let i = 0; i < 10; i++)
      this.crackle(this.sfxBus, t + 0.05 + Math.random() * 0.6, 0.08);
  }

  /** A breath of air between places. */
  whoosh(): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const t = ctx.currentTime;
    const src = this.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.5;
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(2400, t + 0.5);
    bp.frequency.exponentialRampToValueAtTime(500, t + 1.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.08, t + 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    src.connect(bp).connect(g);
    g.connect(this.sfxBus);
    g.connect(this.reverb!);
    src.start(t);
    src.stop(t + 1.25);
  }

  private thump(t: number, level: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(35, t + 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(g).connect(this.sfxBus!);
    o.start(t);
    o.stop(t + 0.65);
  }

  private sweep(
    from: number,
    to: number,
    dur: number,
    type: OscillatorType,
    level: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noiseSource(): AudioBufferSourceNode {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    return src;
  }

  private impulse(seconds: number, decay: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++)
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }
}
