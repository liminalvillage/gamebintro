// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Roaming: the moments in the story where the pioneer leaves the line and
// plays — runs both ways, jumps, gathers, carries, dodges, plants — and the
// party follows. Each roam is a small rule set that says something about
// the game being played: the first game forages and feeds the fire, Game A
// tempts you with gold and then rains embers, Game~B plants. The rules are
// pure (stepRoam) so they can be tested; the chapter draws and sounds them.

import { drawText } from "../engine/font";
import { rng, type Rng } from "../engine/rng";
import { H, W } from "../engine/screen";
import { P } from "../art/palette";
import { disc, ellipse, flame, rect, ring, withAlpha } from "../art/paint";

export type RoamId = "forage" | "kindle" | "hoard" | "embers" | "plant";

export type ThingKind = "berry" | "stick" | "coin" | "plot" | "ember";

export type Thing = {
  kind: ThingKind;
  /** World x. */
  x: number;
  /** Height above the ground (px). */
  h: number;
  vx: number;
  vy: number;
  taken: boolean;
  /** Seconds since taken / planted (for animation). */
  age: number;
};

export type RoamEvent =
  "pickup" | "deliver" | "coin" | "hurt" | "plant" | "jump" | "step" | "goal";

export type Roam = {
  id: RoamId;
  /** The pioneer's world x when the roam began. */
  x0: number;
  x: number;
  h: number;
  vy: number;
  face: 1 | -1;
  moving: boolean;
  /** Sticks on the pioneer's back. */
  carry: number;
  /** Berries gathered, sticks burnt, coins hoarded, seeds planted. */
  got: number;
  need: number;
  hits: number;
  invuln: number;
  /** Where the fire burns (kindle). */
  fireX: number | null;
  /** The far edge to reach (hoard, embers). */
  exitX: number | null;
  things: Thing[];
  spawn: number;
  stepT: number;
  /** Seconds since the goal was met; done a beat later so it lands. */
  goalT: number;
  done: boolean;
  rand: Rng;
};

export const SPEED = 72;
export const JUMP_V = 170;
export const GRAVITY = 420;
/** The pioneer's hit box: half-width and height above the feet. */
export const BODY_HALF = 5;
export const BODY_H = 30;
const REACH = 8;
const SETTLE = 0.9;

export const ROAM_HINT: Record<RoamId, string> = {
  forage: "GATHER 5 BERRIES - ONLY WHAT YOU NEED",
  kindle: "BRING 3 STICKS TO THE FIRE",
  hoard: "REACH THE GATE. LEAVE THE GOLD.",
  embers: "DODGE THE EMBERS. GET OUT OF THE CITY.",
  plant: "PLANT 4 SEEDS IN THE EMPTY BEDS",
};

export const ROAM_CONTROLS = "← → MOVE   ↑ / SPACE JUMP   OR TAP WHERE TO GO";

/** How far left of the start the pioneer may wander, and right past it. */
const BACK = 100;
const SPAN: Record<RoamId, number> = {
  forage: 340,
  kindle: 330,
  hoard: 360,
  embers: 370,
  plant: 310,
};

function thing(kind: ThingKind, x: number, h: number): Thing {
  return { kind, x, h, vx: 0, vy: 0, taken: false, age: 0 };
}

export function createRoam(id: RoamId, x0: number, seed = 7): Roam {
  const r: Roam = {
    id,
    x0,
    x: x0,
    h: 0,
    vy: 0,
    face: 1,
    moving: false,
    carry: 0,
    got: 0,
    need: 0,
    hits: 0,
    invuln: 0,
    fireX: null,
    exitX: null,
    things: [],
    spawn: 0,
    stepT: 0,
    goalT: -1,
    done: false,
    rand: rng(seed),
  };
  const at = (kind: ThingKind, pts: [number, number][]) =>
    pts.forEach(([dx, h]) => r.things.push(thing(kind, x0 + dx, h)));
  switch (id) {
    case "forage":
      r.need = 5;
      at("berry", [
        [-70, 8],
        [-30, 44],
        [45, 4],
        [95, 46],
        [150, 10],
        [205, 42],
        [255, 6],
        [320, 48],
      ]);
      break;
    case "kindle":
      r.need = 3;
      r.fireX = x0 + 60;
      at("stick", [
        [-80, 0],
        [150, 0],
        [230, 26],
        [300, 0],
      ]);
      break;
    case "hoard":
      r.exitX = x0 + SPAN.hoard;
      at("coin", [
        [60, 3],
        [130, 42],
        [200, 3],
        [250, 42],
        [300, 3],
      ]);
      break;
    case "embers":
      r.exitX = x0 + SPAN.embers;
      break;
    case "plant":
      r.need = 4;
      at("plot", [
        [40, 0],
        [120, 0],
        [200, 0],
        [280, 0],
      ]);
      break;
  }
  return r;
}

