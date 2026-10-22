// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { CHAPTERS, HOLONS_ACT_START, SCALES } from "./script";
import { PLAY_IDS } from "./holons";
import { CAST } from "../art/characters";
import { wrap } from "../engine/font";

const SCENERIES = [
  "valley",
  "village",
  "overworld",
  "cradle",
  "burning",
  "metropolis",
  "gameb",
  "commons",
  "worldmap",
  "warp",
  "void",
];

describe("the script", () => {
  it("has unique chapter ids and known sceneries", () => {
    const ids = CHAPTERS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of CHAPTERS) expect(SCENERIES, c.id).toContain(c.scenery);
  });

  it("only known characters speak, and every line fits the box", () => {
    for (const c of CHAPTERS)
      for (const b of c.beats) {
        if (!("say" in b)) continue;
        expect(Object.keys(CAST)).toContain(b.say);
        // 54px portrait + name, 300px of text width, 5 lines fit under the name
        const pad = " ".repeat(
          Math.ceil(((CAST[b.say].name.length + 1) * 6) / 6) + 1,
        );
        const lines = wrap(pad + b.text, 290);
        expect(
          lines.length,
          `${c.id}: "${b.text.slice(0, 40)}…" is ${lines.length} lines`,
        ).toBeLessThanOrEqual(5);
      }
  });

  it("follows the film's arc: first game → Game A → parasite → Game B", () => {
    const ids = CHAPTERS.map((c) => c.id);
    const order = [
      "awakening",
      "village",
      "overworld-first",
      "cradle",
      "overworld-gamea",
      "burning",
      "metropolis",
      "gameb",
      "commons",
      "mesh",
      "warp",
      "tribe",
      "federate",
      "gifts",
      "quests",
      "library",
      "equation",
    ];
    expect(ids).toEqual(order);
    const all = CHAPTERS.flatMap((c) => c.beats);
    expect(
      all.filter((b) => "trial" in b).map((b) => ("trial" in b ? b.trial : "")),
    ).toEqual(["first", "second"]);
    expect(all.some((b) => "choose" in b)).toBe(true);
    expect(all.some((b) => "fx" in b && b.fx === "talisman")).toBe(true);
    const collapse = all.findIndex((b) => "fx" in b && b.fx === "collapse");
    const revive = all.findIndex((b) => "fx" in b && b.fx === "revive");
    expect(collapse).toBeGreaterThan(-1);
    expect(revive).toBeGreaterThan(collapse);
  });

  it("walks and roams only where there is ground", () => {
    for (const c of CHAPTERS) {
      const walks = c.beats.some((b) => "walk" in b || "roam" in b);
      if (walks)
        expect([
          "valley",
          "village",
          "cradle",
          "burning",
          "metropolis",
          "gameb",
        ]).toContain(c.scenery);
    }
  });

  it("roams through the story, each game once, in order", () => {
    const roams = CHAPTERS.flatMap((c) =>
      c.beats.filter((b) => "roam" in b).map((b) => [c.id, b.roam]),
    );
    expect(roams).toEqual([
      ["awakening", "forage"],
      ["village", "kindle"],
      ["cradle", "hoard"],
      ["burning", "embers"],
      ["gameb", "plant"],
    ]);
  });

  it("map phases only move forward and only on the overworld", () => {
    let last = 0;
    for (const c of CHAPTERS)
      for (const b of c.beats) {
        if (!("map" in b)) continue;
        expect(c.scenery).toBe("overworld");
        expect(b.map[0]).toBeGreaterThanOrEqual(last);
        expect(b.map[1]).toBeGreaterThan(b.map[0]);
        last = b.map[1];
      }
    expect(last).toBeLessThanOrEqual(4);
  });

  it("plays each idea once, in order, after the story", () => {
    const plays = CHAPTERS.flatMap((c, i) =>
      c.beats.filter((b) => "play" in b).map((b) => ({ i, id: b.play })),
    );
    expect(plays.map((p) => p.id)).toEqual(PLAY_IDS);
    // the need is said inside the holon, once it has a name
    expect(PLAY_IDS.indexOf("ask")).toBeGreaterThan(PLAY_IDS.indexOf("found"));
    // the need is cast only once the tribe has federated, and a partner
    // asks back only once the tribe has received
    expect(PLAY_IDS.indexOf("cast")).toBeGreaterThan(
      PLAY_IDS.indexOf("federate"),
    );
    expect(PLAY_IDS.indexOf("give")).toBeGreaterThan(PLAY_IDS.indexOf("cast"));
    expect(HOLONS_ACT_START).toBe(CHAPTERS.findIndex((c) => c.id === "tribe"));
    expect(HOLONS_ACT_START).toBeGreaterThan(
      CHAPTERS.findIndex((c) => c.id === "warp"),
    );
    for (const p of plays) expect(p.i).toBeGreaterThanOrEqual(HOLONS_ACT_START);
    // the act opens by asking the role, for players who skipped the intro
    const first = CHAPTERS[HOLONS_ACT_START]!.beats[0]!;
    expect("choose" in first).toBe(true);
    const chooses = CHAPTERS.flatMap((c) => c.beats).filter(
      (b) => "choose" in b,
    );
    expect(chooses.length).toBe(2);
  });

  it("names the scales from player to galaxy", () => {
    expect(SCALES[0]).toBe("PLAYER");
    expect(SCALES[SCALES.length - 1]).toBe("GALAXY");
    const line = CHAPTERS.find((c) => c.id === "mesh")!.beats.find(
      (b) => "say" in b && b.text.includes("galaxy"),
    );
    expect(line).toBeDefined();
  });
});
