// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { PLAY_IDS } from "../story/holons";
import { AROUND, DRIVE_IDS, DRIVES, PLAY_DRIVES } from "../story/octalysis";
import { driveAngle, driveAt } from "../art/ui";
import { driveLevels, played } from "./drives";
import {
  adoptEquation,
  appreciate,
  askNeed,
  borrow,
  completeQuest,
  emptyTribe,
  evenEquation,
  federate,
  foundTribe,
  giveTo,
  inviteHelper,
  meetNeed,
  postQuest,
  returnItem,
  seatRole,
} from "./tribe";

describe("octalysis data", () => {
  it("every drive is woken by some play, and sits once on the octagon", () => {
    for (const d of DRIVE_IDS)
      expect(
        PLAY_IDS.some((p) => PLAY_DRIVES[p].includes(d)),
        `drive ${d}`,
      ).toBe(true);
    expect([...AROUND].sort()).toEqual(DRIVE_IDS);
  });

  it("white hat crowns the octagon, black hat is its floor", () => {
    expect(AROUND.slice(0, 2).concat(AROUND.slice(-1))).toEqual([1, 3, 2]);
    expect(AROUND.slice(3, 6)).toEqual([7, 8, 6]);
    for (const d of [1, 2, 3] as const) expect(DRIVES[d].hat).toBe("white");
    for (const d of [6, 7, 8] as const) expect(DRIVES[d].hat).toBe("black");
  });
});

describe("the amulet's faces", () => {
  it("a tap on a wedge reads that drive, off the amulet nothing", () => {
    for (const d of DRIVE_IDS) {
      const a = driveAngle(d);
      const p = { x: 100 + Math.cos(a) * 20, y: 100 + Math.sin(a) * 20 };
      expect(driveAt(100, 100, 40, p), `drive ${d}`).toBe(d);
    }
    expect(driveAt(100, 100, 40, { x: 100, y: 160 })).toBeNull();
  });
});

describe("drives the tribe woke", () => {
  it("an empty tribe has woken nothing", () => {
    const lv = driveLevels(emptyTribe());
    for (const d of DRIVE_IDS) expect(lv[d]).toBe(0);
  });

  it("a need asked wakes meaning and scarcity", () => {
    const t = emptyTribe();
    askNeed(t, "SEEDS");
    expect(played(t, "ask")).toBe(true);
    const lv = driveLevels(t);
    expect(lv[6]).toBe(1);
    expect(lv[1]).toBeCloseTo(1 / 3);
    expect(lv[2]).toBe(0);
  });

  it("a quest counts only once its helper is thanked", () => {
    const t = emptyTribe();
    const q = postQuest(t, "MEND THE BRIDGE", "body");
    inviteHelper(q, "chief");
    completeQuest(q, 4);
    expect(played(t, "quest")).toBe(false);
    appreciate(q);
    expect(played(t, "quest")).toBe(true);
  });

  it("a borrowed tool counts once it is back on the shelf", () => {
    const t = emptyTribe();
    borrow(t, "SAW");
    expect(played(t, "library")).toBe(false);
    returnItem(t);
    expect(played(t, "library")).toBe(true);
  });

  it("the whole act fills the octagon", () => {
    const t = emptyTribe();
    const need = askNeed(t, "SEEDS")!;
    foundTribe(t, "RIVER TRIBE");
    for (const w of ["mind", "heart", "body"] as const) seatRole(t, w);
    federate(t, "HILL FOLK", "food");
    meetNeed(need, { from: "HILL FOLK", via: "federation" });
    giveTo(t, "THE FERRY", "food");
    const q = postQuest(t, "MAP THE SPRINGS", "mind");
    inviteHelper(q, "sage");
    completeQuest(q, 3);
    appreciate(q);
    borrow(t, "SAW");
    returnItem(t);
    adoptEquation(t, evenEquation());
    for (const p of PLAY_IDS) expect(played(t, p), p).toBe(true);
    const lv = driveLevels(t);
    for (const d of DRIVE_IDS) expect(lv[d]).toBe(1);
  });
});