/** Leftmost and rightmost world x the pioneer may stand on. */
export function roamBounds(r: Roam): [number, number] {
  return [r.x0 - BACK, r.x0 + SPAN[r.id] + 20];
}

/** Where the camera wants the pioneer: centred-left, never past the ends. */
export function roamCamera(r: Roam, screenX: number): number {
  const [lo, hi] = roamBounds(r);
  const want = r.x - screenX;
  return Math.max(lo - 40, Math.min(hi - screenX - 60, want));
}

export type RoamControl = { dir: -1 | 0 | 1; jump: boolean };

function touches(r: Roam, x: number, h: number, pad = 3): boolean {
  return (
    Math.abs(x - r.x) <= BODY_HALF + pad &&
    h + pad >= r.h &&
    h - pad <= r.h + BODY_H
  );
}

/** Advance the roam by dt; returns what happened, for sound and shake. */
export function stepRoam(r: Roam, dt: number, c: RoamControl): RoamEvent[] {
  const ev: RoamEvent[] = [];
  if (r.done) return ev;
  const [lo, hi] = roamBounds(r);

  // moving and jumping
  r.moving = c.dir !== 0;
  if (c.dir !== 0) {
    r.face = c.dir;
    r.x = Math.max(lo, Math.min(hi, r.x + c.dir * SPEED * dt));
    if (r.h === 0) {
      r.stepT += dt;
      if (r.stepT > 0.2) {
        r.stepT = 0;
        ev.push("step");
      }
    }
  }
  if (c.jump && r.h === 0) {
    r.vy = JUMP_V;
    ev.push("jump");
  }
  if (r.h > 0 || r.vy > 0) {
    r.h += r.vy * dt;
    r.vy -= GRAVITY * dt;
    if (r.h <= 0) {
      r.h = 0;
      r.vy = 0;
    }
  }
  r.invuln = Math.max(0, r.invuln - dt);

  for (const th of r.things) if (th.taken) th.age += dt;

  switch (r.id) {
    case "forage":
      for (const th of r.things) {
        if (th.taken || r.got >= r.need) continue;
        if (touches(r, th.x, th.h)) {
          th.taken = true;
          r.got++;
          ev.push("pickup");
        }
      }
      if (r.got >= r.need && r.goalT < 0) goal(r, ev);
      break;
    case "kindle":
      for (const th of r.things) {
        if (th.taken) continue;
        if (touches(r, th.x, th.h)) {
          th.taken = true;
          r.carry++;
          ev.push("pickup");
        }
      }
      if (
        r.carry > 0 &&
        r.fireX !== null &&
        Math.abs(r.x - r.fireX) < REACH + 4
      ) {
        r.got += r.carry;
        r.carry = 0;
        ev.push("deliver");
        if (r.got >= r.need && r.goalT < 0) goal(r, ev);
      }
      break;
    case "hoard":
      for (const th of r.things) {
        if (th.taken) continue;
        // gold leans toward whoever comes near
        const d = r.x - th.x;
        if (Math.abs(d) < 46) th.x += Math.sign(d) * 16 * dt;
        if (touches(r, th.x, th.h, 2)) {
          th.taken = true;
          r.got++;
          ev.push("coin");
        }
      }
      if (r.exitX !== null && r.x >= r.exitX - 4 && r.goalT < 0) goal(r, ev);
      break;
    case "embers": {
      if (r.goalT < 0) {
        r.spawn -= dt;
        if (r.spawn <= 0) {
          r.spawn = 0.42 + r.rand() * 0.25;
          // some fall where you are headed, so standing still or running
          // blind both get you burnt
          const lead = r.moving ? r.face * SPEED * 1.4 : 0;
          const x =
            r.rand() < 0.45
              ? r.x + lead + (r.rand() - 0.5) * 16
              : r.x - 30 + r.rand() * 150;
          const e = thing("ember", x, 150);
          e.vx = (r.rand() - 0.5) * 12;
          e.vy = -(70 + r.rand() * 45);
          r.things.push(e);
        }
      }
      for (const th of r.things) {
        if (th.taken) continue;
        th.x += th.vx * dt;
        th.h += th.vy * dt;
        if (th.h <= 0) {
          th.h = 0;
          th.taken = true;
          continue;
        }
        if (r.invuln <= 0 && touches(r, th.x, th.h, 2)) {
          th.taken = true;
          r.hits++;
          r.invuln = 1;
          ev.push("hurt");
        }
      }
      r.things = r.things.filter((th) => !th.taken || th.age < 0.5);
      if (r.exitX !== null && r.x >= r.exitX - 4 && r.goalT < 0) goal(r, ev);
      break;
    }
    case "plant":
      for (const th of r.things) {
        if (th.taken) continue;
        if (Math.abs(th.x - r.x) <= REACH && r.h < 6) {
          th.taken = true;
          r.got++;
          ev.push("plant");
        }
      }
      if (r.got >= r.need && r.goalT < 0) goal(r, ev);
      break;
  }

  if (r.goalT >= 0) {
    r.goalT += dt;
    if (r.goalT >= SETTLE) r.done = true;
  }
  return ev;
}

