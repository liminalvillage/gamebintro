// SPDX-License-Identifier: AGPL-3.0-or-later
//
// The score, as data. Each place in the journey has a mood: a key, a mode,
// a tempo, a chord progression and which voices play. The synth in
// audio.ts turns a mood into a generative loop — the chords are fixed, the
// melody is improvised from them each bar — so a long scene never repeats
// note for note. Everything here is pure, so it can be tested.

export type Ambience = "wind" | "birds" | "fire" | "river" | "city" | "space";

export type Mood = {
  /** Root of the key (Hz), around the second octave. */
  root: number;
  /** Semitone steps of the mode from the root. */
  scale: readonly number[];
  bpm: number;
  /** Chord roots as scale degrees (0-based), one per bar. */
  chords: readonly number[];
  /** Sustained chord pad. */
  pad: number;
  /** Plucked arpeggio (kalimba-ish) and how dense it is, 0..1. */
  pluck: number;
  density: number;
  /** A breathy lead that sings a phrase now and then. */
  lead: number;
  /** Bell sparkles over the top. */
  bell: number;
  /** Bass on the chord root. */
  bass: number;
  /** Percussion pattern, if any. */
  drums: "none" | "heart" | "hand" | "march" | "machine" | "soft";
  ambience: readonly Ambience[];
};

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  phrygianDom: [0, 1, 4, 5, 7, 8, 10],
  pentaMajor: [0, 2, 4, 7, 9],
  pentaMinor: [0, 3, 5, 7, 10],
  wholeTone: [0, 2, 4, 6, 8, 10],
} as const;

const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const D2 = NOTE(38);
const E2 = NOTE(40);
const F2 = NOTE(41);
const G2 = NOTE(43);
const A2 = NOTE(45);
const C2 = NOTE(36);
const B1 = NOTE(35);

const quiet = {
  pad: 0,
  pluck: 0,
  density: 0,
  lead: 0,
  bell: 0,
  bass: 0,
  drums: "none",
  ambience: [],
} as const;

export const MOODS = {
  /** The title: the ~B mark forming out of the stars. */
  title: {
    ...quiet,
    root: D2,
    scale: SCALES.dorian,
    bpm: 64,
    chords: [0, 3, 5, 3],
    pad: 0.5,
    bell: 0.5,
    density: 0.3,
    ambience: ["space"],
  },
  /** The terminal: a cold room, a cursor, nothing else. */
  terminal: {
    ...quiet,
    root: B1,
    scale: SCALES.minor,
    bpm: 56,
    chords: [0, 0, 5, 4],
    pad: 0.25,
    bass: 0.4,
    drums: "heart",
  },
  /** Waking in the valley at dawn: the first game. */
  dawn: {
    ...quiet,
    root: A2,
    scale: SCALES.pentaMajor,
    bpm: 72,
    chords: [0, 3, 4, 2],
    pad: 0.45,
    pluck: 0.5,
    density: 0.35,
    lead: 0.5,
    bass: 0.3,
    ambience: ["wind", "birds"],
  },
  /** The camp by the river: hand drums around the fire. */
  village: {
    ...quiet,
    root: D2,
    scale: SCALES.dorian,
    bpm: 92,
    chords: [0, 0, 6, 3],
    pad: 0.35,
    pluck: 0.6,
    density: 0.55,
    lead: 0.3,
    bass: 0.45,
    drums: "hand",
    ambience: ["fire", "river"],
  },
  /** The map: tribes spreading, then crowding. */
  journey: {
    ...quiet,
    root: E2,
    scale: SCALES.dorian,
    bpm: 84,
    chords: [0, 2, 3, 4],
    pad: 0.45,
    pluck: 0.55,
    density: 0.6,
    bass: 0.4,
    ambience: ["wind"],
  },
  /** The cradle: first walls, first kings. */
  empire: {
    ...quiet,
    root: E2,
    scale: SCALES.phrygianDom,
    bpm: 80,
    chords: [0, 1, 0, 6],
    pad: 0.4,
    pluck: 0.55,
    density: 0.5,
    lead: 0.45,
    bass: 0.5,
    drums: "hand",
    ambience: ["wind"],
  },
  /** Empires marching across the map. */
  march: {
    ...quiet,
    root: C2,
    scale: SCALES.minor,
    bpm: 96,
    chords: [0, 5, 3, 4],
    pad: 0.45,
    pluck: 0.35,
    density: 0.45,
    bass: 0.6,
    drums: "march",
  },
  /** The burning city. */
  burning: {
    ...quiet,
    root: B1,
    scale: SCALES.phrygianDom,
    bpm: 60,
    chords: [0, 1, 0, 1],
    pad: 0.55,
    lead: 0.25,
    bass: 0.6,
    drums: "heart",
    ambience: ["fire", "wind"],
  },
  /** The metropolis: the machine that conditions. */
  machine: {
    ...quiet,
    root: C2,
    scale: SCALES.minor,
    bpm: 112,
    chords: [0, 0, 5, 6],
    pad: 0.3,
    pluck: 0.4,
    density: 0.8,
    bass: 0.55,
    drums: "machine",
    ambience: ["city"],
  },
  /** Game~B in bloom. */
  bloom: {
    ...quiet,
    root: F2,
    scale: SCALES.lydian,
    bpm: 84,
    chords: [0, 1, 5, 4],
    pad: 0.45,
    pluck: 0.55,
    density: 0.45,
    lead: 0.45,
    bell: 0.4,
    bass: 0.35,
    drums: "soft",
    ambience: ["birds", "wind"],
  },
  /** The commons: the circle where the tribe meets. */
  commons: {
    ...quiet,
    root: G2,
    scale: SCALES.major,
    bpm: 76,
    chords: [0, 4, 5, 3],
    pad: 0.5,
    pluck: 0.45,
    density: 0.4,
    lead: 0.4,
    bass: 0.35,
    ambience: ["birds"],
  },
  /** The mesh: links lighting up across the globe. */
  mesh: {
    ...quiet,
    root: D2,
    scale: SCALES.pentaMajor,
    bpm: 100,
    chords: [0, 3, 1, 4],
    pad: 0.4,
    pluck: 0.6,
    density: 0.75,
    bell: 0.45,
    bass: 0.35,
    drums: "soft",
    ambience: ["wind"],
  },
  /** The warp: between the story and the play. */
  warp: {
    ...quiet,
    root: E2,
    scale: SCALES.wholeTone,
    bpm: 66,
    chords: [0, 1, 2, 1],
    pad: 0.55,
    bell: 0.55,
    density: 0.35,
    ambience: ["space"],
  },
  /** Quests: the tribe at work. */
  work: {
    ...quiet,
    root: G2,
    scale: SCALES.pentaMajor,
    bpm: 108,
    chords: [0, 2, 3, 1],
    pad: 0.35,
    pluck: 0.6,
    density: 0.6,
    lead: 0.3,
    bass: 0.45,
    drums: "hand",
    ambience: ["birds"],
  },
  /** The finale: the tribe, whole. */
  finale: {
    ...quiet,
    root: C2,
    scale: SCALES.major,
    bpm: 80,
    chords: [0, 4, 5, 3],
    pad: 0.5,
    pluck: 0.5,
    density: 0.45,
    lead: 0.45,
    bell: 0.45,
    bass: 0.4,
    drums: "soft",
    ambience: ["birds"],
  },
} satisfies Record<string, Mood>;

