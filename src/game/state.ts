// SPDX-License-Identifier: AGPL-3.0-or-later
//
// What the player carries between scenes: the role they felt drawn to, how
// open the three wisdom centres are, whether they hold the talisman, and
// how far along the journey they are (saved, so a phone that sleeps can
// pick the story back up).

import type { Wisdom } from "../story/holons";
import { emptyTribe, reviveTribe, type Tribe } from "./tribe";

export type GameState = {
  role: Wisdom | null;
  wisdom: { mind: number; heart: number; body: number };
  talisman: boolean;
  chapter: number;
  /** Set once the terminal prologue was played. */
  initiated: boolean;
  /** The sandbox tribe the second act builds. */
  tribe: Tribe;
};

const KEY = "initiation.progress";

export function freshState(): GameState {
  return {
    role: null,
    wisdom: { mind: 0.6, heart: 0.6, body: 0.6 },
    talisman: false,
    chapter: 0,
    initiated: false,
    tribe: emptyTribe(),
  };
}

export function loadState(): GameState {
  const s = freshState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return s;
    const j = JSON.parse(raw) as Partial<GameState>;
    if (j.role === "mind" || j.role === "heart" || j.role === "body")
      s.role = j.role;
    if (typeof j.chapter === "number" && Number.isFinite(j.chapter))
      s.chapter = Math.max(0, Math.floor(j.chapter));
    if (typeof j.talisman === "boolean") s.talisman = j.talisman;
    if (typeof j.initiated === "boolean") s.initiated = j.initiated;
    s.tribe = reviveTribe(j.tribe);
  } catch {
    /* no storage, or garbage: start fresh */
  }
  return s;
}

export function saveState(s: GameState): void {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        role: s.role,
        chapter: s.chapter,
        talisman: s.talisman,
        initiated: s.initiated,
        tribe: s.tribe,
      }),
    );
  } catch {
    /* ignore */
  }
}

export function resetState(s: GameState): void {
  Object.assign(s, freshState());
  s.tribe = emptyTribe();
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Openness drifts back toward a resting level; the chosen role rests higher. */
export function settleWisdom(s: GameState, dt: number): void {
  for (const k of ["mind", "heart", "body"] as const) {
    const rest = s.role === k ? 0.85 : 0.6;
    s.wisdom[k] += (rest - s.wisdom[k]) * Math.min(1, dt * 0.4);
  }
}
