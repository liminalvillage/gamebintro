// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import {
  BODY_H,
  createRoam,
  roamBounds,
  roamCamera,
  stepRoam,
  type Roam,
  type RoamControl,
  type RoamEvent,
} from "./roam";

const DT = 1 / 60;
const still: RoamControl = { dir: 0, jump: false };

/** Hold a control for `s` seconds; collect every event. */
function hold(r: Roam, c: RoamControl, s: number): RoamEvent[] {
  const ev: RoamEvent[] = [];
  for (let t = 0; t < s; t += DT) {
    ev.push(...stepRoam(r, DT, c));
    c = { ...c, jump: false };
  }
  return ev;
}

/** Walk to world x, jumping if asked whenever on the ground. */
function goTo(r: Roam, x: number, jump = false): RoamEvent[] {
  const ev: RoamEvent[] = [];
  for (let i = 0; i < 2000 && Math.abs(r.x - x) > 1; i++)
    ev.push(...stepRoam(r, DT, { dir: x > r.x ? 1 : -1, jump }));
  return ev;
}

describe("roaming", () => {
  it("jumps and lands back on the ground", () => {
    const r = createRoam("forage", 100);
    const ev = hold(r, { dir: 0, jump: true }, 0.2);
    expect(ev).toContain("jump");
    expect(r.h).toBeGreaterThan(20);
    hold(r, still, 1.5);
    expect(r.h).toBe(0);
  });

  it("stays within its bounds and the camera follows", () => {
    const r = createRoam("plant", 100);
    hold(r, { dir: -1, jump: false }, 10);
    expect(r.x).toBe(roamBounds(r)[0]);
    const cam = roamCamera(r, 176);
    expect(cam).toBeLessThanOrEqual(r.x);
  });

  it("forage gathers only what is needed, berries high up need a jump", () => {
    const r = createRoam("forage", 100);
    // walk right along the ground: the high berries stay on the bush
    goTo(r, 100 + 340);
    const high = r.things.filter((t) => t.h > BODY_H + 3);
    expect(high.every((t) => !t.taken)).toBe(true);
    expect(r.got).toBeLessThan(r.need);
    // run back jumping: enough to finish, then the rest stay
    goTo(r, 0, true);
    hold(r, still, 2);
    expect(r.got).toBe(r.need);
    expect(r.done).toBe(true);
    expect(r.things.some((t) => !t.taken)).toBe(true);
  });

  it("kindle needs the sticks carried back to the fire", () => {
    const r = createRoam("kindle", 100);
    goTo(r, 100 + 330);
    expect(r.got).toBe(0);
    expect(r.carry).toBeGreaterThanOrEqual(2);
    // heading back left passes the fire, which takes what is carried
    const ev = goTo(r, 0);
    goTo(r, r.fireX!);
    expect(ev).toContain("deliver");
    hold(r, still, 1);
    expect(r.got).toBeGreaterThanOrEqual(r.need);
    expect(r.done).toBe(true);
  });

  it("hoard ends at the gate whether or not the gold was taken", () => {
    const r = createRoam("hoard", 100);
    const ev = goTo(r, r.exitX!);
    hold(r, still, 1);
    expect(ev.filter((e) => e === "coin").length).toBe(r.got);
    expect(r.got).toBeGreaterThan(0); // walking blind takes the ground gold
    expect(r.done).toBe(true);
  });

  it("embers fall, burn on contact, and the roam ends at the edge", () => {
    const r = createRoam("embers", 100, 3);
    hold(r, still, 6);
    expect(r.hits).toBeGreaterThan(0);
    const hits = r.hits;
    // invulnerable for a moment after each burn
    expect(r.invuln).toBeLessThanOrEqual(1);
    goTo(r, r.exitX!);
    hold(r, still, 1);
    expect(r.hits).toBeGreaterThanOrEqual(hits);
    expect(r.done).toBe(true);
  });

  it("plant fills every bed on the way", () => {
    const r = createRoam("plant", 100);
    const ev = goTo(r, 100 + 300);
    hold(r, still, 1);
    expect(ev.filter((e) => e === "plant").length).toBe(4);
    expect(r.done).toBe(true);
  });
});
