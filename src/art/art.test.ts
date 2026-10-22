// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { RAW_ROWS } from "./characters";
import { strideRows, scaleRows } from "../engine/sprite";
import { noise1d, noise2d, rng } from "../engine/rng";

describe("pixel art", () => {
  it("every sprite is rectangular", () => {
    const sheets: Record<string, readonly string[]> = {
      pioneer: RAW_ROWS.pioneer,
      chief: RAW_ROWS.chief,
      sage: RAW_ROWS.sage,
      matriarch: RAW_ROWS.matriarch,
      ...Object.fromEntries(
        Object.entries(RAW_ROWS.portraits).map(([k, v]) => [
          `portrait:${k}`,
          v,
        ]),
      ),
    };
    for (const [name, rows] of Object.entries(sheets)) {
      const w = rows[0]!.length;
      rows.forEach((r, i) => expect(r.length, `${name} row ${i}`).toBe(w));
    }
  });

  it("portraits are 22×22 so they scale 2× into the 46px frame", () => {
    for (const [k, rows] of Object.entries(RAW_ROWS.portraits)) {
      expect(rows.length, k).toBe(22);
      expect(rows[0]!.length, k).toBe(22);
    }
  });

  it("the stride keeps width and leaves the torso alone", () => {
    const rows = ["..##..", "..##..", "..##..", ".#..#.", ".#..#.", ".#..#."];
    const s = strideRows(rows, 3, 3, 2);
    expect(s.length).toBe(rows.length);
    for (const r of s) expect(r.length).toBe(6);
    expect(s.slice(0, 3)).toEqual(rows.slice(0, 3));
    expect(s[5]).not.toEqual(rows[5]);
  });

  it("scaleRows expands nearest-neighbour", () => {
    expect(scaleRows(["#."], 2)).toEqual(["##..", "##.."]);
  });
});

describe("seeded noise", () => {
  it("is deterministic and bounded", () => {
    const a = rng(7);
    const b = rng(7);
    for (let i = 0; i < 20; i++) expect(a()).toBe(b());
    const n = noise1d(3, 100);
    const m = noise2d(3, 16);
    for (let i = 0; i < 200; i++) {
      const v = n(i * 1.7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      const u = m(i * 0.3, i * 0.11);
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThanOrEqual(1);
    }
    expect(n(0)).toBeCloseTo(n(100), 6); // periodic
  });
});