function goal(r: Roam, ev: RoamEvent[]): void {
  r.goalT = 0;
  ev.push("goal");
}

/** The counter shown while roaming ("3/5"), or null for reach-the-edge roams. */
export function roamCount(r: Roam): string | null {
  if (r.id === "hoard") return r.got > 0 ? `GOLD TAKEN: ${r.got}` : null;
  if (r.id === "embers") return r.hits > 0 ? `BURNS: ${r.hits}` : null;
  const carrying = r.id === "kindle" && r.carry > 0 ? ` (+${r.carry})` : "";
  return `${r.got}/${r.need}${carrying}`;
}

// ─── drawing ─────────────────────────────────────────────────────────────

/** Things in the world, behind the party. `sx` maps world x to the screen. */
export function drawRoamWorld(
  g: CanvasRenderingContext2D,
  r: Roam,
  t: number,
  scroll: number,
  groundY: number,
): void {
  const sx = (x: number) => Math.round(x - scroll);
  const gy = groundY;
  if (r.exitX !== null) {
    const x = sx(r.exitX);
    const a = 0.25 + 0.15 * Math.sin(t * 3);
    rect(g, x - 6, 0, 12, gy, withAlpha(P.goldPale, a * 0.5));
    rect(g, x - 2, 0, 4, gy, withAlpha(P.goldPale, a));
    if (r.id === "hoard") {
      // the gate out of the walls
      rect(g, x - 10, gy - 40, 3, 40, P.clayDeep);
      rect(g, x + 7, gy - 40, 3, 40, P.clayDeep);
      rect(g, x - 12, gy - 44, 24, 4, P.clay);
    }
  }
  if (r.fireX !== null) {
    const x = sx(r.fireX);
    for (let i = -2; i <= 2; i++) disc(g, x + i * 4, gy - 1, 2, P.stone);
    rect(g, x - 6, gy - 3, 12, 2, P.clayDeep);
    const n = r.got;
    flame(g, x, gy - 2, 4 + n * 2, 5 + n * 5, t, 3);
    if (n > 0)
      disc(g, x, gy - 6 - n * 2, 8 + n * 4, withAlpha(P.gold, 0.08 + n * 0.03));
  }
  for (const th of r.things) {
    const x = sx(th.x);
    if (x < -20 || x > W + 20) continue;
    const y = gy - th.h;
    switch (th.kind) {
      case "berry": {
        // a shrub tall enough to carry the berry
        if (th.h > 10) rect(g, x, y, 1, gy - y, P.trunk);
        disc(g, x, gy - 3, 5, "#3f6b3a");
        disc(g, x, y + 1, 4, "#4f8a45");
        if (!th.taken) {
          disc(g, x, y, 2, P.red);
          rect(g, x - 1, y - 1, 1, 1, P.paper);
        } else if (th.age < 0.5) {
          const k = th.age / 0.5;
          disc(g, x, y - k * 14, 2, withAlpha(P.red, 1 - k));
        }
        break;
      }
      case "stick":
        if (!th.taken) {
          if (th.h > 4) {
            rect(g, x, y, 1, gy - y, P.trunk);
            disc(g, x, y - 4, 6, "#4f7a45");
          }
          rect(g, x - 5, y - 1, 10, 2, P.clayDeep);
          rect(g, x + 2, y - 3, 1, 2, P.clayDeep);
          if (Math.floor(t * 3) % 2 === 0) rect(g, x, y - 6, 1, 1, P.goldPale);
        }
        break;
      case "coin":
        if (!th.taken) {
          const by = y - 3 + Math.round(Math.sin(t * 4 + th.x) * 2);
          disc(g, x, by, 6, withAlpha(P.gold, 0.18));
          const w = Math.max(
            1,
            Math.round(3 * Math.abs(Math.cos(t * 3 + th.x))),
          );
          ellipse(g, x, by, w, 3, P.gold);
          rect(g, x, by - 1, 1, 2, P.goldDeep);
          if (Math.floor(t * 4 + th.x) % 4 === 0)
            rect(g, x + 3, by - 4, 1, 1, P.white);
        } else if (th.age < 0.6) {
          const k = th.age / 0.6;
          drawText(g, "+1", x, y - 10 - k * 12, withAlpha(P.gold, 1 - k), {
            align: "center",
          });
        }
        break;
      case "plot": {
        ellipse(g, x, gy, 9, 2, "#5a3a24");
        if (!th.taken) {
          const a = 0.4 + 0.3 * Math.sin(t * 4 + th.x);
          rect(g, x, gy - 3, 1, 1, withAlpha(P.mint, a + 0.3));
          ring(g, x, gy - 1, 6, withAlpha(P.mint, a * 0.6));
        } else {
          const f = Math.min(1, th.age / 1.6);
          const size = Math.round(2 + f * 9);
          rect(g, x, gy - size * 2, 1, size * 2, P.trunk);
          disc(
            g,
            x,
            gy - size * 2,
            Math.max(1, Math.round(size * 0.8)),
            "#4f9a52",
          );
          disc(
            g,
            x - 2,
            gy - size * 2 - 2,
            Math.max(1, Math.round(size * 0.4)),
            "#6fc46a",
          );
          if (th.age < 1)
            ring(
              g,
              x,
              gy - 6,
              Math.round(4 + th.age * 16),
              withAlpha(P.mint, 1 - th.age),
            );
        }
        break;
      }
      case "ember": {
        if (th.taken) {
          const k = th.age / 0.5;
          for (let i = 0; i < 4; i++)
            rect(
              g,
              x + Math.round(Math.cos(i * 1.7) * k * 8),
              gy - 1 - Math.round(Math.abs(Math.sin(i * 1.7)) * k * 6),
              1,
              1,
              withAlpha("#ffd36a", 1 - k),
            );
          break;
        }
        // its shadow tells you where it will land
        const near = 1 - Math.min(1, th.h / 150);
        ellipse(
          g,
          x,
          gy,
          Math.round(2 + near * 5),
          1,
          withAlpha(P.red, 0.25 + near * 0.5),
        );
        rect(g, x, y - 6, 1, 6, withAlpha("#ff7a2a", 0.5));
        disc(g, x, y, 2, "#ff7a2a");
        rect(g, x, y, 1, 1, "#ffd36a");
        break;
      }
    }
  }
}

/** What the pioneer carries (sticks on the back), drawn over the sprite. */
export function drawCarry(
  g: CanvasRenderingContext2D,
  r: Roam,
  x: number,
  feetY: number,
): void {
  for (let i = 0; i < r.carry; i++)
    rect(g, x - 2, feetY - 20 - i * 3, 14, 2, P.clayDeep);
}

/** The task and the tally, top-centre, and the controls at the bottom. */
export function drawRoamHud(
  g: CanvasRenderingContext2D,
  r: Roam,
  t: number,
): void {
  rect(g, W / 2 - 120, 34, 240, r.goalT >= 0 ? 12 : 22, withAlpha(P.ink, 0.55));
  if (r.goalT >= 0) {
    drawText(g, "WELL DONE", W / 2, 36, P.mint, { align: "center" });
    return;
  }
  drawText(g, ROAM_HINT[r.id], W / 2, 36, P.paper, { align: "center" });
  const n = roamCount(r);
  if (n) drawText(g, n, W / 2, 46, P.gold, { align: "center" });
  const a = 0.5 + 0.3 * Math.sin(t * 3);
  drawText(g, ROAM_CONTROLS, W / 2, H - 10, withAlpha(P.paper, a), {
    align: "center",
    shadow: P.ink,
  });
}