export type MoodId = keyof typeof MOODS;

/** Frequency of scale `degree` (may run past the octave, or below 0). */
export function degreeHz(mood: Mood, degree: number, octave = 0): number {
  const n = mood.scale.length;
  const o = Math.floor(degree / n);
  const i = ((degree % n) + n) % n;
  return mood.root * Math.pow(2, octave + o + mood.scale[i]! / 12);
}

/** The chord on `rootDegree`: a stacked triad (plus a seventh) in the mode. */
export function chordDegrees(rootDegree: number, seventh = false): number[] {
  const c = [rootDegree, rootDegree + 2, rootDegree + 4];
  if (seventh) c.push(rootDegree + 6);
  return c;
}

/** Seconds per beat (a bar is four beats). */
export function beatSeconds(mood: Mood): number {
  return 60 / mood.bpm;
}

/**
 * Drum hits for one bar, in sixteenths: which voice strikes on each step.
 * k = kick / low drum, s = high drum or snare, h = hat or shaker.
 */
export function drumBar(kind: Mood["drums"], bar: number): string[] {
  const steps = Array<string>(16).fill("");
  const put = (v: string, ...at: number[]) => {
    for (const i of at) steps[i] = (steps[i] ?? "") + v;
  };
  switch (kind) {
    case "heart":
      put("k", 0, 3);
      put("k", 8, 11);
      break;
    case "hand":
      put("k", 0, 7, 10);
      put("s", 4, 12);
      put("h", 2, 6, 14);
      if (bar % 4 === 3) put("s", 13, 15);
      break;
    case "march":
      put("k", 0, 4, 8, 12);
      put("s", 4, 12);
      put("h", 2, 6, 10, 14);
      if (bar % 2 === 1) put("s", 14, 15);
      break;
    case "machine":
      put("k", 0, 4, 8, 12);
      put("s", 4, 12);
      put("h", 0, 2, 4, 6, 8, 10, 12, 14);
      break;
    case "soft":
      put("k", 0, 10);
      put("h", 4, 12);
      break;
    case "none":
      break;
  }
  return steps;
}
